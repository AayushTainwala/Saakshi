import AVFoundation
import UIKit

/// Bug mode on iPhone (spec E8; fix round 1, as for body-cam): sound only, one continuous file from
/// Start to Stop, cut-off safe and checkpointed.
///
/// - `AVAudioEngine`'s input node, started on screen when bug mode starts. With the app's `audio`
///   background mode it keeps running while the app is in the background or the phone is locked.
/// - The sound is encoded to AAC and written as ADTS (`.aac`) by `AdtsWriter` (the same writer as
///   body-cam's sound-only files): self-contained frames with nothing written at the end, so a file
///   cut off by a crash, a forced restart or a dead battery plays up to the cut. Every byte is
///   fingerprinted as it is written, and about every `checkpointSeconds` of sound a checkpoint (the
///   length so far and the SHA-256 of those bytes) is sent as "onSoundCheckpoint".
/// - A new file starts only when it must: the microphone stopped and came back (a phone call, a
///   route change, a media-services reset), or a file could not be written. Its `gapBeforeMs` gives
///   the silence between.
///
/// Each file has a random `recording` id, which its checkpoints and its record carry, and a
/// crash-recovery marker in `pendingDir` (format shared with src/modules/evidence/locker/pending.ts).
/// "onSoundClosed" is sent when a file closes. Every piece of recording state is touched only on
/// `queue`, so a file's checkpoints always come before its "onSoundClosed".
final class SoundRecorder {
  static let shared = SoundRecorder()

  struct Config {
    let outputDir: URL
    let pendingDir: URL
    let checkpointSeconds: Double
    let clip: Int
    let mode: String
  }

  enum Failure: LocalizedError {
    case alreadyRunning
    case noMicrophone

    var errorDescription: String? {
      switch self {
      case .alreadyRunning: return "Sound is already recording"
      case .noMicrophone: return "No microphone input"
      }
    }
  }

  /// Sends an event to JavaScript. Called on the recorder's queue.
  var emit: ((String, [String: Any]) -> Void)?

  // Seconds.
  /// No sound for this long: the microphone has stopped, even if iOS didn't say so.
  private static let stallSeconds = 2.0
  /// While the microphone is off, try to start it again this often.
  private static let retrySeconds = 10.0
  /// After a file can't be created or written, wait this long before starting another.
  private static let fileRetrySeconds = 5.0

  private let queue = DispatchQueue(label: "in.aayushtainwala.saakshi.sound")
  private let lock = NSLock()
  private var runningFlag = false
  private var backgroundFlag = false

  private var config: Config?
  private var engine: AVAudioEngine?
  /// Sound from an engine of an older generation (before a restart or a loss) is ignored.
  private var generation = 0
  private var observers: [NSObjectProtocol] = []
  private var timer: DispatchSourceTimer?
  private var file: SoundFile?
  private var nextIndex = 0
  private var lastEnded: Date?
  /// Sound from the current engine is arriving.
  private var audioOn = false
  /// The engine has started and its first sound is due.
  private var pendingSince: Date?
  private var lastArrival: Date?
  private var lastAttempt: Date?
  private var fileRetryAt: Date?
  private var reportedStartFailure = false
  private var stopping = false
  private var closedWhileStopping: [[String: Any]] = []
  private let iso: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  var isRunning: Bool {
    lock.lock()
    defer { lock.unlock() }
    return runningFlag
  }

  private func setRunning(_ value: Bool) {
    lock.lock()
    runningFlag = value
    lock.unlock()
  }

  private var inBackground: Bool {
    lock.lock()
    defer { lock.unlock() }
    return backgroundFlag
  }

  private func setBackground(_ value: Bool) {
    lock.lock()
    backgroundFlag = value
    lock.unlock()
  }

  // MARK: - Start and stop

  /// Starts recording. Fails if the microphone can't start now (the user is on screen and can try
  /// again); once started, a lost microphone is retried until Stop.
  func start(_ config: Config, completion: @escaping (Error?) -> Void) {
    queue.async { [self] in
      if isRunning { return completion(Failure.alreadyRunning) }
      do {
        try FileManager.default.createDirectory(at: config.outputDir, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: config.pendingDir, withIntermediateDirectories: true)
      } catch {
        return completion(error)
      }
      self.config = config
      file = nil
      nextIndex = 0
      lastEnded = nil
      audioOn = false
      pendingSince = nil
      lastArrival = nil
      lastAttempt = nil
      fileRetryAt = nil
      reportedStartFailure = false
      stopping = false
      closedWhileStopping = []
      setRunning(true)
      addObservers()
      do {
        try startEngine()
      } catch {
        teardown()
        return completion(error)
      }
      startTimer()
      completion(nil)
    }
  }

  /// Stops and closes the file. Calls back with the events of the files closed on the way.
  func stop(completion: @escaping ([[String: Any]]) -> Void) {
    queue.async { [self] in
      guard isRunning else { return completion([]) }
      stopping = true
      timer?.cancel()
      timer = nil
      // No sound after this; buffers already on the queue (same generation) are still written below.
      if let engine {
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
      }
      engine = nil
      queue.async { [self] in
        if let current = file { close(current, reason: "stopped") }
        let events = closedWhileStopping
        teardown()
        completion(events)
      }
    }
  }

  /// On the queue.
  private func teardown() {
    for observer in observers { NotificationCenter.default.removeObserver(observer) }
    observers.removeAll()
    timer?.cancel()
    timer = nil
    if let engine {
      engine.inputNode.removeTap(onBus: 0)
      engine.stop()
    }
    engine = nil
    generation += 1
    file = nil
    config = nil
    audioOn = false
    pendingSince = nil
    // Let other apps' sound resume, unless body-cam is still using the microphone.
    if !BodyCamRecorder.shared.isRunning {
      try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
    setRunning(false)
  }

  // MARK: - The microphone (on the queue)

  /// Starts a fresh `AVAudioEngine` (after a phone call, a route change or a media-services reset
  /// the old one may hold stale formats). Sound counts as back only when its first buffer arrives.
  private func startEngine() throws {
    if let previous = engine {
      previous.inputNode.removeTap(onBus: 0)
      previous.stop()
    }
    engine = nil
    generation += 1
    let current = generation
    lastAttempt = Date()
    let session = AVAudioSession.sharedInstance()
    // Mixable, so music or video in another app doesn't stop the recording.
    try session.setCategory(.playAndRecord, mode: .default, options: [.mixWithOthers])
    try session.setActive(true)
    let engine = AVAudioEngine()
    let input = engine.inputNode
    let format = input.outputFormat(forBus: 0)
    guard format.sampleRate > 0, format.channelCount > 0 else { throw Failure.noMicrophone }
    input.installTap(onBus: 0, bufferSize: 4096, format: format) { [weak self] buffer, when in
      guard let self, let chunk = SoundChunk(buffer, at: when) else { return }
      self.queue.async { self.handle(chunk, generation: current) }
    }
    engine.prepare()
    do {
      try engine.start()
    } catch where inBackground {
      // Apple: starting a mixable recording from the background usually fails. Try as a
      // non-mixable one, so sound comes back after a phone call even if the user hasn't returned.
      // It stays non-mixable until bug mode stops.
      try session.setCategory(.playAndRecord, mode: .default, options: [])
      try session.setActive(true)
      try engine.start()
    }
    self.engine = engine
    pendingSince = Date()
    reportedStartFailure = false
  }

  /// Tries to start the microphone again; says so once if it can't, and keeps trying.
  private func restartEngine() {
    guard isRunning, !stopping else { return }
    do {
      try startEngine()
    } catch {
      engine = nil
      if !reportedStartFailure {
        reportedStartFailure = true
        emitError("Sound could not start again: \(error.localizedDescription). Trying again.")
      }
    }
  }

  /// The microphone stopped (a phone call, an alarm, a route change). The file ends; the next
  /// sound starts a new one.
  private func audioLost() {
    guard audioOn || pendingSince != nil else { return }
    audioOn = false
    pendingSince = nil
    generation += 1
    if let current = file { close(current, reason: "audio-interrupted") }
  }

  private func handle(_ chunk: SoundChunk, generation: Int) {
    guard let config, generation == self.generation else { return }
    if !audioOn {
      audioOn = true
      pendingSince = nil
    }
    lastArrival = Date()
    if file == nil {
      // Stop closes the file and takes no new one.
      if stopping { return }
      if let retryAt = fileRetryAt, Date() < retryAt { return }
      file = open(config, format: chunk.pcm.format, startedAt: chunk.startedAt)
    }
    guard let current = file else { return }
    do {
      try current.adts.write(chunk.pcm)
      current.buffers += 1
      current.endedAt = chunk.endedAt
    } catch {
      emitError("Writing \(current.url.lastPathComponent) failed: \(error.localizedDescription)")
      close(current, reason: "error")
      fileRetryAt = Date().addingTimeInterval(Self.fileRetrySeconds)
    }
  }

  // MARK: - Observers

  private func addObservers() {
    let center = NotificationCenter.default
    observers.append(center.addObserver(forName: AVAudioSession.interruptionNotification, object: AVAudioSession.sharedInstance(), queue: nil) {
      [weak self] note in
      guard let self, let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
        let type = AVAudioSession.InterruptionType(rawValue: raw)
      else { return }
      self.queue.async {
        switch type {
        case .began:
          self.audioLost()
        case .ended:
          if !self.audioOn, self.pendingSince == nil { self.restartEngine() }
        @unknown default:
          break
        }
      }
    })
    observers.append(center.addObserver(forName: .AVAudioEngineConfigurationChange, object: nil, queue: nil) {
      [weak self] note in
      let changed = note.object as AnyObject?
      guard let self else { return }
      self.queue.async {
        guard let engine = self.engine, changed === engine else { return }
        self.audioLost()
        self.restartEngine()
      }
    })
    observers.append(center.addObserver(forName: AVAudioSession.mediaServicesWereResetNotification, object: nil, queue: nil) {
      [weak self] _ in
      guard let self else { return }
      self.queue.async {
        self.audioLost()
        self.restartEngine()
      }
    })
    observers.append(center.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) {
      [weak self] _ in
      self?.setBackground(true)
    })
    observers.append(center.addObserver(forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main) {
      [weak self] _ in
      self?.setBackground(false)
    })
    observers.append(center.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) {
      [weak self] _ in
      guard let self else { return }
      self.setBackground(false)
      // Starting a recording is allowed again now the app is on screen.
      self.queue.async {
        if !self.audioOn, self.pendingSince == nil { self.restartEngine() }
      }
    })
  }

  private func startTimer() {
    let timer = DispatchSource.makeTimerSource(queue: queue)
    timer.schedule(deadline: .now() + 1, repeating: 1)
    timer.setEventHandler { [weak self] in self?.tick() }
    timer.resume()
    self.timer = timer
  }

  private func tick() {
    guard config != nil, !stopping else { return }
    let now = Date()
    if audioOn, let last = lastArrival, now.timeIntervalSince(last) > Self.stallSeconds {
      // Sound was arriving and stopped: start again at once.
      audioLost()
      restartEngine()
    } else if let since = pendingSince, now.timeIntervalSince(since) > Self.stallSeconds {
      // The engine started but no sound came: try again at the usual pace.
      audioLost()
    } else if !audioOn, pendingSince == nil, lastAttempt.map({ now.timeIntervalSince($0) > Self.retrySeconds }) ?? true {
      restartEngine()
    }
  }

  // MARK: - Files (on the queue)

  private func open(_ config: Config, format: AVAudioFormat, startedAt: Date) -> SoundFile? {
    let index = nextIndex
    nextIndex += 1
    let gap = lastEnded.map { Int((startedAt.timeIntervalSince($0) * 1000).rounded()) }
    let name = "bug-\(config.clip)-\(index)-\(Int64(Date().timeIntervalSince1970 * 1000)).aac"
    let url = config.outputDir.appendingPathComponent(name)
    do {
      let adts = try AdtsWriter(url: url, input: format, checkpointSeconds: config.checkpointSeconds)
      let file = SoundFile(
        url: url, marker: config.pendingDir.appendingPathComponent("\(name).json"), adts: adts, clip: config.clip,
        index: index, startedAt: startedAt, gapBeforeMs: gap
      )
      adts.onCheckpoint = { [weak self, weak file] snapshot in
        guard let self, let file else { return }
        self.emitCheckpoint(file, snapshot)
      }
      writeMarker(file)
      return file
    } catch {
      try? FileManager.default.removeItem(at: url)
      fileRetryAt = Date().addingTimeInterval(Self.fileRetrySeconds)
      emitError("A sound file could not be started: \(error.localizedDescription)")
      return nil
    }
  }

  private func close(_ closing: SoundFile, reason: String) {
    if file === closing { file = nil }
    guard !closing.finished else { return }
    closing.finished = true
    // Encodes the last of the sound and closes the file before it is reported and hashed.
    let whole = closing.adts.finish()
    let endedAt = closing.endedAt ?? closing.startedAt
    lastEnded = endedAt
    if closing.buffers == 0 || whole.bytes == 0 {
      try? FileManager.default.removeItem(at: closing.url)
      try? FileManager.default.removeItem(at: closing.marker)
      return
    }
    writeMarker(closing, closedAt: endedAt, endReason: reason)
    let event: [String: Any] = [
      "uri": closing.url.absoluteString,
      "kind": "audio",
      "clip": closing.clip,
      "index": closing.index,
      "startedAt": iso.string(from: closing.startedAt),
      "endedAt": iso.string(from: endedAt),
      "endReason": reason,
      "gapBeforeMs": closing.gapBeforeMs.map { $0 as Any } ?? NSNull(),
      "recording": closing.recording,
      "finalSize": Double(whole.bytes),
      "finalSha256": whole.sha256,
    ]
    emit?("onSoundClosed", event)
    if stopping { closedWhileStopping.append(event) }
  }

  private func writeMarker(_ file: SoundFile, closedAt: Date? = nil, endReason: String? = nil) {
    var json: [String: Any] = [
      "file": file.url.absoluteString,
      "kind": "audio",
      "segment": ["clip": file.clip, "index": file.index],
      "startedAt": iso.string(from: file.startedAt),
      "mode": config?.mode ?? "bug",
      "gapBeforeMs": file.gapBeforeMs.map { $0 as Any } ?? NSNull(),
      "cutoffSafe": true,
      "recording": file.recording,
    ]
    if let closedAt, let endReason {
      json["closedAt"] = iso.string(from: closedAt)
      json["endReason"] = endReason
    }
    do {
      let data = try JSONSerialization.data(withJSONObject: json, options: [.withoutEscapingSlashes])
      try data.write(to: file.marker, options: .atomic)
    } catch {
      emitError("The recovery marker for \(file.url.lastPathComponent) could not be written: \(error.localizedDescription)")
    }
  }

  /// Called from inside `AdtsWriter.write`, on the queue.
  private func emitCheckpoint(_ file: SoundFile, _ snapshot: CheckpointedFile.Snapshot) {
    emit?("onSoundCheckpoint", [
      "recording": file.recording,
      "uri": file.url.absoluteString,
      "kind": "audio",
      "clip": file.clip,
      "index": file.index,
      "checkpoint": snapshot.index,
      "bytes": Double(snapshot.bytes),
      "sha256": snapshot.sha256,
      "at": iso.string(from: Date()),
      "startedAt": iso.string(from: file.startedAt),
    ])
  }

  private func emitError(_ message: String) {
    NSLog("[Saakshi sound] %@", message)
    emit?("onSoundError", ["message": message])
  }
}

/// One buffer of microphone sound, copied out of the engine's buffer (which the engine may reuse),
/// with its times by the phone's clock.
private struct SoundChunk {
  let pcm: AVAudioPCMBuffer
  let startedAt: Date
  let endedAt: Date

  init?(_ buffer: AVAudioPCMBuffer, at when: AVAudioTime) {
    let frames = buffer.frameLength
    let rate = buffer.format.sampleRate
    guard frames > 0, rate > 0, let copy = AVAudioPCMBuffer(pcmFormat: buffer.format, frameCapacity: frames) else { return nil }
    copy.frameLength = frames
    let source = UnsafeMutableAudioBufferListPointer(UnsafeMutablePointer(mutating: buffer.audioBufferList))
    let target = UnsafeMutableAudioBufferListPointer(copy.mutableAudioBufferList)
    for (from, to) in zip(source, target) {
      guard let fromData = from.mData, let toData = to.mData else { continue }
      memcpy(toData, fromData, Int(min(from.mDataByteSize, to.mDataByteSize)))
    }
    let duration = Double(frames) / rate
    let start: Date
    if when.isHostTimeValid {
      let ago = AVAudioTime.seconds(forHostTime: mach_absolute_time()) - AVAudioTime.seconds(forHostTime: when.hostTime)
      start = Date(timeIntervalSinceNow: -ago)
    } else {
      start = Date(timeIntervalSinceNow: -duration)
    }
    pcm = copy
    startedAt = start
    endedAt = start.addingTimeInterval(duration)
  }
}

/// The file being written.
private final class SoundFile {
  let url: URL
  let marker: URL
  let adts: AdtsWriter
  let recording = UUID().uuidString.lowercased()
  let clip: Int
  let index: Int
  let startedAt: Date
  let gapBeforeMs: Int?
  var endedAt: Date?
  var buffers = 0
  var finished = false

  init(url: URL, marker: URL, adts: AdtsWriter, clip: Int, index: Int, startedAt: Date, gapBeforeMs: Int?) {
    self.url = url
    self.marker = marker
    self.adts = adts
    self.clip = clip
    self.index = index
    self.startedAt = startedAt
    self.gapBeforeMs = gapBeforeMs
  }
}
