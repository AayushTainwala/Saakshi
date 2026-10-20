package expo.modules.saakshievidence

import android.net.Uri
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SaakshiEvidenceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SaakshiEvidence")

    // Reads the file once and returns its size, SHA-256, SHA-1, MD5 and CRC-32.
    // Runs on the IO dispatcher so a large file doesn't hold up other modules' calls.
    AsyncFunction("hashFile") Coroutine { uri: String ->
      val result = withContext(Dispatchers.IO) { StreamingHasher.hash(fileFromUri(uri)) }
      mapOf(
        "size" to result.size.toDouble(),
        "sha256" to result.sha256,
        "sha1" to result.sha1,
        "md5" to result.md5,
        "crc32" to result.crc32.toDouble()
      )
    }
  }

  private fun fileFromUri(uri: String): File {
    val parsed = Uri.parse(uri)
    val path = if (parsed.scheme == null || parsed.scheme == "file") parsed.path else null
    if (path == null) throw CodedException("ERR_FILE_URI", "Not a local file URI: $uri", null)
    val file = File(path)
    if (!file.isFile) throw CodedException("ERR_FILE_MISSING", "No file at $uri", null)
    return file
  }
}
