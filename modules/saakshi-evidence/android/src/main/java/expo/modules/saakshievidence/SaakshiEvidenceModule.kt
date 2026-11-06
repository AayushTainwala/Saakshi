package expo.modules.saakshievidence

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.view.WindowManager
import android.util.Base64
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SaakshiEvidenceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SaakshiEvidence")

    Events("onRecorderReady", "onRecordingStarted", "onRecordingClosed", "onRecorderError", "onVolumeUp", "onCheckpoint")

    OnCreate {
      CameraRecorder.listener = { name, body -> sendEvent(name, body) }
      VolumeKeys.onVolumeUp = { sendEvent("onVolumeUp", emptyMap<String, Any>()) }
    }

    OnDestroy {
      CameraRecorder.listener = null
      VolumeKeys.onVolumeUp = null
    }

    // Body-cam mode: recording in a foreground service, so it carries on with the screen off.
    AsyncFunction("bodyCamStart") { options: Map<String, Any?> ->
      val context = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "No Android context", null)
      val config = configFrom(options)
      val intent = Intent(context, BodyCamService::class.java).apply {
        action = BodyCamService.ACTION_START
        putExtra(BodyCamService.EXTRA_OUTPUT_DIR, config.outputDir.absolutePath)
        putExtra(BodyCamService.EXTRA_PENDING_DIR, config.pendingDir.absolutePath)
        putExtra(BodyCamService.EXTRA_PIECE_MILLIS, config.pieceMillis ?: 0L)
        putExtra(BodyCamService.EXTRA_CHECKPOINT_MILLIS, config.checkpointMillis ?: 0L)
        putExtra(BodyCamService.EXTRA_QUALITY, config.quality)
        putExtra(BodyCamService.EXTRA_CLIP, config.clip)
        putExtra(BodyCamService.EXTRA_TITLE, options["notificationTitle"] as? String)
        putExtra(BodyCamService.EXTRA_TEXT, options["notificationText"] as? String)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
    }

    AsyncFunction("bodyCamStop") {
      appContext.reactContext?.takeIf { BodyCamService.running }?.let { context ->
        context.startService(Intent(context, BodyCamService::class.java).apply { action = BodyCamService.ACTION_STOP })
      }
      Unit
    }

    Function("bodyCamRunning") { BodyCamService.running }

    // The low-battery handover at 5% (round 2, group 1.5): the file being written closes as
    // "low-battery" and a new one continues; with `saving`, at 480p and 15 frames a second.
    AsyncFunction("bodyCamHandOver") { reason: String, saving: Boolean ->
      CameraRecorder.handOver(reason, saving)
    }

    // Saving mode off (the phone is charging): the next file is at the normal quality.
    AsyncFunction("bodyCamSetSaving") { saving: Boolean ->
      CameraRecorder.setSaving(saving)
    }

    // iPhone only: Pocket recording's handover is in the saakshi-sos module on Android.
    AsyncFunction("soundHandOver") { _: String -> Unit }

    // Android: an MP4 copy of an MPEG-TS recording, made without re-encoding (spec decision of 22 Oct).
    AsyncFunction("remuxToMp4") Coroutine { input: String, output: String, rotationDegrees: Int? ->
      withContext(Dispatchers.IO) {
        val source = fileFromUri(input)
        val target = File(Uri.parse(output).path ?: output)
        target.parentFile?.mkdirs()
        Remuxer.tsToMp4(source, target, rotationDegrees)
        "file://${target.absolutePath}"
      }
    }

    // A record's files joined into one MP4 copy for sharing, without re-encoding (fix round 1,
    // group 3). `request` is JoinRequest from src/modules/evidence/export/joinedCopy.ts.
    AsyncFunction("joinToMp4") Coroutine { request: Map<String, Any?> ->
      withContext(Dispatchers.IO) {
        fun segments(key: String): List<Remuxer.Segment> =
          (request[key] as? List<*>).orEmpty().mapNotNull { entry ->
            val segment = entry as? Map<*, *> ?: return@mapNotNull null
            val uri = segment["uri"] as? String ?: return@mapNotNull null
            fun micros(name: String) = (((segment[name] as? Number)?.toDouble() ?: 0.0) * 1_000_000).toLong()
            Remuxer.Segment(fileFromUri(uri), micros("at"), micros("from"), micros("length"))
          }
        val output = request["output"] as? String ?: throw CodedException("ERR_JOIN", "No output", null)
        val target = File(Uri.parse(output).path ?: output)
        val joined = Remuxer.join(segments("video"), segments("audio"), target, (request["rotationDegrees"] as? Number)?.toInt())
        mapOf(
          "uri" to "file://${target.absolutePath}",
          "reencoded" to false,
          "placedVideo" to joined.placedVideo,
          "placedAudio" to joined.placedAudio,
        )
      }
    }

    // Volume-up presses while body-cam mode's lock screen or unlock practice shows (the screen is on).
    AsyncFunction("volumeKeysStart") {
      appContext.currentActivity?.let { VolumeKeys.enable(it) }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("volumeKeysStop") {
      VolumeKeys.disable()
    }.runOnQueue(Queues.MAIN)

    // Dims only this app's screen (no system setting changes, so no WRITE_SETTINGS permission).
    AsyncFunction("setScreenDimmed") { dimmed: Boolean ->
      val window = appContext.currentActivity?.window ?: return@AsyncFunction
      window.attributes = window.attributes.apply {
        screenBrightness = if (dimmed) 0.01f else WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
      }
    }.runOnQueue(Queues.MAIN)

    View(RecorderPreviewView::class) {}

    // The app's own recorder (CameraRecorder): MPEG-TS, so a cut-off file stays playable.
    Function("recorderSupported") { true }

    AsyncFunction("recorderOpen") { quality: Int, facing: String? ->
      val context = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "No Android context", null)
      CameraRecorder.open(context, quality, facing ?: "back")
    }

    // Zoom, as a ratio of the camera's normal view (fix round 1, group 4).
    AsyncFunction("recorderSetZoom") { ratio: Double -> CameraRecorder.setZoom(ratio.toFloat()) }

    // How far the camera facing this way can zoom, for expo-camera's photos (its zoom prop runs from
    // 1x at 0 to this maximum at 1, in a straight line).
    AsyncFunction("cameraZoomRange") { facing: String ->
      val context = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "No Android context", null)
      val manager = context.getSystemService(android.content.Context.CAMERA_SERVICE) as android.hardware.camera2.CameraManager
      val (low, high) = CameraRecorder.zoomRange(manager.getCameraCharacteristics(CameraRecorder.cameraIdFor(manager, facing)))
      mapOf("min" to low.toDouble(), "max" to high.toDouble())
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
      checkpointMillis = (options["checkpointSeconds"] as? Number)?.let { (it.toDouble() * 1000).toLong() },
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
