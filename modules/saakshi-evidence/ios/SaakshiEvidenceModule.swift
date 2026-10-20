import ExpoModulesCore

public class SaakshiEvidenceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SaakshiEvidence")

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
  }
}
