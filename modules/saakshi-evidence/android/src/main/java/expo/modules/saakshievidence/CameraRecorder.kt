package expo.modules.saakshievidence

import android.annotation.SuppressLint
import android.content.Context
import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraDevice
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CaptureRequest
import android.media.MediaCodec
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.util.Size
import android.view.OrientationEventListener
import android.view.Surface
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import org.json.JSONObject

/**
 * The app's own video recorder for Android: Camera2 frames into a MediaRecorder through a
 * persistent input surface. It exists because expo-camera's CameraX recorder writes MP4, whose
 * index is only written when recording stops, so a recording cut off by a crash or forced
 * power-off is unplayable. This recorder writes MPEG-TS (Android 8 and later), which needs no
 * closing index: a cut-off file plays up to the cut. On Android 7 it falls back to MP4 and says so.
 *
 * One recorder serves the evidence camera (one file from start to stop, with a preview) and
 * body-cam mode (fixed pieces, no preview, run inside BodyCamService so it carries on with the
 * screen off). It writes a marker for each file in `pendingDir` when the file starts and updates
 * it when the file closes, so the app can find and seal a file that was cut off.
 */
object CameraRecorder {
  private val PIECE_TOKEN = Any()

  /** RFC 3339 in UTC with milliseconds, as the records use. (java.time needs Android 8.) */
  fun iso(millis: Long): String =
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
      .format(Date(millis))

  data class Config(
    val outputDir: File,
    val pendingDir: File,
    /** Body-cam pieces: length in milliseconds. Null records one file from start to stop. */
    val pieceMillis: Long?,
    /** 720 or 1080. */
    val quality: Int,
    val clip: Int,
    val mode: String,
  )

  /** Event name and body, forwarded to JavaScript by the module. */
  var listener: ((String, Map<String, Any?>) -> Unit)? = null

  private var thread: HandlerThread? = null
  private var handler: Handler? = null
  private var appContext: Context? = null
  private var device: CameraDevice? = null
  private var session: CameraCaptureSession? = null
  private var previewTexture: android.graphics.SurfaceTexture? = null
  private var previewSurface: Surface? = null
  private var onPreviewSize: ((Size) -> Unit)? = null
  private var persistentSurface: Surface? = null
  private var videoSize: Size = Size(1280, 720)
  private var sensorOrientation = 90
  private var deviceDegrees = 0
  private var orientationListener: OrientationEventListener? = null

  private var config: Config? = null
  private var recorder: MediaRecorder? = null
  private var currentFile: File? = null
  private var currentStartedAt: Long? = null
  private var pieceIndex = 0
  private var cutoffSafe = true
  private var lastEndedAt: Long? = null
  private var currentGap: Long? = null

  val isRecording: Boolean get() = recorder != null
  val isOpen: Boolean get() = device != null

  private fun emit(name: String, body: Map<String, Any?>) {
    listener?.invoke(name, body)
  }

  /** The camera thread, started on first use (the preview can arrive before the camera opens). */
  @Synchronized
  private fun cameraHandler(): Handler {
    handler?.let { return it }
    val t = HandlerThread("SaakshiCamera").also { it.start() }
    thread = t
    return Handler(t.looper).also { handler = it }
  }

  private fun post(block: () -> Unit) {
    cameraHandler().post {
      try {
        block()
      } catch (e: Exception) {
        emit("onRecorderError", mapOf("message" to (e.message ?: e.toString())))
      }
    }
  }

  // ---- Camera ---------------------------------------------------------------------------------

  /** Opens the back camera. `quality` decides the recording size; the preview, if any, matches it. */
  @SuppressLint("MissingPermission") // The app asks for CAMERA and RECORD_AUDIO before opening.
  fun open(context: Context, quality: Int) {
    appContext = context.applicationContext
    post {
      if (device != null) return@post
      val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
      val cameraId = manager.cameraIdList.firstOrNull { id ->
        manager.getCameraCharacteristics(id).get(CameraCharacteristics.LENS_FACING) ==
          CameraCharacteristics.LENS_FACING_BACK
      } ?: manager.cameraIdList.first()
      val characteristics = manager.getCameraCharacteristics(cameraId)
      sensorOrientation = characteristics.get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 90
      val map = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
      videoSize = chooseSize(map?.getOutputSizes(MediaRecorder::class.java) ?: emptyArray(), quality)
      makePreviewSurface()

      orientationListener = object : OrientationEventListener(context.applicationContext) {
        override fun onOrientationChanged(orientation: Int) {
          if (orientation != ORIENTATION_UNKNOWN) deviceDegrees = ((orientation + 45) / 90 * 90) % 360
        }
      }.also { it.enable() }

      preparePersistentSurface()
      manager.openCamera(cameraId, object : CameraDevice.StateCallback() {
        override fun onOpened(camera: CameraDevice) {
          device = camera
          rebuildSession()
          emit("onRecorderReady", mapOf("width" to videoSize.width, "height" to videoSize.height))
        }

        override fun onDisconnected(camera: CameraDevice) {
          // Another app or the system took the camera (for example, the app left the screen
          // without a foreground service). Close the file cleanly.
          finishCurrent("camera-lost")
          camera.close()
          device = null
        }

        override fun onError(camera: CameraDevice, error: Int) {
          finishCurrent("error")
          camera.close()
          device = null
          emit("onRecorderError", mapOf("message" to "Camera error $error"))
        }
      }, handler)
    }
  }

  fun close() {
    post {
      finishCurrent("stopped")
      session?.close()
      session = null
      device?.close()
      device = null
      orientationListener?.disable()
      orientationListener = null
      previewSurface?.release()
      previewSurface = null
      previewTexture = null
      onPreviewSize = null
      persistentSurface?.release()
      persistentSurface = null
    }
  }

  /**
   * Shows the preview in [texture], or none when null (body-cam mode, or the view went away).
   * [onSize] is called on the camera thread with the recording size, now and whenever it changes.
   */
  fun setPreview(texture: android.graphics.SurfaceTexture?, onSize: ((Size) -> Unit)? = null) {
    post {
      previewTexture = texture
      onPreviewSize = if (texture != null) onSize else null
      makePreviewSurface()
      if (device != null) rebuildSession()
    }
  }

  /** (Re)creates the preview surface at the recording size. */
  private fun makePreviewSurface() {
    previewSurface?.release()
    previewSurface = previewTexture?.let {
      it.setDefaultBufferSize(videoSize.width, videoSize.height)
      Surface(it)
    }
    if (previewSurface != null) onPreviewSize?.invoke(videoSize)
  }

  private fun chooseSize(sizes: Array<Size>, quality: Int): Size {
    val target = if (quality >= 1080) Size(1920, 1080) else Size(1280, 720)
    sizes.firstOrNull { it.width == target.width && it.height == target.height }?.let { return it }
    val wide = sizes.filter { it.width * 9 == it.height * 16 && it.width <= target.width }
    return wide.maxByOrNull { it.width } ?: sizes.filter { it.width <= target.width }.maxByOrNull { it.width } ?: target
  }

  /**
   * A persistent input surface outlives each MediaRecorder, so body-cam pieces can switch files
   * without rebuilding the capture session. A throwaway recorder sizes its buffers first, as the
   * Camera2Video sample does.
   */
  private fun preparePersistentSurface() {
    if (persistentSurface != null) return
    val surface = MediaCodec.createPersistentInputSurface()
    val dummy = File(appContext!!.cacheDir, "saakshi-recorder-probe")
    val probe = newRecorder(surface, dummy, useTs = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
    try {
      probe.prepare()
    } catch (e: Exception) {
      newRecorder(surface, dummy, useTs = false).apply { prepare(); release() }
    } finally {
      probe.release()
      dummy.delete()
    }
    persistentSurface = surface
  }

  @Suppress("DEPRECATION")
  private fun rebuildSession() {
    val camera = device ?: return
    session?.close()
    session = null
    val outputs = listOfNotNull(previewSurface, persistentSurface)
    if (outputs.isEmpty()) return
    camera.createCaptureSession(outputs, object : CameraCaptureSession.StateCallback() {
      override fun onConfigured(s: CameraCaptureSession) {
        session = s
        applyRepeatingRequest()
      }

      override fun onConfigureFailed(s: CameraCaptureSession) {
        emit("onRecorderError", mapOf("message" to "Could not configure the camera"))
      }
    }, handler)
  }

  private fun applyRepeatingRequest() {
    val s = session ?: return
    val camera = device ?: return
    val targets = listOfNotNull(previewSurface, if (recorder != null) persistentSurface else null)
    if (targets.isEmpty()) {
      s.stopRepeating()
      return
    }
    val template = if (recorder != null) CameraDevice.TEMPLATE_RECORD else CameraDevice.TEMPLATE_PREVIEW
    val request = camera.createCaptureRequest(template).apply {
      targets.forEach { addTarget(it) }
      set(CaptureRequest.CONTROL_MODE, CaptureRequest.CONTROL_MODE_AUTO)
      set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_VIDEO)
    }.build()
    s.setRepeatingRequest(request, null, handler)
  }

  // ---- Recording ------------------------------------------------------------------------------

  fun startRecording(config: Config) {
    post {
      if (recorder != null) return@post
      this.config = config
      pieceIndex = 0
      lastEndedAt = null
      config.outputDir.mkdirs()
      config.pendingDir.mkdirs()
      startFile()
      applyRepeatingRequest()
      schedulePiece()
    }
  }

  fun stopRecording() {
    post {
      handler?.removeCallbacksAndMessages(PIECE_TOKEN)
      finishCurrent("stopped")
      applyRepeatingRequest()
      config = null
    }
  }

  private fun schedulePiece() {
    val millis = config?.pieceMillis ?: return
    handler?.postAtTime({
      try {
        rotatePiece()
      } catch (e: Exception) {
        emit("onRecorderError", mapOf("message" to (e.message ?: e.toString())))
      }
    }, PIECE_TOKEN, android.os.SystemClock.uptimeMillis() + millis)
  }

  private fun rotatePiece() {
    if (recorder == null) return
    session?.stopRepeating()
    finishCurrent("piece-complete")
    pieceIndex++
    startFile()
    applyRepeatingRequest()
    schedulePiece()
  }

  private fun newRecorder(surface: Surface, file: File, useTs: Boolean): MediaRecorder {
    val r = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) MediaRecorder(appContext!!) else @Suppress("DEPRECATION") MediaRecorder()
    r.setAudioSource(MediaRecorder.AudioSource.CAMCORDER)
    r.setVideoSource(MediaRecorder.VideoSource.SURFACE)
    if (useTs && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      r.setOutputFormat(MediaRecorder.OutputFormat.MPEG_2_TS)
    } else {
      r.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
    }
    r.setOutputFile(file.absolutePath)
    r.setVideoEncodingBitRate(if (videoSize.height >= 1080) 6_000_000 else 3_000_000)
    r.setVideoFrameRate(30)
    r.setVideoSize(videoSize.width, videoSize.height)
    r.setVideoEncoder(MediaRecorder.VideoEncoder.H264)
    r.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
    r.setAudioEncodingBitRate(128_000)
    r.setAudioSamplingRate(44_100)
    r.setAudioChannels(1)
    r.setOrientationHint((sensorOrientation + deviceDegrees) % 360)
    r.setInputSurface(surface)
    return r
  }

  private fun startFile() {
    val cfg = config ?: return
    val surface = persistentSurface ?: throw IllegalStateException("Camera is not open")
    val stamp = System.currentTimeMillis()
    var useTs = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
    var file = File(cfg.outputDir, "rec-$stamp-${cfg.clip}-$pieceIndex.${if (useTs) "ts" else "mp4"}")
    var r = newRecorder(surface, file, useTs)
    try {
      r.prepare()
    } catch (e: Exception) {
      // Some phones may refuse MPEG-TS. Record anyway, as MP4, and say the file is not cut-off safe.
      r.release()
      if (!useTs) throw e
      useTs = false
      file = File(cfg.outputDir, "rec-$stamp-${cfg.clip}-$pieceIndex.mp4")
      r = newRecorder(surface, file, false)
      r.prepare()
    }
    cutoffSafe = useTs
    val startedAt = System.currentTimeMillis()
    r.start()
    recorder = r
    currentFile = file
    currentStartedAt = startedAt
    val gap = lastEndedAt?.let { startedAt - it }
    currentGap = gap
    writeMarker(cfg, file, startedAt, null, null, gap)
    emit("onRecordingStarted", mapOf(
      "uri" to "file://${file.absolutePath}",
      "startedAt" to iso(startedAt),
      "clip" to cfg.clip,
      "index" to pieceIndex,
      "cutoffSafe" to cutoffSafe,
    ))
  }

  private fun finishCurrent(reason: String) {
    val r = recorder ?: return
    val file = currentFile
    val startedAt = currentStartedAt
    recorder = null
    var ok = true
    try {
      r.stop()
    } catch (e: RuntimeException) {
      // Thrown when no data was recorded (stop right after start). The file is unusable.
      ok = false
    } finally {
      r.release()
    }
    val endedAt = System.currentTimeMillis()
    lastEndedAt = endedAt
    val cfg = config
    if (file != null && startedAt != null && cfg != null) {
      if (!ok) {
        file.delete()
        File(cfg.pendingDir, "${file.name}.json").delete()
        return
      }
      writeMarker(cfg, file, startedAt, endedAt, reason, null)
      emit("onRecordingClosed", mapOf(
        "uri" to "file://${file.absolutePath}",
        "startedAt" to iso(startedAt),
        "endedAt" to iso(endedAt),
        "clip" to cfg.clip,
        "index" to pieceIndex,
        "endReason" to reason,
        "gapBeforeMs" to currentGap,
        "cutoffSafe" to cutoffSafe,
      ))
    }
  }

  /** The marker format is shared with the app's JavaScript (src/modules/evidence/locker/pending.ts). */
  private fun writeMarker(cfg: Config, file: File, startedAt: Long, closedAt: Long?, endReason: String?, gapBeforeMs: Long?) {
    val marker = File(cfg.pendingDir, "${file.name}.json")
    val existing = if (marker.exists()) runCatching { JSONObject(marker.readText()) }.getOrNull() else null
    val json = existing ?: JSONObject().apply {
      put("file", "file://${file.absolutePath}")
      put("kind", "video")
      put("segment", if (cfg.pieceMillis != null) JSONObject().put("clip", cfg.clip).put("index", pieceIndex) else JSONObject.NULL)
      put("startedAt", iso(startedAt))
      put("mode", cfg.mode)
      put("gapBeforeMs", gapBeforeMs ?: JSONObject.NULL)
      put("cutoffSafe", cutoffSafe)
    }
    if (closedAt != null) {
      json.put("closedAt", iso(closedAt))
      json.put("endReason", endReason)
    }
    marker.writeText(json.toString())
  }
}
