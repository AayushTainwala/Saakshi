import ExpoModulesCore

public class SaakshiEvidenceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SaakshiEvidence")

    // The Android recorder (CameraRecorder.kt). On iPhone, expo-camera's AVCaptureMovieFileOutput
    // already writes movie fragments every 10 seconds, so its files survive a cut-off.
    Function("recorderSupported") { false }

    Events("onVolumeDown", "onRecordingClosed", "onRecorderError")

    OnCreate {
      VolumeButtons.shared.onVolumeDown = { [weak self] in self?.sendEvent("onVolumeDown", [:]) }
      BodyCamRecorder.shared.emit = { [weak self] name, body in
        self?.sendEvent(name, body.mapValues { $0 as Any? })
      }
    }

    AsyncFunction("volumeKeysStart") {
      VolumeButtons.shared.start()
    }.runOnQueue(.main)

    AsyncFunction("volumeKeysStop") {
      VolumeButtons.shared.stop()
    }.runOnQueue(.main)

    AsyncFunction("setScreenDimmed") { (dimmed: Bool) in
      ScreenDimmer.set(dimmed: dimmed)
    }.runOnQueue(.main)

    // Body-cam mode on iPhone: the app's own recorder (BodyCamRecorder.swift). Video and sound go
    // into the same file while Saakshi is on screen; sound carries on alone while it can't be.
    Function("bodyCamRunning") { BodyCamRecorder.shared.isRunning }

    AsyncFunction("bodyCamStart") { (options: BodyCamStartOptions, promise: Promise) in
      guard let outputDir = URL(string: options.outputDir), outputDir.isFileURL,
        let pendingDir = URL(string: options.pendingDir), pendingDir.isFileURL
      else {
        promise.reject("ERR_BODYCAM_OPTIONS", "outputDir and pendingDir must be file:// URIs")
        return
      }
      let config = BodyCamRecorder.Config(
        outputDir: outputDir,
        pendingDir: pendingDir,
        pieceSeconds: max(options.pieceSeconds, 10),
        quality: options.quality,
        firstClip: options.clip,
        mode: options.mode
      )
      BodyCamRecorder.shared.start(config) { error in
        if let error {
          promise.reject("ERR_BODYCAM_START", error.localizedDescription)
        } else {
          promise.resolve()
        }
      }
    }

    // Resolves once every file is closed, with the onRecordingClosed events of those closed by
    // the stop (they are also sent as events).
    AsyncFunction("bodyCamStop") { (promise: Promise) in
      BodyCamRecorder.shared.stop { events in promise.resolve(events as Any) }
    }

    // iPhone recordings are already QuickTime files that play everywhere; no copy is made.
    AsyncFunction("remuxToMp4") { (_: String, _: String, _: Int?) -> String in
      throw Exception(name: "ERR_UNSUPPORTED", description: "Remuxing is only needed for Android recordings")
    }

    // Reads the file once and returns its size, SHA-256, SHA-1, MD5 and CRC-32.
    // Runs in a detached task so a large file doesn't hold up the module's queue.
    AsyncFunction("hashFile") { (uri: URL) async throws -> [String: Any] in
      guard uri.isFileURL else {
        throw Exception(name: "ERR_FILE_URI", description: "Not a local file URI: \(uri)")
      }
      let result = try await Task.detached(priority: .userInitiated) {
        try StreamingHasher.hash(fileAt: uri)
      }.value
      return [
        "size": Double(result.size),
        "sha256": result.sha256,
        "sha1": result.sha1,
        "md5": result.md5,
        "crc32": Double(result.crc32),
      ]
    }

    // The device key's public part, or null before it is created. The App Attest result is kept by
    // the app (device-key.json), so `attestation` is always null here.
    AsyncFunction("getDeviceKey") { () throws -> DeviceKeyRecord? in
      try DeviceKey.current()
    }

    AsyncFunction("createDeviceKey") { () throws -> DeviceKeyRecord in
      try DeviceKey.create()
    }

    AsyncFunction("attestDeviceKey") { () async throws -> [String: String] in
      try await DeviceKey.attest()
    }

    // Signs the UTF-8 bytes of `message` with the device key; returns the DER signature in Base64.
    AsyncFunction("signUtf8") { (message: String) throws -> String in
      try DeviceKey.sign(Data(message.utf8)).base64EncodedString()
    }
  }
}

/// What JavaScript passes to `bodyCamStart` (BodyCamOptions in SaakshiEvidence.types.ts). The
/// notification texts are Android's and are ignored here.
struct BodyCamStartOptions: Record {
  @Field var outputDir: String = ""
  @Field var pendingDir: String = ""
  @Field var pieceSeconds: Double = 60
  @Field var quality: Int = 720
  @Field var clip: Int = 0
  @Field var mode: String = "body-cam"
}
