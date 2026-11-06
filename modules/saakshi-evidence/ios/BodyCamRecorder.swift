import AVFoundation
import UIKit
import UniformTypeIdentifiers

/// Body-cam mode on iPhone (spec B1–B4; fix round 1, group 1).
///
/// One microphone stream feeds everything, so iOS never has to hand the microphone from one
/// recorder to another:
/// - `AVCaptureSession` with the back camera only (no audio input), into `AVCaptureVideoDataOutput`;
/// - `AVAudioEngine`'s input node, started in the foreground when body-cam starts. With the app's
///   `audio` background mode it keeps running while the app is in the background or the phone is
///   locked.
///
/// One continuous file per unbroken stretch (owner's decision of 5 Nov 2026; fix round 1, group 2a):
/// - While video frames arrive, the sound goes into the same file as the video: H.264 and AAC as
///   fragmented MPEG-4 (`.mp4`). The asset writer hands each segment (`moof` and `mdat`, about every
///   10 seconds) to `SegmentSink`, and the app appends it to the file itself, fingerprinting every
///   byte as it goes. Each segment is a checkpoint, and a file cut off plays up to its last segment.
/// - iOS stops the camera when the app leaves the screen, and an asset writer can't keep writing in
///   the background (Apple's AVAssetWriter.h: a writer still writing when the app goes into the
///   background fails), so the video file is closed the moment the app enters the background,
///   inside a background task. From then on the same sound goes into a sound-only file, ADTS AAC
///   (`.aac`) encoded and written by the app (`AdtsWriter`), which works in the background, is cut-off
///   safe and gets a checkpoint about every 10 seconds. It starts half a second before the video's
///   sound ended (or, if the video file failed to close properly, up to 11 seconds before, to cover
///   the segment that may be lost) and ends half a second after video comes back, so the sound has
///   no gap.
/// - A new file starts only when it must: the app came back on screen, the microphone came back
///   after an interruption, or a file could not be written. Pieces of `pieceSeconds` only if asked.
///
/// Each file has a random `recording` id, which its checkpoints (`onCheckpoint`) and its record carry.
/// Each file gets a crash-recovery marker in `pendingDir` (format shared with
/// src/modules/evidence/locker/pending.ts), and `onRecordingClosed` when it closes.
final class BodyCamRecorder: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
  static let shared = BodyCamRecorder()

  struct Config {
    let outputDir: URL
    let pendingDir: URL
    /// Pieces of this length; 0 for one continuous file per stretch.
    let pieceSeconds: Double
    /// About this often, a sound-only file gets a checkpoint (video files: every segment).
    let checkpointSeconds: Double
    let quality: Int
    let firstClip: Int
    let mode: String
  }

  enum Failure: LocalizedError {
    case alreadyRunning
    case noCamera
    case cannotUseCamera
    case noMicrophone
    case cannotWrite(String)

    var errorDescription: String? {
      switch self {
      case .alreadyRunning: return "Body-cam is already recording"
      case .noCamera: return "No back camera"
      case .cannotUseCamera: return "The camera could not be set up"
      case .noMicrophone: return "No microphone input"
      case .cannotWrite(let what): return "Could not write the recording: \(what)"
      }
    }
  }

  /// Sends an event to JavaScript. Called on the recorder's queue.
  var emit: ((String, [String: Any]) -> Void)?

  // Seconds.
  /// Sound-only files overlap the video they take over from and hand back to.
  private static let overlap = 0.5
  /// If a video file failed to close, the sound-only file reaches back this far: a cut-off movie
  /// keeps only its complete 10-second fragments.
  private static let failedOverlap = 11.0
  /// Sound kept in memory, to start a sound-only file from before video stopped.
  private static let recentAudioSeconds = 15.0
  /// No video frame for this long: video has stopped, even if iOS didn't say so.
  private static let videoStallSeconds = 2.0
  /// No sound for this long: the microphone has stopped, even if iOS didn't say so.
  private static let audioStallSeconds = 2.0
  /// No video this long after Start: record sound on its own rather than lose it.
  private static let firstVideoTimeoutSeconds = 3.0
  /// A piece waiting for sound up to its end is closed anyway after this long.
  private static let closeTimeoutSeconds = 1.0
  /// How long to wait for a closing video file's result before starting the sound-only file.
  private static let handOverTimeoutSeconds = 3.0
  /// After a file can't be created, wait this long before trying again.
  private static let retrySeconds = 5.0
  /// While the microphone is off, try to start it again this often.
  private static let audioRetrySeconds = 10.0
  /// Video segments, each a checkpoint: Apple's usual fragment length, as before.
  private static let segmentSeconds: Int64 = 10

  private let sessionQueue = DispatchQueue(label: "in.aayushtainwala.saakshi.bodycam.session")
  /// Every piece of recording state below is touched only on this queue.
  private let queue = DispatchQueue(label: "in.aayushtainwala.saakshi.bodycam")
  private let lock = NSLock()
  private var runningFlag = false
  private var backgroundFlag = false
  private var orientationValue = UIDeviceOrientation.portrait
  /// Main thread only.
  private var backgroundTask = UIBackgroundTaskIdentifier.invalid

  private var config: Config?
  private var capture: AVCaptureSession?
  private var videoOutput: AVCaptureVideoDataOutput?
  private var captureClock: CMClock?
  private var engine: AVAudioEngine?
  /// Sound from an engine of an older generation (before a restart or a loss) is ignored.
  private var engineGeneration = 0
  /// AAC settings for the video files' sound.
  private var audioSettings: [String: Any]?
  private var observers: [NSObjectProtocol] = []
  private var timer: DispatchSourceTimer?
  private let finishing = DispatchGroup()
  private var videoFinishes = 0
  private let iso: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  private var startedAtHost = CMTime.invalid
  private var stopping = false
  private var closedWhileStopping: [[String: Any]] = []
  private var nextClip = 0
  private var video: OutputFile?
  private var sound: OutputFile?
  /// Pieces that have ended but still wait for sound up to their end time.
  private var closing: [OutputFile] = []
  private var recent: [AudioChunk] = []
  /// Sound from the current engine is arriving and goes into new files.
  private var audioOn = false
  /// The engine has started and its first sound is due. New video files get a sound track already,
  /// so the first piece after Start isn't split when the first sound arrives a moment after the
  /// first frame. If no sound comes within `audioStallSeconds`, it counts as lost.
  private var audioPending = false
  private var audioActive: Bool { audioOn || audioPending }
  private var lastAudioArrival = CMTime.invalid
  private var lastAudioEnd: CMTime?
  private var lastAudioAttempt = CMTime.invalid
  private var lastFrame: CMTime?
  private var frameDuration = CMTime(value: 1, timescale: 30)
  /// End of the last video file: the picture's timeline.
  private var lastVideoEnd: CMTime?
  /// End of the sound in the last file that carried sound: the sound's timeline.
  private var lastSoundEnd: CMTime?
  /// The next video file continues this clip, as this piece number.
  private var continueVideo: (clip: Int, index: Int)?
  private var videoStarted = false
  /// The sound-only file ends here, half a second after video with sound came back.
  private var soundStopAt: CMTime?
  /// A video stretch has ended and its file is still closing: the sound-only file waits to know
  /// whether the video file closed properly.
  private var handOver: (file: OutputFile, since: CMTime)?
  /// Where the next sound-only file starts, once the hand-over is decided.
  private var handOverFrom: CMTime?
  private var videoRetryAt = CMTime.invalid
  private var soundRetryAt = CMTime.invalid

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

  private var orientation: UIDeviceOrientation {
    lock.lock()
    defer { lock.unlock() }
    return orientationValue
  }

  // MARK: - Start and stop

  func start(_ config: Config, completion: @escaping (Error?) -> Void) {
    sessionQueue.async { [self] in
      if isRunning { return completion(Failure.alreadyRunning) }
      do {
        try FileManager.default.createDirectory(at: config.outputDir, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: config.pendingDir, withIntermediateDirectories: true)
        let (capture, output) = try makeCapture(quality: config.quality)
        queue.sync { reset(config, capture: capture, output: output) }
        setRunning(true)
        addObservers(capture)
        // Sound first, in the foreground: iOS lets a recording that is already running carry on in
        // the background, but may refuse to start one there. If it can't start now (for example
        // during a call), video records without sound and the timer keeps trying.
        startAudio()
        capture.startRunning()
        queue.sync { startTimer() }
        completion(nil)
      } catch {
        teardown()
        completion(error)
      }
    }
  }

  /// Stops and closes every file. Calls back with the events of the files closed on the way.
  func stop(completion: @escaping ([[String: Any]]) -> Void) {
    sessionQueue.async { [self] in
      guard isRunning else { return completion([]) }
      queue.sync {
        stopping = true
        timer?.cancel()
        timer = nil
      }
      capture?.stopRunning()
      queue.async { [self] in
        if let file = video {
          video = nil
          close(file, at: videoEnd(file), reason: "stopped", waitForAudio: false)
        }
        if let file = sound {
          sound = nil
          close(file, at: file.lastAudioEnd ?? file.start, reason: "stopped", waitForAudio: false)
        }
        for file in closing { finish(file) }
        finishing.notify(queue: queue) { [self] in
          let events = closedWhileStopping
          sessionQueue.async { [self] in
            teardown()
            completion(events)
          }
        }
      }
    }
  }

  /// On the session queue.
  private func teardown() {
    let observed = !observers.isEmpty
    for observer in observers { NotificationCenter.default.removeObserver(observer) }
    observers.removeAll()
    if observed {
      DispatchQueue.main.async { UIDevice.current.endGeneratingDeviceOrientationNotifications() }
    }
    if let capture, capture.isRunning { capture.stopRunning() }
    let engine = queue.sync { () -> AVAudioEngine? in
      let current = self.engine
      self.engine = nil
      self.engineGeneration += 1
      return current
    }
    if let engine {
      engine.inputNode.removeTap(onBus: 0)
      engine.stop()
    }
    // Let other apps' sound resume, unless bug mode is still using the microphone.
    if !SoundRecorder.shared.isRunning {
      try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
    queue.sync {
      self.capture = nil
      self.videoOutput = nil
      self.config = nil
      self.audioOn = false
      self.audioPending = false
      self.recent.removeAll()
      self.video = nil
      self.sound = nil
      self.closing.removeAll()
      self.handOver = nil
      self.handOverFrom = nil
    }
    DispatchQueue.main.async { self.endBackgroundTask() }
    setRunning(false)
  }

  /// On the queue.
  private func reset(_ config: Config, capture: AVCaptureSession, output: AVCaptureVideoDataOutput) {
    self.config = config
    self.capture = capture
    videoOutput = output
    captureClock = nil
    startedAtHost = Self.hostNow()
    stopping = false
    closedWhileStopping = []
    nextClip = config.firstClip
    video = nil
    sound = nil
    closing = []
    recent = []
    audioOn = false
    audioPending = false
    lastAudioArrival = .invalid
    lastAudioEnd = nil
    lastAudioAttempt = .invalid
    lastFrame = nil
    lastVideoEnd = nil
    lastSoundEnd = nil
    continueVideo = nil
    videoStarted = false
    soundStopAt = nil
    handOver = nil
    handOverFrom = nil
    videoRetryAt = .invalid
    soundRetryAt = .invalid
    videoFinishes = 0
  }

  private func makeCapture(quality: Int) throws -> (AVCaptureSession, AVCaptureVideoDataOutput) {
    let session = AVCaptureSession()
    // The camera has no audio input; the app's audio session is ours to set up.
    session.automaticallyConfiguresApplicationAudioSession = false
    session.beginConfiguration()
    defer { session.commitConfiguration() }
    let preset: AVCaptureSession.Preset = quality >= 1080 ? .hd1920x1080 : .hd1280x720
    if session.canSetSessionPreset(preset) { session.sessionPreset = preset }
    guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
      throw Failure.noCamera
    }
    let input = try AVCaptureDeviceInput(device: device)
    guard session.canAddInput(input) else { throw Failure.cannotUseCamera }
    session.addInput(input)
    let output = AVCaptureVideoDataOutput()
    output.alwaysDiscardsLateVideoFrames = false
    output.setSampleBufferDelegate(self, queue: queue)
    guard session.canAddOutput(output) else { throw Failure.cannotUseCamera }
    session.addOutput(output)
    return (session, output)
  }

  // MARK: - The microphone

  /// On the session queue. Starts a fresh `AVAudioEngine` (after a phone call, a route change or a
  /// media-services reset the old one may hold stale formats), at most once a second. Sound counts
  /// as back only when its first buffer arrives.
  private func startAudio() {
    guard isRunning else { return }
    let now = Self.hostNow()
    let last = queue.sync { lastAudioAttempt }
    if last.isValid, (now - last).seconds < 1 {
      sessionQueue.asyncAfter(deadline: .now() + 1) { [weak self] in
        guard let self, !self.queue.sync(execute: { self.audioActive }) else { return }
        self.startAudio()
      }
      return
    }
    let (previous, generation) = queue.sync { () -> (AVAudioEngine?, Int) in
      let current = self.engine
      self.engine = nil
      self.engineGeneration += 1
      self.lastAudioAttempt = now
      return (current, self.engineGeneration)
    }
    if let previous {
      previous.inputNode.removeTap(onBus: 0)
      previous.stop()
    }
    let audioSession = AVAudioSession.sharedInstance()
    do {
      // Mixable, so music or video in another app doesn't stop the recording.
      try audioSession.setCategory(.playAndRecord, mode: .videoRecording, options: [.mixWithOthers])
      try audioSession.setActive(true)
      let engine = AVAudioEngine()
      let input = engine.inputNode
      let format = input.outputFormat(forBus: 0)
      guard format.sampleRate > 0, format.channelCount > 0 else { throw Failure.noMicrophone }
      input.installTap(onBus: 0, bufferSize: 4096, format: format) { [weak self] buffer, when in
        guard let self, let chunk = AudioChunk(buffer, at: when, generation: generation) else { return }
        self.queue.async { self.handleAudio(chunk) }
      }
      engine.prepare()
      queue.sync {
        self.engine = engine
        self.audioSettings = Self.audioSettings(for: format)
      }
      do {
        try engine.start()
      } catch where inBackground {
        // Apple: starting a mixable recording from the background usually fails. Try as a
        // non-mixable one, so sound comes back after a phone call even if the user hasn't returned.
        // It stays non-mixable until body-cam stops.
        try audioSession.setCategory(.playAndRecord, mode: .videoRecording, options: [])
        try audioSession.setActive(true)
        try engine.start()
      }
      queue.sync {
        if self.engineGeneration == generation {
          self.audioPending = true
          self.lastAudioArrival = Self.hostNow()
        }
      }
    } catch {
      queue.sync {
        if self.engineGeneration == generation { self.engine = nil }
      }
      emitError("Sound could not start: \(error.localizedDescription)")
    }
  }

  // MARK: - Observers

  private func addObservers(_ capture: AVCaptureSession) {
    let center = NotificationCenter.default
    observers.append(center.addObserver(forName: AVCaptureSession.wasInterruptedNotification, object: capture, queue: nil) {
      [weak self] note in
      let raw = note.userInfo?[AVCaptureSessionInterruptionReasonKey] as? Int
      self?.queue.async { self?.cameraInterrupted(raw) }
    })
    observers.append(center.addObserver(forName: AVCaptureSession.runtimeErrorNotification, object: capture, queue: nil) {
      [weak self] note in
      let error = note.userInfo?[AVCaptureSessionErrorKey] as? NSError
      guard let self else { return }
      self.queue.async {
        self.endVideoStretch(reason: "camera-lost", interruption: "runtime-error \(error?.code ?? 0)")
      }
      self.emitError("The camera stopped: \(error?.localizedDescription ?? "unknown error")")
      self.sessionQueue.async {
        if self.isRunning, let capture = self.capture, !capture.isRunning { capture.startRunning() }
      }
    })
    observers.append(center.addObserver(forName: AVAudioSession.interruptionNotification, object: AVAudioSession.sharedInstance(), queue: nil) {
      [weak self] note in
      guard let self, let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
        let type = AVAudioSession.InterruptionType(rawValue: raw)
      else { return }
      switch type {
      case .began:
        self.queue.async { self.audioLost() }
      case .ended:
        self.sessionQueue.async {
          if !self.queue.sync(execute: { self.audioActive }) { self.startAudio() }
        }
      @unknown default:
        break
      }
    })
    observers.append(center.addObserver(forName: .AVAudioEngineConfigurationChange, object: nil, queue: nil) {
      [weak self] note in
      let changed = note.object as AnyObject?
      guard let self else { return }
      self.queue.async {
        guard let engine = self.engine, changed === engine else { return }
        self.audioLost()
        self.sessionQueue.async { self.startAudio() }
      }
    })
    observers.append(center.addObserver(forName: AVAudioSession.mediaServicesWereResetNotification, object: nil, queue: nil) {
      [weak self] _ in
      guard let self else { return }
      self.queue.async { self.audioLost() }
      self.sessionQueue.async { self.startAudio() }
    })
    observers.append(center.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) {
      [weak self] _ in
      // If the app goes on into the background, the video file must still be able to finish.
      self?.beginBackgroundTask()
    })
    observers.append(center.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) {
      [weak self] _ in
      guard let self else { return }
      self.setBackground(true)
      // iOS stops the camera in the background and fails an asset writer still writing: close
      // the video file now, while the background task holds.
      self.queue.sync { self.endVideoStretch(reason: "app-left", interruption: "didEnterBackground") }
    })
    observers.append(center.addObserver(forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main) {
      [weak self] _ in
      self?.setBackground(false)
    })
    observers.append(center.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) {
      [weak self] _ in
      guard let self else { return }
      self.setBackground(false)
      self.endBackgroundTask()
      // Starting a recording is allowed again now the app is on screen.
      self.sessionQueue.async {
        if self.isRunning, !self.queue.sync(execute: { self.audioActive }) { self.startAudio() }
      }
    })
    observers.append(center.addObserver(forName: UIDevice.orientationDidChangeNotification, object: nil, queue: .main) {
      [weak self] _ in
      self?.noteOrientation(UIDevice.current.orientation)
    })
    DispatchQueue.main.async { [weak self] in
      UIDevice.current.beginGeneratingDeviceOrientationNotifications()
      self?.noteOrientation(UIDevice.current.orientation)
    }
  }

  /// Main thread only.
  private func beginBackgroundTask() {
    guard isRunning, backgroundTask == .invalid else { return }
    backgroundTask = UIApplication.shared.beginBackgroundTask { [weak self] in
      self?.endBackgroundTask()
    }
  }

  /// Main thread only.
  private func endBackgroundTask() {
    guard backgroundTask != .invalid else { return }
    UIApplication.shared.endBackgroundTask(backgroundTask)
    backgroundTask = .invalid
  }

  private func noteOrientation(_ value: UIDeviceOrientation) {
    // Face up, face down and unknown keep the last upright orientation.
    guard value.isPortrait || value.isLandscape else { return }
    lock.lock()
    orientationValue = value
    lock.unlock()
  }

  private func startTimer() {
    let timer = DispatchSource.makeTimerSource(queue: queue)
    timer.schedule(deadline: .now() + 0.5, repeating: 0.5)
    timer.setEventHandler { [weak self] in self?.tick() }
    timer.resume()
    self.timer = timer
  }

  // MARK: - Events from the camera and the microphone (on the queue)

  /// iOS interrupted the camera. Video stops only here (or when frames stop coming), never because
  /// the app is merely covered or inactive, such as under Control Center. iOS's reason becomes the
  /// file's end reason (fix round 1, group 2); the raw reason is also logged and sent with the event.
  private func cameraInterrupted(_ raw: Int?) {
    let reason = raw.flatMap { AVCaptureSession.InterruptionReason(rawValue: $0) }
    let name: String
    let endReason: String
    switch reason {
    case .videoDeviceNotAvailableInBackground:
      // The app left the screen, or the phone was locked.
      name = "videoDeviceNotAvailableInBackground"
      endReason = "app-left"
    case .videoDeviceInUseByAnotherClient:
      name = "videoDeviceInUseByAnotherClient"
      endReason = "camera-in-use"
    case .videoDeviceNotAvailableDueToSystemPressure:
      // Apple: "system pressure, such as thermal duress".
      name = "videoDeviceNotAvailableDueToSystemPressure"
      endReason = "system-pressure"
    case .videoDeviceNotAvailableWithMultipleForegroundApps:
      name = "videoDeviceNotAvailableWithMultipleForegroundApps"
      endReason = "camera-lost"
    case .audioDeviceInUseByAnotherClient:
      name = "audioDeviceInUseByAnotherClient"
      endReason = "camera-lost"
    default:
      name = "reason \(raw.map { String($0) } ?? "unknown")"
      endReason = "camera-lost"
    }
    NSLog("[Saakshi body-cam] camera interrupted: %@", name)
    endVideoStretch(reason: endReason, interruption: name)
  }

  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    guard let config, !stopping, let sample = hostTimed(sampleBuffer) else { return }
    let pts = CMSampleBufferGetPresentationTimeStamp(sample)
    if let last = lastFrame, pts > last {
      let gap = (pts - last).seconds
      if gap > 0.004 && gap < 0.25 { frameDuration = pts - last }
    }
    lastFrame = pts

    if let file = video, config.pieceSeconds > 0, (pts - file.start).seconds >= config.pieceSeconds {
      video = nil
      continueVideo = (file.clip, file.index + 1)
      close(file, at: pts, reason: "piece-complete", waitForAudio: true)
    }
    if video == nil {
      if videoRetryAt.isValid && pts < videoRetryAt { return }
      video = openVideo(sample)
    }
    guard let file = video, let writer = file.writer, let input = file.videoInput else { return }
    guard writer.status == .writing else {
      // The writer failed between appends (an encoder error, a media-services reset): end this
      // file now, so the next frame starts a new one and sound isn't lost meanwhile.
      if writer.status == .failed || writer.status == .cancelled { writerFailed(file) }
      return
    }
    guard input.isReadyForMoreMediaData else {
      file.dropped += 1
      return
    }
    // Each file's own timeline starts at 0 (Apple's HLS profile writes no edit list to hide the
    // phone's clock); the file's start in the phone's time is in its record.
    guard let timed = Self.shifted(sample, by: file.start) else { return }
    if input.append(timed) {
      file.videoSamples += 1
    } else {
      writerFailed(file)
    }
  }

  private func handleAudio(_ chunk: AudioChunk) {
    guard let config, !stopping, chunk.generation == engineGeneration else { return }
    if !audioOn { audioRegained() }
    lastAudioArrival = Self.hostNow()
    lastAudioEnd = chunk.end
    recent.append(chunk)
    let keepFrom = chunk.end - CMTime(seconds: Self.recentAudioSeconds, preferredTimescale: 600)
    recent.removeAll { $0.end < keepFrom }

    for file in closing { append(chunk, to: file) }
    if let file = video { append(chunk, to: file) }

    if let file = sound {
      if let stopAt = soundStopAt, chunk.pts >= stopAt {
        sound = nil
        soundStopAt = nil
        close(file, at: stopAt, reason: "video-resumed", waitForAudio: false)
      } else if soundStopAt == nil, config.pieceSeconds > 0, (chunk.pts - file.start).seconds >= config.pieceSeconds {
        close(file, at: chunk.pts, reason: "piece-complete", waitForAudio: false)
        sound = openSound(with: [chunk], continuing: file)
      } else {
        append(chunk, to: file)
        if let stopAt = soundStopAt, chunk.end >= stopAt {
          sound = nil
          soundStopAt = nil
          close(file, at: stopAt, reason: "video-resumed", waitForAudio: false)
        }
      }
    } else if needsSoundOnly() {
      let from = handOverFrom ?? ((lastSoundEnd ?? .negativeInfinity) - Self.seconds(Self.overlap))
      handOverFrom = nil
      sound = openSound(with: recent.filter { $0.end > from }, continuing: nil)
    }

    for file in closing where file.end.map({ chunk.end >= $0 }) ?? true { finish(file) }
  }

  /// Sound on its own is recorded only while video can't be. (`continueVideo` is set while the
  /// next video piece is due with the next frame; `handOver` while the last video file closes.)
  private func needsSoundOnly() -> Bool {
    guard audioOn, video == nil, continueVideo == nil, handOver == nil else { return false }
    if soundRetryAt.isValid && Self.hostNow() < soundRetryAt { return false }
    return videoStarted || (Self.hostNow() - startedAtHost).seconds > Self.firstVideoTimeoutSeconds
  }

  private func tick() {
    guard config != nil, !stopping else { return }
    let now = Self.hostNow()
    let framesStopped = lastFrame.map { (now - $0).seconds > Self.videoStallSeconds } ?? false
    if framesStopped && (video != nil || continueVideo != nil) {
      endVideoStretch(reason: inBackground ? "app-left" : "camera-lost", interruption: "no frames")
    }
    if let pending = handOver, (now - pending.since).seconds > Self.handOverTimeoutSeconds {
      decideHandOver(pending.file, closedProperly: false)
    }
    if audioActive, lastAudioArrival.isValid, (now - lastAudioArrival).seconds > Self.audioStallSeconds {
      audioLost()
      sessionQueue.async { self.startAudio() }
    } else if !audioActive, !lastAudioAttempt.isValid || (now - lastAudioAttempt).seconds > Self.audioRetrySeconds {
      // startAudio notes the attempt.
      sessionQueue.async { self.startAudio() }
    }
    for file in closing where file.closeRequested.isValid && (now - file.closeRequested).seconds > Self.closeTimeoutSeconds {
      finish(file)
    }
  }

  /// Video has stopped (the app left the screen, or the camera was taken). Sound carries on in a
  /// sound-only file, once it is known whether the video file closed properly.
  private func endVideoStretch(reason: String, interruption: String?) {
    soundStopAt = nil
    continueVideo = nil
    guard let file = video else { return }
    video = nil
    file.interruption = interruption
    let carriedSound = file.audioInput != nil && !file.soundEnded && file.audioSamples > 0
    if carriedSound { handOver = (file, Self.hostNow()) }
    close(file, at: videoEnd(file), reason: reason, waitForAudio: false)
  }

  /// The closing video file of a hand-over has reported. A file that closed properly holds its
  /// sound to the end; one that failed keeps only its complete 10-second fragments, so the
  /// sound-only file reaches further back.
  private func decideHandOver(_ file: OutputFile, closedProperly: Bool) {
    guard let pending = handOver, pending.file === file else { return }
    handOver = nil
    let soundEnd = file.soundEnd ?? file.start
    var from = soundEnd - Self.seconds(closedProperly ? Self.overlap : Self.failedOverlap)
    if from < file.start { from = file.start }
    if let back = video, back.audioInput != nil, !back.soundEnded {
      // Video with sound came back before this was decided: cover the time between with sound now.
      guard sound == nil, from < back.start else { return }
      let stopAt = back.start + Self.seconds(Self.overlap)
      sound = openSound(with: recent.filter { $0.end > from && $0.pts < stopAt }, continuing: nil)
      if sound != nil { soundStopAt = stopAt }
    } else {
      handOverFrom = from
    }
  }

  /// The microphone stopped (a phone call, an alarm, a route change). A video piece carries on
  /// without sound to its end; a sound-only piece ends.
  private func audioLost() {
    guard audioActive else { return }
    audioOn = false
    audioPending = false
    engineGeneration += 1
    recent.removeAll()
    if let file = video, let input = file.audioInput, !file.soundEnded {
      // No more sound for this file; finishing its sound track keeps the video from waiting for it.
      file.soundEnded = true
      input.markAsFinished()
    }
    if let file = sound {
      sound = nil
      soundStopAt = nil
      close(file, at: file.lastAudioEnd ?? file.start, reason: "audio-interrupted", waitForAudio: false)
    }
    for file in closing { finish(file) }
  }

  /// The first sound from a restarted microphone. A video piece whose sound stopped, or which had
  /// none, ends here, so the next piece has sound again.
  private func audioRegained() {
    audioOn = true
    audioPending = false
    lastAudioArrival = Self.hostNow()
    if let file = video, file.audioInput == nil || file.soundEnded {
      video = nil
      continueVideo = (file.clip, file.index + 1)
      close(file, at: videoEnd(file), reason: "sound-resumed", waitForAudio: false)
    }
  }

  // MARK: - Files

  private func openVideo(_ sample: CMSampleBuffer) -> OutputFile? {
    guard let config, let format = CMSampleBufferGetFormatDescription(sample) else { return nil }
    let start = CMSampleBufferGetPresentationTimeStamp(sample)
    let dimensions = CMVideoFormatDescriptionGetDimensions(format)
    let continuing = continueVideo
    continueVideo = nil
    let clip = continuing?.clip ?? takeClip()
    let index = continuing?.index ?? 0
    let gap = lastVideoEnd.map { Self.milliseconds(start - $0) }
    let url = config.outputDir.appendingPathComponent(Self.fileName(clip: clip, index: index, ext: "mp4"))
    do {
      // Fragmented MPEG-4, handed to us segment by segment (WWDC 2020, session 10011).
      let sink = SegmentSink(file: try CheckpointedFile(url: url))
      let writer = AVAssetWriter(contentType: .mpeg4Movie)
      writer.outputFileTypeProfile = .mpeg4AppleHLS
      writer.preferredOutputSegmentInterval = CMTime(value: Self.segmentSeconds, timescale: 1)
      writer.initialSegmentStartTime = .zero
      writer.delegate = sink
      let videoInput = AVAssetWriterInput(
        mediaType: .video,
        outputSettings: Self.videoSettings(width: Int(dimensions.width), height: Int(dimensions.height)),
        sourceFormatHint: format
      )
      videoInput.expectsMediaDataInRealTime = true
      videoInput.transform = Self.transform(for: orientation)
      guard writer.canAdd(videoInput) else { throw Failure.cannotWrite("video track") }
      writer.add(videoInput)
      var audioInput: AVAssetWriterInput?
      if audioActive, let settings = audioSettings {
        let input = AVAssetWriterInput(mediaType: .audio, outputSettings: settings)
        input.expectsMediaDataInRealTime = true
        if writer.canAdd(input) {
          writer.add(input)
          audioInput = input
        }
      }
      guard writer.startWriting() else { throw writer.error ?? Failure.cannotWrite("start") }
      writer.startSession(atSourceTime: .zero)
      let file = OutputFile(
        kind: .video, url: url, marker: markerURL(for: url), writer: writer, videoInput: videoInput,
        audioInput: audioInput, data: sink.file, clip: clip, index: index, start: start,
        startedAt: Self.date(for: start), gapBeforeMs: gap
      )
      file.sink = sink
      sink.onCheckpoint = { [weak self, weak file] snapshot in
        guard let self, let file else { return }
        self.emitCheckpoint(file, snapshot)
      }
      sink.onError = { [weak self, weak file] error in
        guard let self else { return }
        self.emitError("Writing \(url.lastPathComponent) failed: \(error.localizedDescription)")
        self.queue.async {
          if let file, !file.failed { self.writerFailed(file) }
        }
      }
      writeMarker(file)
      videoStarted = true
      if audioInput != nil {
        // Sound that arrived before this first frame was handed over.
        for chunk in recent { append(chunk, to: file) }
        // Video with sound is back: the sound-only file hands over half a second from now.
        if sound != nil { soundStopAt = start + Self.seconds(Self.overlap) }
      }
      if file.finished {
        // It failed on its first writes, and has been reported.
        videoRetryAt = start + Self.seconds(Self.retrySeconds)
        return nil
      }
      return file
    } catch {
      // Sound carries on in a sound-only file until a video file can be started again.
      try? FileManager.default.removeItem(at: url)
      videoRetryAt = start + Self.seconds(Self.retrySeconds)
      emitError("A video file could not be started: \(error.localizedDescription)")
      return nil
    }
  }

  private func openSound(with chunks: [AudioChunk], continuing previous: OutputFile?) -> OutputFile? {
    guard let config, let first = chunks.first else { return nil }
    let start = first.pts
    let clip = previous?.clip ?? takeClip()
    let index = previous.map { $0.index + 1 } ?? 0
    // A next piece counts from the piece before it; a new stretch from the last file with sound.
    let gap: Int? = (previous?.end ?? lastSoundEnd).map { Self.milliseconds(start - $0) }
    let url = config.outputDir.appendingPathComponent(Self.fileName(clip: clip, index: index, ext: "aac"))
    do {
      let adts = try AdtsWriter(url: url, input: first.pcm.format, checkpointSeconds: config.checkpointSeconds)
      let file = OutputFile(
        kind: .audio, url: url, marker: markerURL(for: url), writer: nil, videoInput: nil, audioInput: nil,
        data: adts.file, clip: clip, index: index, start: start, startedAt: Self.date(for: start), gapBeforeMs: gap
      )
      file.adts = adts
      adts.onCheckpoint = { [weak self, weak file] snapshot in
        guard let self, let file else { return }
        self.emitCheckpoint(file, snapshot)
      }
      writeMarker(file)
      for chunk in chunks { append(chunk, to: file) }
      if file.finished {
        soundRetryAt = Self.hostNow() + Self.seconds(Self.retrySeconds)
        return nil
      }
      return file
    } catch {
      try? FileManager.default.removeItem(at: url)
      soundRetryAt = Self.hostNow() + Self.seconds(Self.retrySeconds)
      emitError("A sound file could not be started: \(error.localizedDescription)")
      return nil
    }
  }

  private func append(_ chunk: AudioChunk, to file: OutputFile) {
    guard !file.finished, chunk.end > file.start, chunk.pts > file.lastAudioPts else { return }
    if let end = file.end, chunk.pts >= end { return }
    if file === sound, let stopAt = soundStopAt, chunk.pts >= stopAt { return }
    if let adts = file.adts {
      do {
        try adts.write(chunk.pcm)
      } catch {
        writerFailed(file)
        return
      }
    } else {
      guard let input = file.audioInput, !file.soundEnded, let writer = file.writer, chunk.pts >= file.start else { return }
      guard writer.status == .writing else {
        if writer.status == .failed || writer.status == .cancelled { writerFailed(file) }
        return
      }
      guard input.isReadyForMoreMediaData else {
        file.dropped += 1
        return
      }
      guard let timed = Self.shifted(chunk.sample, by: file.start), input.append(timed) else {
        writerFailed(file)
        return
      }
    }
    file.audioSamples += 1
    file.lastAudioPts = chunk.pts
    file.lastAudioEnd = chunk.end
  }

  /// Ends a file at `end`. A piece that must still receive sound up to its end waits in `closing`.
  private func close(_ file: OutputFile, at end: CMTime, reason: String, waitForAudio: Bool) {
    file.end = end
    file.endReason = reason
    file.endedAt = Self.date(for: end)
    if file.kind == .video { lastVideoEnd = end }
    if waitForAudio && file.audioInput != nil && !file.soundEnded && audioActive {
      file.closeRequested = Self.hostNow()
      closing.append(file)
    } else {
      finish(file)
    }
  }

  private func finish(_ file: OutputFile) {
    closing.removeAll { $0 === file }
    guard !file.finished else { return }
    file.finished = true
    // The sound's own end, which can be a little before the file's end.
    if let soundEnd = file.soundEnd, lastSoundEnd.map({ soundEnd > $0 }) ?? true { lastSoundEnd = soundEnd }

    if file.kind == .audio {
      // Encodes the last of the sound and closes the file before it is reported and hashed.
      file.whole = file.adts?.finish()
      file.adts = nil
      if file.audioSamples == 0 || (file.whole?.bytes ?? 0) == 0 {
        discard(file)
        return
      }
      file.endedAt = Self.date(for: file.lastAudioEnd ?? file.start)
      report(file)
      return
    }

    guard let writer = file.writer else { return }
    if file.videoSamples == 0 {
      if writer.status == .writing { writer.cancelWriting() }
      _ = file.data.finish()
      discard(file)
      if handOver?.file === file { decideHandOver(file, closedProperly: false) }
      return
    }
    guard writer.status == .writing else {
      file.whole = file.data.finish()
      report(file)
      return
    }
    // No endSession: in segment mode there is no edit list to trim with, and appends already stop
    // at the file's end.
    finishing.enter()
    videoFinishes += 1
    writer.finishWriting { [weak self] in
      guard let self else { return }
      self.queue.async {
        // The writer has handed over its last segment: close the file and fingerprint all of it.
        file.whole = file.data.finish()
        self.report(file)
        self.videoFinishes -= 1
        if self.videoFinishes == 0, self.inBackground {
          DispatchQueue.main.async { self.endBackgroundTask() }
        }
        self.finishing.leave()
      }
    }
  }

  /// A file with nothing recorded in it: there is nothing to keep.
  private func discard(_ file: OutputFile) {
    try? FileManager.default.removeItem(at: file.url)
    try? FileManager.default.removeItem(at: file.marker)
  }

  private func writerFailed(_ file: OutputFile) {
    // Once is enough: the file is already being ended as an error.
    guard !file.failed else { return }
    let message = file.writer?.error?.localizedDescription ?? "the file could not be written"
    emitError("Writing \(file.url.lastPathComponent) failed: \(message)")
    file.failed = true
    if file.end != nil {
      // Already ending: keep its end time, and report it as an error.
      file.endReason = "error"
      finish(file)
      return
    }
    if video === file {
      video = nil
      continueVideo = (file.clip, file.index + 1)
    }
    if sound === file {
      sound = nil
      soundStopAt = nil
    }
    let end = file.kind == .video ? videoEnd(file) : (file.lastAudioEnd ?? file.start)
    close(file, at: end, reason: "error", waitForAudio: false)
  }

  private func report(_ file: OutputFile) {
    let failed = file.failed || (file.writer.map { $0.status != .completed } ?? false)
    if file.kind == .video { decideHandOver(file, closedProperly: !failed) }
    if (file.whole?.bytes ?? 0) == 0 {
      // Nothing reached the file (the writer failed before its first segment).
      discard(file)
      return
    }
    let reason = failed ? "error" : file.endReason
    let endedAt = file.endedAt ?? Date()
    writeMarker(file, closedAt: endedAt, endReason: reason)
    let event: [String: Any] = [
      "uri": file.url.absoluteString,
      "kind": file.kind.rawValue,
      "clip": file.clip,
      "index": file.index,
      "startedAt": iso.string(from: file.startedAt),
      "endedAt": iso.string(from: endedAt),
      "endReason": reason,
      "gapBeforeMs": file.gapBeforeMs.map { $0 as Any } ?? NSNull(),
      "cutoffSafe": true,
      "rotationDegrees": NSNull(),
      "interruption": file.interruption.map { $0 as Any } ?? NSNull(),
      "droppedSamples": file.dropped,
      "recording": file.recording,
      "finalSize": file.whole.map { Double($0.bytes) as Any } ?? NSNull(),
      "finalSha256": file.whole.map { $0.sha256 as Any } ?? NSNull(),
    ]
    emit?("onRecordingClosed", event)
    if stopping { closedWhileStopping.append(event) }
  }

  private func writeMarker(_ file: OutputFile, closedAt: Date? = nil, endReason: String? = nil) {
    var json: [String: Any] = [
      "file": file.url.absoluteString,
      "kind": file.kind.rawValue,
      "segment": ["clip": file.clip, "index": file.index],
      "startedAt": iso.string(from: file.startedAt),
      "mode": config?.mode ?? "body-cam",
      "gapBeforeMs": file.gapBeforeMs.map { $0 as Any } ?? NSNull(),
      "cutoffSafe": true,
      "rotationDegrees": NSNull(),
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

  /// A checkpoint of a file being written: its length so far and the SHA-256 of those bytes. Called
  /// from the writer's own thread (video) or the queue (sound); it touches only the file's fixed facts.
  private func emitCheckpoint(_ file: OutputFile, _ snapshot: CheckpointedFile.Snapshot) {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    emit?("onCheckpoint", [
      "recording": file.recording,
      "uri": file.url.absoluteString,
      "kind": file.kind.rawValue,
      "clip": file.clip,
      "index": file.index,
      "checkpoint": snapshot.index,
      "bytes": Double(snapshot.bytes),
      "sha256": snapshot.sha256,
      "at": formatter.string(from: Date()),
      "startedAt": formatter.string(from: file.startedAt),
    ])
  }

  private func markerURL(for url: URL) -> URL {
    (config?.pendingDir ?? url.deletingLastPathComponent()).appendingPathComponent("\(url.lastPathComponent).json")
  }

  private func takeClip() -> Int {
    let clip = nextClip
    nextClip += 1
    return clip
  }

  private func videoEnd(_ file: OutputFile) -> CMTime {
    guard let last = lastFrame, last >= file.start else { return file.start }
    return last + frameDuration
  }

  private func emitError(_ message: String) {
    NSLog("[Saakshi body-cam] %@", message)
    emit?("onRecorderError", ["message": message])
  }

  // MARK: - Helpers

  /// Video timestamps on the host clock, which the sound's timestamps use too.
  private func hostTimed(_ sample: CMSampleBuffer) -> CMSampleBuffer? {
    if captureClock == nil { captureClock = capture?.synchronizationClock }
    let host = CMClockGetHostTimeClock()
    guard let clock = captureClock, clock !== host else { return sample }
    let pts = CMSampleBufferGetPresentationTimeStamp(sample)
    return Self.shifted(sample, by: pts - CMSyncConvertTime(pts, from: clock, to: host))
  }

  /// A copy of the sample with every timestamp moved back by `offset`, keeping each sample's
  /// own duration (an audio buffer holds many samples).
  private static func shifted(_ sample: CMSampleBuffer, by offset: CMTime) -> CMSampleBuffer? {
    var count: CMItemCount = 0
    guard CMSampleBufferGetSampleTimingInfoArray(sample, entryCount: 0, arrayToFill: nil, entriesNeededOut: &count) == noErr,
      count > 0
    else { return nil }
    var timing = [CMSampleTimingInfo](repeating: CMSampleTimingInfo(), count: count)
    guard CMSampleBufferGetSampleTimingInfoArray(sample, entryCount: count, arrayToFill: &timing, entriesNeededOut: &count) == noErr
    else { return nil }
    for i in timing.indices {
      timing[i].presentationTimeStamp = timing[i].presentationTimeStamp - offset
      if timing[i].decodeTimeStamp.isValid { timing[i].decodeTimeStamp = timing[i].decodeTimeStamp - offset }
    }
    var copy: CMSampleBuffer?
    guard CMSampleBufferCreateCopyWithNewTiming(
      allocator: kCFAllocatorDefault, sampleBuffer: sample, sampleTimingEntryCount: count, sampleTimingArray: &timing,
      sampleBufferOut: &copy
    ) == noErr else { return nil }
    return copy
  }

  /// AAC at the microphone's sample rate (at most 48 kHz), mono or stereo, 128 kbit/s as on Android.
  private static func audioSettings(for format: AVAudioFormat) -> [String: Any] {
    let channels = min(Int(format.channelCount), 2)
    var layout = AudioChannelLayout()
    layout.mChannelLayoutTag = channels == 1 ? kAudioChannelLayoutTag_Mono : kAudioChannelLayoutTag_Stereo
    return [
      AVFormatIDKey: kAudioFormatMPEG4AAC,
      AVSampleRateKey: min(format.sampleRate, 48_000),
      AVNumberOfChannelsKey: channels,
      AVEncoderBitRateKey: 128_000,
      AVChannelLayoutKey: Data(bytes: &layout, count: MemoryLayout<AudioChannelLayout>.size),
    ]
  }

  /// H.264, at the bit rates the Android recorder uses (3 Mbit/s at 720p, 6 at 1080p).
  private static func videoSettings(width: Int, height: Int) -> [String: Any] {
    [
      AVVideoCodecKey: AVVideoCodecType.h264,
      AVVideoWidthKey: width,
      AVVideoHeightKey: height,
      AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: min(width, height) >= 1080 ? 6_000_000 : 3_000_000,
        AVVideoExpectedSourceFrameRateKey: 30,
        AVVideoMaxKeyFrameIntervalKey: 60,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
      ] as [String: Any],
    ]
  }

  /// The back camera's frames are landscape, with the Home-button side on the right. The file
  /// carries the turn that shows them upright.
  private static func transform(for orientation: UIDeviceOrientation) -> CGAffineTransform {
    switch orientation {
    case .landscapeLeft: return .identity
    case .landscapeRight: return CGAffineTransform(rotationAngle: .pi)
    case .portraitUpsideDown: return CGAffineTransform(rotationAngle: -.pi / 2)
    default: return CGAffineTransform(rotationAngle: .pi / 2)
    }
  }

  private static func fileName(clip: Int, index: Int, ext: String) -> String {
    "bodycam-\(clip)-\(index)-\(Int64(Date().timeIntervalSince1970 * 1000)).\(ext)"
  }

  fileprivate static func hostNow() -> CMTime {
    CMClockGetTime(CMClockGetHostTimeClock())
  }

  private static func seconds(_ value: Double) -> CMTime {
    CMTime(seconds: value, preferredTimescale: 48_000)
  }

  private static func date(for time: CMTime) -> Date {
    Date(timeIntervalSinceNow: (time - hostNow()).seconds)
  }

  private static func milliseconds(_ time: CMTime) -> Int {
    let seconds = time.seconds
    return seconds.isFinite ? Int((seconds * 1000).rounded()) : 0
  }
}

/// One buffer of microphone sound, kept both as PCM (for sound-only files) and as a sample buffer
/// on the host clock (for the video files). Copied out of the engine's buffer, which the engine
/// may reuse.
private struct AudioChunk {
  let pcm: AVAudioPCMBuffer
  let sample: CMSampleBuffer
  let pts: CMTime
  let end: CMTime
  let generation: Int

  init?(_ buffer: AVAudioPCMBuffer, at when: AVAudioTime, generation: Int) {
    let frames = buffer.frameLength
    let rate = buffer.format.sampleRate
    guard frames > 0, rate > 0,
      let copy = AVAudioPCMBuffer(pcmFormat: buffer.format, frameCapacity: frames)
    else { return nil }
    copy.frameLength = frames
    let source = UnsafeMutableAudioBufferListPointer(UnsafeMutablePointer(mutating: buffer.audioBufferList))
    let target = UnsafeMutableAudioBufferListPointer(copy.mutableAudioBufferList)
    for (from, to) in zip(source, target) {
      guard let fromData = from.mData, let toData = to.mData else { continue }
      memcpy(toData, fromData, Int(min(from.mDataByteSize, to.mDataByteSize)))
    }
    let duration = CMTime(seconds: Double(frames) / rate, preferredTimescale: CMTimeScale(rate))
    let pts = when.isHostTimeValid ? CMClockMakeHostTimeFromSystemUnits(when.hostTime) : BodyCamRecorder.hostNow() - duration
    var timing = CMSampleTimingInfo(
      duration: CMTime(value: 1, timescale: CMTimeScale(rate)), presentationTimeStamp: pts, decodeTimeStamp: .invalid
    )
    var sample: CMSampleBuffer?
    guard CMSampleBufferCreate(
      allocator: kCFAllocatorDefault, dataBuffer: nil, dataReady: false, makeDataReadyCallback: nil, refcon: nil,
      formatDescription: copy.format.formatDescription, sampleCount: CMItemCount(frames), sampleTimingEntryCount: 1,
      sampleTimingArray: &timing, sampleSizeEntryCount: 0, sampleSizeArray: nil, sampleBufferOut: &sample
    ) == noErr, let sample else { return nil }
    guard CMSampleBufferSetDataBufferFromAudioBufferList(
      sample, blockBufferAllocator: kCFAllocatorDefault, blockBufferMemoryAllocator: kCFAllocatorDefault, flags: 0,
      bufferList: copy.audioBufferList
    ) == noErr else { return nil }
    self.pcm = copy
    self.sample = sample
    self.pts = pts
    self.end = pts + duration
    self.generation = generation
  }
}

/// One file being written: video (`AVAssetWriter` segments, with sound when the microphone is on)
/// or sound only (`AdtsWriter`). Both append to a `CheckpointedFile`.
private final class OutputFile {
  enum Kind: String {
    case video
    case audio
  }

  let kind: Kind
  let url: URL
  let marker: URL
  let writer: AVAssetWriter?
  let videoInput: AVAssetWriterInput?
  let audioInput: AVAssetWriterInput?
  /// The file on disk, fingerprinted as it is written.
  let data: CheckpointedFile
  /// The asset writer's delegate (the writer holds it weakly).
  var sink: SegmentSink?
  var adts: AdtsWriter?
  /// The whole file's length and SHA-256, once closed.
  var whole: CheckpointedFile.Snapshot?
  let recording = UUID().uuidString.lowercased()
  let clip: Int
  let index: Int
  let start: CMTime
  let startedAt: Date
  let gapBeforeMs: Int?
  var end: CMTime?
  var endedAt: Date?
  var endReason = "stopped"
  var interruption: String?
  var closeRequested = CMTime.invalid
  var finished = false
  var failed = false
  /// The microphone stopped while this video file was open; its sound track is finished.
  var soundEnded = false
  var videoSamples = 0
  var audioSamples = 0
  var lastAudioPts = CMTime.negativeInfinity
  var lastAudioEnd: CMTime?
  var dropped = 0

  /// Where this file's sound ends: the end of the last sound written, but not after the file's end.
  var soundEnd: CMTime? {
    guard audioSamples > 0, let last = lastAudioEnd else { return nil }
    if let end, end < last { return end }
    return last
  }

  init(
    kind: Kind, url: URL, marker: URL, writer: AVAssetWriter?, videoInput: AVAssetWriterInput?,
    audioInput: AVAssetWriterInput?, data: CheckpointedFile, clip: Int, index: Int, start: CMTime, startedAt: Date,
    gapBeforeMs: Int?
  ) {
    self.kind = kind
    self.url = url
    self.marker = marker
    self.writer = writer
    self.videoInput = videoInput
    self.audioInput = audioInput
    self.data = data
    self.clip = clip
    self.index = index
    self.start = start
    self.startedAt = startedAt
    self.gapBeforeMs = gapBeforeMs
  }
}
