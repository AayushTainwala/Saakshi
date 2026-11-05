import AVFoundation
import UIKit

/// Body-cam mode on iPhone (spec B1–B4; fix round 1, group 1).
///
/// One microphone stream feeds everything, so iOS never has to hand the microphone from one
/// recorder to another:
/// - `AVCaptureSession` with the back camera only (no audio input), into `AVCaptureVideoDataOutput`;
/// - `AVAudioEngine`'s input node, started in the foreground when body-cam starts. With the app's
///   `audio` background mode it keeps running while the app is in the background or the phone is
///   locked.
///
/// While video frames arrive, the sound goes into the same `.mov` as the video (H.264 and AAC,
/// written by `AVAssetWriter` with a movie fragment every 10 seconds, so a cut-off file plays up to
/// its last fragment). iOS stops the camera when the app leaves the screen; from that moment the
/// same sound goes into a sound-only `.m4a` instead. The sound-only file starts half a second
/// before the video stopped and ends half a second after video comes back, so the sound has no gap.
/// Video and sound-only files are cut into pieces of `pieceSeconds`, with no gap between pieces.
///
/// Each file gets a crash-recovery marker in `pendingDir` (format shared with
/// src/modules/evidence/locker/pending.ts), and `onRecordingClosed` when it closes.
final class BodyCamRecorder: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
  static let shared = BodyCamRecorder()

  struct Config {
    let outputDir: URL
    let pendingDir: URL
    let pieceSeconds: Double
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
  /// Sound kept in memory, to start a sound-only file from just before video stopped.
  private static let recentAudioSeconds = 3.0
  /// No video frame for this long: video has stopped, even if iOS didn't say so.
  private static let videoStallSeconds = 2.0
  /// No sound for this long: the microphone has stopped, even if iOS didn't say so.
  private static let audioStallSeconds = 2.0
  /// No video this long after Start: record sound on its own rather than lose it.
  private static let firstVideoTimeoutSeconds = 3.0
  /// A piece waiting for sound up to its end is closed anyway after this long.
  private static let closeTimeoutSeconds = 1.0
  /// After a file can't be created, wait this long before trying again.
  private static let retrySeconds = 5.0
  /// While the microphone is lost, try to restart it this often.
  private static let audioRetrySeconds = 10.0

  private let sessionQueue = DispatchQueue(label: "in.aayushtainwala.saakshi.bodycam.session")
  /// Every piece of recording state below is touched only on this queue.
  private let queue = DispatchQueue(label: "in.aayushtainwala.saakshi.bodycam")
  private let lock = NSLock()
  private var runningFlag = false
  private var backgroundFlag = false
  private var orientationValue = UIDeviceOrientation.portrait

  private var config: Config?
  private var capture: AVCaptureSession?
  private var videoOutput: AVCaptureVideoDataOutput?
  private var captureClock: CMClock?
  private var engine: AVAudioEngine?
  private var audioSettings: [String: Any]?
  private var observers: [NSObjectProtocol] = []
  private var timer: DispatchSourceTimer?
  private let finishing = DispatchGroup()
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
  private var recentAudio: [CMSampleBuffer] = []
  /// The microphone is running and its sound goes into new files.
  private var audioOn = false
  private var lastAudioArrival = CMTime.invalid
  private var lastAudioEnd: CMTime?
  private var lastAudioAttempt = CMTime.invalid
  private var lastFrame: CMTime?
  private var frameDuration = CMTime(value: 1, timescale: 30)
  /// End of the last video file: the picture's timeline.
  private var lastVideoEnd: CMTime?
  /// End of the last file that carried sound: the sound's timeline.
  private var lastSoundEnd: CMTime?
  /// The next video file continues this clip, as this piece number.
  private var continueVideo: (clip: Int, index: Int)?
  private var videoStarted = false
  /// The sound-only file ends here, half a second after video with sound came back.
  private var soundStopAt: CMTime?
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
        // the background, but may refuse to start one there.
        do {
          let (engine, settings) = try makeEngine()
          queue.sync {
            self.engine = engine
            self.audioSettings = settings
            self.lastAudioAttempt = Self.hostNow()
          }
          try engine.start()
          queue.sync {
            self.audioOn = true
            self.lastAudioArrival = Self.hostNow()
          }
        } catch {
          // Video records without sound; the timer keeps trying to start the microphone.
          emitError("Sound could not start, so video will have no sound: \(error.localizedDescription)")
        }

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
      capture?.stopRunning()
      queue.async { [self] in
        stopping = true
        timer?.cancel()
        timer = nil
        if let file = video {
          video = nil
          close(file, at: videoEnd(file), reason: "stopped", waitForAudio: false)
        }
        if let file = sound {
          sound = nil
          close(file, at: lastAudioEnd ?? file.start, reason: "stopped", waitForAudio: false)
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
    let engine = queue.sync { self.engine }
    if let engine {
      engine.inputNode.removeTap(onBus: 0)
      engine.stop()
    }
    queue.sync {
      self.capture = nil
      self.videoOutput = nil
      self.engine = nil
      self.config = nil
      self.audioOn = false
      self.recentAudio.removeAll()
      self.video = nil
      self.sound = nil
      self.closing.removeAll()
    }
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
    recentAudio = []
    audioOn = false
    lastAudioEnd = nil
    lastAudioAttempt = .invalid
    lastFrame = nil
    lastVideoEnd = nil
    lastSoundEnd = nil
    continueVideo = nil
    videoStarted = false
    soundStopAt = nil
    videoRetryAt = .invalid
    soundRetryAt = .invalid
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

  /// On the session queue.
  private func makeEngine() throws -> (AVAudioEngine, [String: Any]) {
    let audioSession = AVAudioSession.sharedInstance()
    // Mixable, so music or video in another app doesn't stop the recording.
    try audioSession.setCategory(.playAndRecord, mode: .videoRecording, options: [.mixWithOthers])
    try audioSession.setActive(true)
    let engine = AVAudioEngine()
    let format = try installTap(on: engine)
    engine.prepare()
    return (engine, Self.audioSettings(for: format))
  }

  private func installTap(on engine: AVAudioEngine) throws -> AVAudioFormat {
    let input = engine.inputNode
    let format = input.outputFormat(forBus: 0)
    guard format.sampleRate > 0, format.channelCount > 0 else { throw Failure.noMicrophone }
    input.installTap(onBus: 0, bufferSize: 4096, format: format) { [weak self] buffer, when in
      guard let self, let sample = Self.sampleBuffer(buffer, at: when) else { return }
      self.queue.async { self.handleAudio(sample) }
    }
    return format
  }

  /// On the session queue. Restarts the microphone after an interruption or a route change, at
  /// most once a second.
  private func restartEngine() {
    guard isRunning, let engine = queue.sync(execute: { self.engine }) else { return }
    let last = queue.sync { lastAudioAttempt }
    let now = Self.hostNow()
    if last.isValid, (now - last).seconds < 1 {
      sessionQueue.asyncAfter(deadline: .now() + 1) { [weak self] in
        guard let self, !self.queue.sync(execute: { self.audioOn }) else { return }
        self.restartEngine()
      }
      return
    }
    queue.sync { lastAudioAttempt = now }
    engine.inputNode.removeTap(onBus: 0)
    engine.stop()
    let audioSession = AVAudioSession.sharedInstance()
    do {
      try audioSession.setActive(true)
      let format = try installTap(on: engine)
      engine.prepare()
      do {
        try engine.start()
      } catch where inBackground {
        // Apple: starting a mixable recording from the background usually fails. Try once as a
        // non-mixable one, so sound comes back after a phone call even if the user hasn't returned.
        try audioSession.setCategory(.playAndRecord, mode: .videoRecording, options: [])
        try audioSession.setActive(true)
        try engine.start()
      }
      let settings = Self.audioSettings(for: format)
      queue.async { [self] in
        audioSettings = settings
        audioRegained()
      }
    } catch {
      emitError("Sound could not restart: \(error.localizedDescription)")
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
          if !self.queue.sync(execute: { self.audioOn }) { self.restartEngine() }
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
        self.sessionQueue.async { self.restartEngine() }
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
      self.sessionQueue.async {
        if self.isRunning, !self.queue.sync(execute: { self.audioOn }) { self.restartEngine() }
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

  private func setBackground(_ value: Bool) {
    lock.lock()
    backgroundFlag = value
    lock.unlock()
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

  /// iOS interrupted the camera. Raw reasons are AVCaptureSession.InterruptionReason values.
  private func cameraInterrupted(_ raw: Int?) {
    let reason = raw.flatMap { AVCaptureSession.InterruptionReason(rawValue: $0) }
    let name: String
    switch reason {
    case .videoDeviceNotAvailableInBackground: name = "videoDeviceNotAvailableInBackground"
    case .audioDeviceInUseByAnotherClient: name = "audioDeviceInUseByAnotherClient"
    case .videoDeviceInUseByAnotherClient: name = "videoDeviceInUseByAnotherClient"
    case .videoDeviceNotAvailableWithMultipleForegroundApps: name = "videoDeviceNotAvailableWithMultipleForegroundApps"
    case .videoDeviceNotAvailableDueToSystemPressure: name = "videoDeviceNotAvailableDueToSystemPressure"
    default: name = "reason \(raw.map { String($0) } ?? "unknown")"
    }
    let endReason = reason == .videoDeviceNotAvailableInBackground ? "app-left" : "camera-lost"
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

    if let file = video, (pts - file.start).seconds >= config.pieceSeconds {
      video = nil
      continueVideo = (file.clip, file.index + 1)
      close(file, at: pts, reason: "piece-complete", waitForAudio: true)
    }
    if video == nil {
      if videoRetryAt.isValid && pts < videoRetryAt { return }
      video = openVideo(sample)
    }
    guard let file = video, let input = file.videoInput else { return }
    guard input.isReadyForMoreMediaData else {
      file.dropped += 1
      return
    }
    if input.append(sample) {
      file.videoSamples += 1
    } else {
      writerFailed(file)
    }
  }

  private func handleAudio(_ sample: CMSampleBuffer) {
    guard let config, !stopping, audioOn else { return }
    let pts = CMSampleBufferGetPresentationTimeStamp(sample)
    let end = Self.end(of: sample)
    lastAudioArrival = Self.hostNow()
    lastAudioEnd = end
    recentAudio.append(sample)
    let keepFrom = end - CMTime(seconds: Self.recentAudioSeconds, preferredTimescale: 600)
    recentAudio.removeAll { Self.end(of: $0) < keepFrom }

    for file in closing { append(sample, to: file) }
    if let file = video { append(sample, to: file) }

    if let file = sound {
      if let stopAt = soundStopAt, pts >= stopAt {
        sound = nil
        soundStopAt = nil
        close(file, at: stopAt, reason: "video-resumed", waitForAudio: false)
      } else if soundStopAt == nil, (pts - file.start).seconds >= config.pieceSeconds {
        close(file, at: pts, reason: "piece-complete", waitForAudio: false)
        sound = openSound(with: [sample], continuing: file)
      } else {
        append(sample, to: file)
        if let stopAt = soundStopAt, end >= stopAt {
          sound = nil
          soundStopAt = nil
          close(file, at: stopAt, reason: "video-resumed", waitForAudio: false)
        }
      }
    } else if needsSoundOnly() {
      let from = (lastSoundEnd ?? .negativeInfinity) - CMTime(seconds: Self.overlap, preferredTimescale: 600)
      sound = openSound(with: recentAudio.filter { Self.end(of: $0) > from }, continuing: nil)
    }

    for file in closing where file.end.map({ end >= $0 }) ?? true { finish(file) }
  }

  /// Sound on its own is recorded only while video can't be. (`continueVideo` is set while the
  /// next video piece is due with the next frame.)
  private func needsSoundOnly() -> Bool {
    guard audioOn, video == nil, continueVideo == nil else { return false }
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
    if audioOn, lastAudioArrival.isValid, (now - lastAudioArrival).seconds > Self.audioStallSeconds {
      audioLost()
      sessionQueue.async { self.restartEngine() }
    } else if !audioOn, engine != nil, !lastAudioAttempt.isValid || (now - lastAudioAttempt).seconds > Self.audioRetrySeconds {
      // restartEngine notes the attempt.
      sessionQueue.async { self.restartEngine() }
    }
    for file in closing where file.closeRequested.isValid && (now - file.closeRequested).seconds > Self.closeTimeoutSeconds {
      finish(file)
    }
  }

  /// Video has stopped (the app left the screen, or the camera was taken). Sound carries on in a
  /// sound-only file from the next sound that arrives.
  private func endVideoStretch(reason: String, interruption: String?) {
    soundStopAt = nil
    continueVideo = nil
    guard let file = video else { return }
    video = nil
    file.interruption = interruption
    close(file, at: videoEnd(file), reason: reason, waitForAudio: false)
  }

  /// The microphone stopped (a phone call, an alarm, a route change). The current files end, and
  /// video carries on without sound in the next piece.
  private func audioLost() {
    guard audioOn else { return }
    audioOn = false
    recentAudio.removeAll()
    if let file = video, file.audioInput != nil {
      video = nil
      continueVideo = (file.clip, file.index + 1)
      close(file, at: videoEnd(file), reason: "audio-interrupted", waitForAudio: false)
    }
    if let file = sound {
      sound = nil
      soundStopAt = nil
      close(file, at: lastAudioEnd ?? file.start, reason: "audio-interrupted", waitForAudio: false)
    }
    for file in closing { finish(file) }
  }

  /// The microphone is back. A video piece without sound ends, so the next one has sound again.
  private func audioRegained() {
    guard config != nil, !stopping, !audioOn else { return }
    audioOn = true
    lastAudioArrival = Self.hostNow()
    if let file = video, file.audioInput == nil {
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
    let clip = continuing?.clip ?? takeClip()
    let index = continuing?.index ?? 0
    continueVideo = nil
    let gap = lastVideoEnd.map { Self.milliseconds(start - $0) }
    let url = config.outputDir.appendingPathComponent(Self.fileName(clip: clip, index: index, ext: "mov"))
    do {
      let writer = try AVAssetWriter(outputURL: url, fileType: .mov)
      writer.movieFragmentInterval = CMTime(seconds: 10, preferredTimescale: 600)
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
      if audioOn, let settings = audioSettings {
        let input = AVAssetWriterInput(mediaType: .audio, outputSettings: settings)
        input.expectsMediaDataInRealTime = true
        if writer.canAdd(input) {
          writer.add(input)
          audioInput = input
        }
      }
      guard writer.startWriting() else { throw writer.error ?? Failure.cannotWrite("start") }
      writer.startSession(atSourceTime: start)
      let file = OutputFile(
        kind: .video, url: url, marker: markerURL(for: url), writer: writer, videoInput: videoInput,
        audioInput: audioInput, clip: clip, index: index, start: start, startedAt: Self.date(for: start), gapBeforeMs: gap
      )
      writeMarker(file)
      videoStarted = true
      if audioInput != nil {
        // Sound that arrived before this first frame was handed over.
        for buffer in recentAudio { append(buffer, to: file) }
        // Video with sound is back: the sound-only file hands over half a second from now.
        if sound != nil { soundStopAt = start + CMTime(seconds: Self.overlap, preferredTimescale: 600) }
      }
      return file
    } catch {
      // Sound carries on in a sound-only file until a video file can be started again.
      videoRetryAt = start + CMTime(seconds: Self.retrySeconds, preferredTimescale: 600)
      emitError("A video file could not be started: \(error.localizedDescription)")
      return nil
    }
  }

  private func openSound(with buffers: [CMSampleBuffer], continuing previous: OutputFile?) -> OutputFile? {
    guard let config, let settings = audioSettings, let first = buffers.first else { return nil }
    let start = CMSampleBufferGetPresentationTimeStamp(first)
    let clip = previous?.clip ?? takeClip()
    let index = previous.map { $0.index + 1 } ?? 0
    // A next piece counts from the piece before it; a new stretch from the last file with sound.
    let gap: Int? = (previous?.end ?? lastSoundEnd).map { Self.milliseconds(start - $0) }
    let url = config.outputDir.appendingPathComponent(Self.fileName(clip: clip, index: index, ext: "m4a"))
    do {
      let writer = try AVAssetWriter(outputURL: url, fileType: .m4a)
      let input = AVAssetWriterInput(mediaType: .audio, outputSettings: settings)
      input.expectsMediaDataInRealTime = true
      guard writer.canAdd(input) else { throw Failure.cannotWrite("sound track") }
      writer.add(input)
      guard writer.startWriting() else { throw writer.error ?? Failure.cannotWrite("start") }
      writer.startSession(atSourceTime: start)
      let file = OutputFile(
        kind: .audio, url: url, marker: markerURL(for: url), writer: writer, videoInput: nil, audioInput: input,
        clip: clip, index: index, start: start, startedAt: Self.date(for: start), gapBeforeMs: gap
      )
      writeMarker(file)
      for buffer in buffers { append(buffer, to: file) }
      return file
    } catch {
      soundRetryAt = Self.hostNow() + CMTime(seconds: Self.retrySeconds, preferredTimescale: 600)
      emitError("A sound file could not be started: \(error.localizedDescription)")
      return nil
    }
  }

  private func append(_ sample: CMSampleBuffer, to file: OutputFile) {
    guard let input = file.audioInput, file.writer.status == .writing else { return }
    let pts = CMSampleBufferGetPresentationTimeStamp(sample)
    guard Self.end(of: sample) > file.start, pts > file.lastAudioPts else { return }
    if let end = file.end, pts >= end { return }
    guard input.isReadyForMoreMediaData else {
      file.dropped += 1
      return
    }
    if input.append(sample) {
      file.audioSamples += 1
      file.lastAudioPts = pts
    } else {
      writerFailed(file)
    }
  }

  /// Ends a file at `end`. A piece that must still receive sound up to its end waits in `closing`.
  private func close(_ file: OutputFile, at end: CMTime, reason: String, waitForAudio: Bool) {
    file.end = end
    file.endReason = reason
    file.endedAt = Self.date(for: end)
    if file.kind == .video { lastVideoEnd = end }
    if file.audioInput != nil && file.audioSamples > 0, lastSoundEnd.map({ end > $0 }) ?? true { lastSoundEnd = end }
    if waitForAudio && file.audioInput != nil && audioOn {
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
    let hasMedia = file.kind == .video ? file.videoSamples > 0 : file.audioSamples > 0
    if !hasMedia {
      // Nothing was recorded into it: there is nothing to keep.
      if file.writer.status == .writing { file.writer.cancelWriting() }
      try? FileManager.default.removeItem(at: file.url)
      try? FileManager.default.removeItem(at: file.marker)
      return
    }
    guard file.writer.status == .writing else {
      report(file)
      return
    }
    file.writer.endSession(atSourceTime: file.end ?? file.start)
    finishing.enter()
    file.writer.finishWriting { [weak self] in
      guard let self else { return }
      self.queue.async {
        self.report(file)
        self.finishing.leave()
      }
    }
  }

  private func writerFailed(_ file: OutputFile) {
    emitError("Writing \(file.url.lastPathComponent) failed: \(file.writer.error?.localizedDescription ?? "unknown error")")
    if video === file {
      video = nil
      continueVideo = (file.clip, file.index + 1)
    }
    if sound === file {
      sound = nil
      soundStopAt = nil
    }
    let end = file.kind == .video ? videoEnd(file) : (lastAudioEnd ?? file.start)
    close(file, at: end, reason: "error", waitForAudio: false)
  }

  private func report(_ file: OutputFile) {
    let failed = file.writer.status != .completed
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
      "cutoffSafe": file.kind == .video,
      "rotationDegrees": NSNull(),
      "interruption": file.interruption.map { $0 as Any } ?? NSNull(),
      "droppedSamples": file.dropped,
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
      "cutoffSafe": file.kind == .video,
      "rotationDegrees": NSNull(),
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
    emit?("onRecorderError", ["message": message])
  }

  // MARK: - Helpers

  /// Video timestamps on the host clock, which the sound's timestamps use too.
  private func hostTimed(_ sample: CMSampleBuffer) -> CMSampleBuffer? {
    if captureClock == nil { captureClock = capture?.synchronizationClock }
    let host = CMClockGetHostTimeClock()
    guard let clock = captureClock, clock !== host else { return sample }
    var timing = CMSampleTimingInfo(
      duration: CMSampleBufferGetDuration(sample),
      presentationTimeStamp: CMSyncConvertTime(CMSampleBufferGetPresentationTimeStamp(sample), from: clock, to: host),
      decodeTimeStamp: .invalid
    )
    var copy: CMSampleBuffer?
    guard CMSampleBufferCreateCopyWithNewTiming(
      allocator: kCFAllocatorDefault, sampleBuffer: sample, sampleTimingEntryCount: 1, sampleTimingArray: &timing,
      sampleBufferOut: &copy
    ) == noErr else { return nil }
    return copy
  }

  private static func sampleBuffer(_ buffer: AVAudioPCMBuffer, at when: AVAudioTime) -> CMSampleBuffer? {
    let frames = buffer.frameLength
    let rate = buffer.format.sampleRate
    guard frames > 0, rate > 0 else { return nil }
    let pts = when.isHostTimeValid
      ? CMClockMakeHostTimeFromSystemUnits(when.hostTime)
      : hostNow() - CMTime(seconds: Double(frames) / rate, preferredTimescale: 48_000)
    var timing = CMSampleTimingInfo(
      duration: CMTime(value: 1, timescale: CMTimeScale(rate)), presentationTimeStamp: pts, decodeTimeStamp: .invalid
    )
    var sample: CMSampleBuffer?
    guard CMSampleBufferCreate(
      allocator: kCFAllocatorDefault, dataBuffer: nil, dataReady: false, makeDataReadyCallback: nil, refcon: nil,
      formatDescription: buffer.format.formatDescription, sampleCount: CMItemCount(frames), sampleTimingEntryCount: 1,
      sampleTimingArray: &timing, sampleSizeEntryCount: 0, sampleSizeArray: nil, sampleBufferOut: &sample
    ) == noErr, let sample else { return nil }
    guard CMSampleBufferSetDataBufferFromAudioBufferList(
      sample, blockBufferAllocator: kCFAllocatorDefault, blockBufferMemoryAllocator: kCFAllocatorDefault, flags: 0,
      bufferList: buffer.audioBufferList
    ) == noErr else { return nil }
    return sample
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

  private static func hostNow() -> CMTime {
    CMClockGetTime(CMClockGetHostTimeClock())
  }

  private static func date(for time: CMTime) -> Date {
    Date(timeIntervalSinceNow: (time - hostNow()).seconds)
  }

  private static func milliseconds(_ time: CMTime) -> Int {
    let seconds = time.seconds
    return seconds.isFinite ? Int((seconds * 1000).rounded()) : 0
  }

  private static func end(of sample: CMSampleBuffer) -> CMTime {
    CMSampleBufferGetPresentationTimeStamp(sample) + CMSampleBufferGetDuration(sample)
  }
}

/// One file being written: a video piece (with sound when the microphone is on) or a sound-only piece.
private final class OutputFile {
  enum Kind: String {
    case video
    case audio
  }

  let kind: Kind
  let url: URL
  let marker: URL
  let writer: AVAssetWriter
  let videoInput: AVAssetWriterInput?
  let audioInput: AVAssetWriterInput?
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
  var videoSamples = 0
  var audioSamples = 0
  var lastAudioPts = CMTime.negativeInfinity
  var dropped = 0

  init(
    kind: Kind, url: URL, marker: URL, writer: AVAssetWriter, videoInput: AVAssetWriterInput?,
    audioInput: AVAssetWriterInput?, clip: Int, index: Int, start: CMTime, startedAt: Date, gapBeforeMs: Int?
  ) {
    self.kind = kind
    self.url = url
    self.marker = marker
    self.writer = writer
    self.videoInput = videoInput
    self.audioInput = audioInput
    self.clip = clip
    self.index = index
    self.start = start
    self.startedAt = startedAt
    self.gapBeforeMs = gapBeforeMs
  }
}
