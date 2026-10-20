import ExpoModulesCore

public class SaakshiEvidenceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SaakshiEvidence")

    // The Android recorder (CameraRecorder.kt). On iPhone, expo-camera's AVCaptureMovieFileOutput
    // already writes movie fragments every 10 seconds, so its files survive a cut-off.
    Function("recorderSupported") { false }

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
