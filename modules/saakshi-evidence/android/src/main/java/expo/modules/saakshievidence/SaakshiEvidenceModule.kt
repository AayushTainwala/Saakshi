package expo.modules.saakshievidence

import android.net.Uri
import android.util.Base64
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

    Events("onRecorderReady", "onRecordingStarted", "onRecordingClosed", "onRecorderError")

    OnCreate {
      CameraRecorder.listener = { name, body -> sendEvent(name, body) }
    }

    OnDestroy {
      CameraRecorder.listener = null
    }

    View(RecorderPreviewView::class) {}

    // The app's own recorder (CameraRecorder): MPEG-TS, so a cut-off file stays playable.
    Function("recorderSupported") { true }

    AsyncFunction("recorderOpen") { quality: Int ->
      val context = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "No Android context", null)
      CameraRecorder.open(context, quality)
    }

    AsyncFunction("recorderClose") { CameraRecorder.close() }

    AsyncFunction("recorderStart") { options: Map<String, Any?> ->
      CameraRecorder.startRecording(configFrom(options))
    }

    AsyncFunction("recorderStop") { CameraRecorder.stopRecording() }

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

    // The device key's public part and attestation, or null before it is created.
    AsyncFunction("getDeviceKey") Coroutine { ->
      withContext(Dispatchers.IO) { if (DeviceKey.exists()) DeviceKey.info().toMap() else null }
    }

    AsyncFunction("createDeviceKey") Coroutine { ->
      val context = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "No Android context", null)
      withContext(Dispatchers.IO) { DeviceKey.create(context).toMap() }
    }

    // Android attests when the key is created; this returns that attestation again.
    AsyncFunction("attestDeviceKey") Coroutine { ->
      withContext(Dispatchers.IO) {
        DeviceKey.info().toMap()["attestation"]
          ?: throw CodedException("ERR_NO_ATTESTATION", "This phone gave no key attestation", null)
      }
    }

    // Signs the UTF-8 bytes of [message] with the device key; returns the DER signature in Base64.
    AsyncFunction("signUtf8") Coroutine { message: String ->
      withContext(Dispatchers.IO) {
        Base64.encodeToString(DeviceKey.sign(message.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
      }
    }
  }

  private fun configFrom(options: Map<String, Any?>): CameraRecorder.Config {
    fun dir(key: String): File {
      val value = options[key] as? String ?: throw CodedException("ERR_OPTIONS", "Missing $key", null)
      return File(Uri.parse(value).path ?: value)
    }
    return CameraRecorder.Config(
      outputDir = dir("outputDir"),
      pendingDir = dir("pendingDir"),
      pieceMillis = (options["pieceSeconds"] as? Number)?.let { (it.toDouble() * 1000).toLong() },
      quality = (options["quality"] as? Number)?.toInt() ?: 720,
      clip = (options["clip"] as? Number)?.toInt() ?: 0,
      mode = options["mode"] as? String ?: "camera",
    )
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
