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
import java.util.UUID
import org.json.JSONObject

/**
 * The app's own video recorder for Android: Camera2 frames into a MediaRecorder through a
 * persistent input surface. It exists because expo-camera's CameraX recorder writes MP4, whose
 * index is only written when recording stops, so a recording cut off by a crash or forced
 * power-off is unplayable. This recorder writes MPEG-TS (Android 8 and later), which needs no
 * closing index: a cut-off file plays up to the cut. On Android 7 it falls back to MP4 and says so.
 *
 * One recorder serves the evidence camera (one file from start to stop, with a preview) and
 * body-cam mode (one continuous file from start to stop, no preview, run inside BodyCamService so
 * it carries on with the screen off). It writes a marker for each file in `pendingDir` when the
 * file starts and updates it when the file closes, so the app can find and seal a file that was
 * cut off. With `checkpointMillis`, it also fingerprints the file while writing it (Checkpointer)
 * and sends `onCheckpoint` every so often (fix round 1, group 2a).
 */
object CameraRecorder {
  private val PIECE_TOKEN = Any()
  /** A file whose stop failed is kept if it has checkpoints or at least this much (about 1 s of video). */
  private const val KEEP_AFTER_FAILED_STOP_BYTES = 256L * 1024

  /** RFC 3339 in UTC with milliseconds, as the records use. (java.time needs Android 8.) */
  fun iso(millis: Long): String =
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
      .format(Date(millis))

  data class Config(
    val outputDir: File,
    val pendingDir: File,
    /** Pieces: length in milliseconds. Null records one file from start to stop. */
    val pieceMillis: Long?,
    /** 720 or 1080. */
    val quality: Int,
    val clip: Int,
    val mode: String,
    /** Checkpoints every this many milliseconds while writing an MPEG-TS file. Null: none. */
    val checkpointMillis: Long? = null,
    /** Whether files are named as clip and piece in their records (body-cam), even with no pieces. */
    val segmented: Boolean = pieceMillis != null,
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
  /** The front camera's picture turns the other way as the phone turns (fix round 1, group 4). */
  private var front = false
  /** The zoom asked for, as a ratio of the camera's normal view (1.0), within [minZoom, maxZoom]. */
  private var zoomRatio = 1f
  private var minZoom = 1f
  private var maxZoom = 1f
  private var activeArray: android.graphics.Rect? = null
  /** Each open has its own number; a camera that opens after a newer open or a close is closed at once. */
  private var openToken = 0
  private var deviceDegrees = 0
  private var orientationListener: OrientationEventListener? = null

  private var config: Config? = null
  private var recorder: MediaRecorder? = null
  /** Random id of the file being written; its checkpoints and its record carry it. */
  private var currentRecording: String? = null
  @Volatile private var checkpointer: Checkpointer? = null
  private var checkpointThread: HandlerThread? = null
  private var checkpointHandler: Handler? = null
  private var currentFile: File? = null
  private var currentStartedAt: Long? = null
  private var pieceIndex = 0
  private var cutoffSafe = true
  private var lastEndedAt: Long? = null
  private var currentGap: Long? = null
  /** Degrees to turn the picture upright, for MPEG-TS, which has no field for it. Null for MP4. */
  private var currentRotation: Int? = null
  /**
   * Saving mode (round 2, groups 1.5 and 1.6): from 5% battery, each new file is at the same
   * picture size, with a lower video bit rate and 15 frames a second where the camera offers it.
   * The camera's session and the persistent surface stay as they are (owner, 9 Nov 2026: the camera
   * is never rebuilt in the middle of a recording). It ends when the phone is charged; from then
   * the next file is at the normal quality.
   */
  private var lowPower = false
  /** Whether the file being written was started in saving mode: its frame rate stays until it ends. */
  private var fileSaving = false
  private var fpsRanges: Array<android.util.Range<Int>>? = null
  /**
   * Sound only (repair round A, group 2): body-cam has reached the free room the user keeps, video
   * has stopped and the camera is closed, and each new file is sound alone. Until the recording ends.
   */
  private var soundOnlyMode = false
  /** What the file being written holds: "video" (with its sound), or "audio" once sound only. */
  private var currentKind = "video"

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

  /** The first camera facing this way (`"front"` or `"back"`), as the phone lists them. */
  fun cameraIdFor(manager: CameraManager, facing: String): String {
    val wanted = if (facing == "front") CameraCharacteristics.LENS_FACING_FRONT else CameraCharacteristics.LENS_FACING_BACK
    return manager.cameraIdList.firstOrNull { id ->
      manager.getCameraCharacteristics(id).get(CameraCharacteristics.LENS_FACING) == wanted
    } ?: manager.cameraIdList.first()
  }

  /**
   * How far a camera can zoom, as ratios of its normal view: below 1 on phones whose camera can
   * switch to a wider lens by itself (Android 11 and later), else from 1 to its digital zoom.
   */
  fun zoomRange(characteristics: CameraCharacteristics): Pair<Float, Float> {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      characteristics.get(CameraCharacteristics.CONTROL_ZOOM_RATIO_RANGE)?.let { return it.lower to it.upper }
    }
    return 1f to (characteristics.get(CameraCharacteristics.SCALER_AVAILABLE_MAX_DIGITAL_ZOOM) ?: 1f)
  }

  /**
   * Opens the back or front camera. `quality` decides the recording size; the preview, if any,
   * matches it. The front camera can't be switched to during a recording (close and open again).
   */
  @SuppressLint("MissingPermission") // The app asks for CAMERA and RECORD_AUDIO before opening.
  fun open(context: Context, quality: Int, facing: String = "back") {
    appContext = context.applicationContext
    post {
      if (device != null) return@post
      val token = ++openToken
      val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
      val cameraId = cameraIdFor(manager, facing)
      val characteristics = manager.getCameraCharacteristics(cameraId)
      front = characteristics.get(CameraCharacteristics.LENS_FACING) == CameraCharacteristics.LENS_FACING_FRONT
      zoomRange(characteristics).let { (low, high) ->
        minZoom = low
        maxZoom = high
      }
      zoomRatio = 1f.coerceIn(minZoom, maxZoom)
      activeArray = characteristics.get(CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE)
      sensorOrientation = characteristics.get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 90
      val map = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
      val recordSizes = map?.getOutputSizes(MediaRecorder::class.java) ?: emptyArray()
      fpsRanges = characteristics.get(CameraCharacteristics.CONTROL_AE_AVAILABLE_TARGET_FPS_RANGES)
      videoSize = chooseSize(recordSizes, quality)
      makePreviewSurface()

      orientationListener = object : OrientationEventListener(context.applicationContext) {
        override fun onOrientationChanged(orientation: Int) {
          if (orientation != OrientationEventListener.ORIENTATION_UNKNOWN) deviceDegrees = ((orientation + 45) / 90 * 90) % 360
        }
      }.also { it.enable() }

      preparePersistentSurface()
      manager.openCamera(cameraId, object : CameraDevice.StateCallback() {
        override fun onOpened(camera: CameraDevice) {
          if (token != openToken || device != null) {
            // Closed, or switched again, while it was opening.
            camera.close()
            return
          }
          device = camera
          rebuildSession()
          emit("onRecorderReady", mapOf(
            "width" to videoSize.width,
            "height" to videoSize.height,
            "facing" to if (front) "front" else "back",
            "minZoom" to minZoom.toDouble(),
            "maxZoom" to maxZoom.toDouble(),
          ))
        }

        override fun onDisconnected(camera: CameraDevice) {
          if (device !== camera) {
            // A camera from an earlier open: not the one in use.
            camera.close()
            return
          }
          // Another app or the system took the camera (for example, the app left the screen
          // without a foreground service). Close the file cleanly.
          finishCurrent("camera-lost")
          camera.close()
          device = null
        }

        override fun onError(camera: CameraDevice, error: Int) {
          if (device !== camera) {
            camera.close()
            if (token == openToken) emit("onRecorderError", mapOf("message" to "Camera error $error"))
            return
          }
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
      openToken++
      finishCurrent("stopped")
      lowPower = false
      soundOnlyMode = false
      checkpointThread?.quitSafely()
      checkpointThread = null
      checkpointHandler = null
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
      // Saving mode: 15 frames a second from the camera, where it offers a range up to 15, for as
      // long as the file started in saving mode is written.
      if (fileSaving && recorder != null) savingFpsRange()?.let { set(CaptureRequest.CONTROL_AE_TARGET_FPS_RANGE, it) }
      applyZoom(this)
    }.build()
    s.setRepeatingRequest(request, null, handler)
  }

  /** Android 11+: the zoom ratio itself. Before: the centre of the sensor, cropped (digital zoom). */
  private fun applyZoom(builder: CaptureRequest.Builder) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      builder.set(CaptureRequest.CONTROL_ZOOM_RATIO, zoomRatio)
      return
    }
    val area = activeArray ?: return
    if (zoomRatio <= 1f) return
    val width = (area.width() / zoomRatio).toInt()
    val height = (area.height() / zoomRatio).toInt()
    // The crop is measured from the active array's own top left.
    val left = (area.width() - width) / 2
    val top = (area.height() - height) / 2
    @Suppress("DEPRECATION")
    builder.set(CaptureRequest.SCALER_CROP_REGION, android.graphics.Rect(left, top, left + width, top + height))
  }

  /** Zooms, while previewing or recording; clamped to what the camera can do. */
  fun setZoom(ratio: Float) {
    post {
      zoomRatio = ratio.coerceIn(minZoom, maxZoom)
      applyRepeatingRequest()
    }
  }

  /** A frame-rate range that tops out at 15, preferring exactly 15; null if the camera has none. */
  private fun savingFpsRange(): android.util.Range<Int>? {
    val ranges = fpsRanges ?: return null
    return ranges.firstOrNull { it.lower == 15 && it.upper == 15 } ?: ranges.filter { it.upper == 15 }.maxByOrNull { it.lower }
  }

  /**
   * The video bit rate of a new file (round 2, group 1.6). Normal: 3 Mbit/s at 720p, 6 Mbit/s at
   * 1080p. Saving mode: half that, which at 15 frames a second gives each frame the same number of
   * bits as at the normal rate, so each frame is about as sharp as before while the file (and its
   * upload) is half the size. Where the camera has no 15 frames a second, the file stays at its
   * usual rate and each frame gets half the bits.
   */
  private fun videoBitRate(): Int {
    val normal = if (videoSize.height >= 1080) 6_000_000 else 3_000_000
    return if (lowPower) normal / 2 else normal
  }

  /**
   * The frame rate the recorder is told: 15 in saving mode when the camera sends 15 a second (a
   * range that tops out at 15), else 30, the rate the camera then sends. The encoder spreads the
   * bit rate over this many frames, so it must match what the camera really sends.
   */
  private fun videoFrameRate(): Int = if (lowPower && savingFpsRange() != null) 15 else 30

  /**
   * The low-battery handover at 5% (round 2, groups 1.5 and 1.6; bundle format 0.9): the file being
   * written closes cleanly with `reason` and the next file of the same clip starts, on the same
   * path as a piece of fixed length. With `saving`, the new file has a lower bit rate and, where
   * the camera offers it, 15 frames a second (the capture request's frame-rate range). The picture
   * size, the persistent surface and the capture session stay as they are.
   */
  fun handOver(reason: String, saving: Boolean) {
    post {
      if (recorder == null) {
        // Not recording yet (the service's start is still on its way): the first file follows it.
        lowPower = saving
        return@post
      }
      // Saving power must never stop the recording. Whatever fails here, a new file is started
      // (in saving mode if it can be, else at the normal settings) and the camera is sent to it.
      try {
        session?.stopRepeating()
        finishCurrent(reason)
      } catch (e: Exception) {
        // finishCurrent lets go of the recorder before anything in it can throw; the old file's
        // marker is then sealed as cut off when the app next opens.
        emit("onRecorderError", mapOf("message" to "The file before the low-battery handover didn't close cleanly: ${e.message ?: e}"))
      }
      lowPower = saving
      pieceIndex++
      if (recorder == null && config != null) {
        try {
          startFile()
        } catch (e: Exception) {
          emit("onRecorderError", mapOf("message" to "The low-battery handover failed: ${e.message ?: e}"))
          if (recorder == null && lowPower) {
            try {
              lowPower = false
              startFile()
            } catch (again: Exception) {
              emit("onRecorderError", mapOf("message" to "Recording could not carry on after the low-battery handover: ${again.message ?: again}"))
            }
          }
        }
      }
      try {
        applyRepeatingRequest()
      } catch (e: Exception) {
        emit("onRecorderError", mapOf("message" to "The camera couldn't be sent to the new file: ${e.message ?: e}"))
      }
    }
  }

  /** Saving mode on or off (off when the phone is charged): it applies from the next file. */
  fun setSaving(on: Boolean) {
    post { lowPower = on }
  }

  /**
   * Body-cam carries on as sound only (repair round A, group 2; bundle format 0.10): the video file
   * being written closes cleanly with `reason` ("storage-sound-only"), the camera is let go, and
   * the next file of the same clip is sound alone (startSoundFile), in the same foreground service.
   * It stays so until the recording ends. Like the low-battery handover, this must never stop the
   * recording: whatever fails, a sound file is started if one can be.
   */
  fun soundOnly(reason: String) {
    post {
      if (soundOnlyMode) return@post
      soundOnlyMode = true
      // Not recording yet (the service's start is still on its way): the first file is sound.
      if (recorder == null) return@post
      try {
        session?.stopRepeating()
        finishCurrent(reason)
      } catch (e: Exception) {
        emit("onRecorderError", mapOf("message" to "The video file didn't close cleanly before sound only: ${e.message ?: e}"))
      }
      pieceIndex++
      // The camera is not needed any more; closing it also puts out the camera indicator.
      try {
        openToken++
        session?.close()
        session = null
        device?.close()
        device = null
      } catch (e: Exception) {
        emit("onRecorderError", mapOf("message" to "The camera didn't close for sound only: ${e.message ?: e}"))
      }
      if (recorder == null && config != null) {
        try {
          startFile()
        } catch (e: Exception) {
          emit("onRecorderError", mapOf("message" to "Sound-only recording could not start: ${e.message ?: e}"))
        }
      }
    }
  }

  // ---- Recording ------------------------------------------------------------------------------

  fun startRecording(config: Config) {
    post {
      if (recorder != null) return@post
      this.config = config
      // lowPower is not reset here: a handover that came before this start (the battery already at
      // 5%) applies to the first file. It is reset when a recording ends (stopRecording, close).
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
      // The next recording starts at the normal quality: saving mode doesn't carry into it.
      lowPower = false
      soundOnlyMode = false
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
    r.setVideoEncodingBitRate(videoBitRate())
    r.setVideoFrameRate(videoFrameRate())
    r.setVideoSize(videoSize.width, videoSize.height)
    r.setVideoEncoder(MediaRecorder.VideoEncoder.H264)
    r.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
    r.setAudioEncodingBitRate(128_000)
    r.setAudioSamplingRate(44_100)
    r.setAudioChannels(1)
    r.setOrientationHint(rotationHint())
    r.setInputSurface(surface)
    return r
  }

  /**
   * Camera2's formula: the sensor's orientation plus the phone's rotation for the back camera, minus
   * it for the front camera, whose picture turns the other way.
   */
  private fun rotationHint(): Int =
    if (front) (sensorOrientation - deviceDegrees + 360) % 360 else (sensorOrientation + deviceDegrees) % 360

  /**
   * Body-cam carrying on as sound only (repair round A, group 2): one ADTS AAC file, which needs
   * nothing written at the end, so a cut-off file plays up to the cut. Mono, 44.1 kHz, 64 kbit/s,
   * as Pocket recording's on Android. Checkpointed at the end of whole frames.
   */
  private fun startSoundFile(cfg: Config) {
    val context = appContext ?: throw IllegalStateException("No context")
    val file = File(cfg.outputDir, "rec-${System.currentTimeMillis()}-${cfg.clip}-$pieceIndex.aac")
    val r = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) MediaRecorder(context) else @Suppress("DEPRECATION") MediaRecorder()
    val startedAt = try {
      r.setAudioSource(MediaRecorder.AudioSource.MIC)
      r.setOutputFormat(MediaRecorder.OutputFormat.AAC_ADTS)
      r.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
      r.setAudioChannels(1)
      r.setAudioSamplingRate(44_100)
      r.setAudioEncodingBitRate(64_000)
      r.setOutputFile(file.absolutePath)
      r.prepare()
      val at = System.currentTimeMillis()
      r.start()
      at
    } catch (e: Exception) {
      r.release()
      file.delete()
      throw e
    }
    recorder = r
    currentKind = "audio"
    cutoffSafe = true
    currentRotation = null
    fileSaving = false
    currentFile = file
    currentStartedAt = startedAt
    val recording = UUID.randomUUID().toString()
    currentRecording = recording
    val gap = lastEndedAt?.let { startedAt - it }
    currentGap = gap
    writeMarker(cfg, file, startedAt, null, null, gap)
    emit("onRecordingStarted", mapOf(
      "uri" to "file://${file.absolutePath}",
      "kind" to "audio",
      "startedAt" to iso(startedAt),
      "clip" to cfg.clip,
      "index" to pieceIndex,
      "cutoffSafe" to true,
      "rotationDegrees" to null,
      "recording" to recording,
    ))
    val every = cfg.checkpointMillis
    if (every != null) startCheckpoints(Checkpointer(file, adts = true), every, file, recording, startedAt, cfg.clip, pieceIndex, "audio")
  }

  private fun startFile() {
    val cfg = config ?: return
    if (soundOnlyMode) {
      startSoundFile(cfg)
      return
    }
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
    currentRotation = if (useTs) rotationHint() else null
    val startedAt = System.currentTimeMillis()
    r.start()
    recorder = r
    currentKind = "video"
    fileSaving = lowPower
    currentFile = file
    currentStartedAt = startedAt
    val recording = UUID.randomUUID().toString()
    currentRecording = recording
    val gap = lastEndedAt?.let { startedAt - it }
    currentGap = gap
    writeMarker(cfg, file, startedAt, null, null, gap)
    emit("onRecordingStarted", mapOf(
      "uri" to "file://${file.absolutePath}",
      "startedAt" to iso(startedAt),
      "clip" to cfg.clip,
      "index" to pieceIndex,
      "cutoffSafe" to cutoffSafe,
      "rotationDegrees" to currentRotation,
      "recording" to recording,
    ))
    val every = cfg.checkpointMillis
    if (every != null && useTs) startCheckpoints(Checkpointer(file), every, file, recording, startedAt, cfg.clip, pieceIndex, "video")
  }

  // ---- Checkpoints (fix round 1, group 2a) ---------------------------------------------------

  /** Reads the growing file on its own thread, so the camera thread never waits for storage. */
  private fun startCheckpoints(
    tracker: Checkpointer, every: Long, file: File, recording: String, startedAt: Long, clip: Int, index: Int, kind: String,
  ) {
    checkpointer = tracker
    val h = checkpointHandler ?: HandlerThread("SaakshiCheckpoints").let { t ->
      t.start()
      checkpointThread = t
      Handler(t.looper).also { checkpointHandler = it }
    }
    var count = 0
    val tick = object : Runnable {
      override fun run() {
        try {
          // Taken and sent under the tracker's lock, which finish() also takes: a checkpoint is
          // always sent before the file's close event, so it chains before the file's record.
          synchronized(tracker) {
            val snapshot = tracker.checkpoint()
            if (snapshot != null) {
              emit("onCheckpoint", mapOf(
                "recording" to recording,
                "uri" to "file://${file.absolutePath}",
                "kind" to kind,
                "clip" to clip,
                "index" to index,
                "checkpoint" to count,
                "bytes" to snapshot.bytes.toDouble(),
                "sha256" to snapshot.sha256,
                "at" to iso(System.currentTimeMillis()),
                "startedAt" to iso(startedAt),
              ))
              count++
            }
          }
        } catch (e: Exception) {
          // Say so once, and stop checkpointing this file; recording carries on.
          emit("onRecorderError", mapOf("message" to "Checkpoint failed: ${e.message ?: e}"))
          return
        }
        if (checkpointer === tracker) h.postDelayed(this, every)
      }
    }
    h.postDelayed(tick, every)
  }

  /** Stops checkpoints and fingerprints the whole, closed file. Null when there were no checkpoints. */
  private fun finishCheckpoints(file: File?): Checkpointer.Snapshot? {
    val tracker = checkpointer ?: return null
    checkpointer = null
    checkpointHandler?.removeCallbacksAndMessages(null)
    // The TS writer flushes its last packets when it is destroyed, which can be just after
    // MediaRecorder.release() returns: wait until the file stops growing (at most about a second).
    if (file != null) {
      var last = -1L
      for (i in 0 until 20) {
        val now = file.length()
        if (now == last) break
        last = now
        Thread.sleep(50)
      }
    }
    return try {
      tracker.finish()
    } catch (e: Exception) {
      emit("onRecorderError", mapOf("message" to "Final fingerprint failed: ${e.message ?: e}"))
      null
    }
  }

  private fun finishCurrent(reason: String) {
    val r = recorder ?: return
    val file = currentFile
    val startedAt = currentStartedAt
    val recording = currentRecording
    val kind = currentKind
    val hadCheckpoints = checkpointer?.let { it.checkpointsTaken > 0 } ?: false
    recorder = null
    var ok = true
    try {
      r.stop()
    } catch (e: RuntimeException) {
      // Thrown when no data was recorded (stop right after start), and also when the media server
      // died mid-recording (for example, the phone ran out of space). Then what is on disk stays.
      ok = false
    } finally {
      r.release()
    }
    // The writer has closed the file (and flushed its last packets): fingerprint all of it.
    val whole = finishCheckpoints(file)
    val keep = ok || hadCheckpoints || (file?.length() ?: 0L) >= KEEP_AFTER_FAILED_STOP_BYTES
    val endReason = if (ok) reason else "error"
    val endedAt = System.currentTimeMillis()
    lastEndedAt = endedAt
    val cfg = config
    if (file != null && startedAt != null && cfg != null) {
      if (!keep) {
        file.delete()
        File(cfg.pendingDir, "${file.name}.json").delete()
        return
      }
      writeMarker(cfg, file, startedAt, endedAt, endReason, null)
      emit("onRecordingClosed", mapOf(
        "uri" to "file://${file.absolutePath}",
        "kind" to kind,
        "startedAt" to iso(startedAt),
        "endedAt" to iso(endedAt),
        "clip" to cfg.clip,
        "index" to pieceIndex,
        "endReason" to endReason,
        "gapBeforeMs" to currentGap,
        "cutoffSafe" to cutoffSafe,
        "rotationDegrees" to currentRotation,
        "recording" to recording,
        "finalSize" to whole?.bytes?.toDouble(),
        "finalSha256" to whole?.sha256,
      ))
    }
  }

  /** The marker format is shared with the app's JavaScript (src/modules/evidence/locker/pending.ts). */
  private fun writeMarker(cfg: Config, file: File, startedAt: Long, closedAt: Long?, endReason: String?, gapBeforeMs: Long?) {
    val marker = File(cfg.pendingDir, "${file.name}.json")
    val existing = if (marker.exists()) runCatching { JSONObject(marker.readText()) }.getOrNull() else null
    val json = existing ?: JSONObject().apply {
      put("file", "file://${file.absolutePath}")
      put("kind", currentKind)
      put("segment", if (cfg.segmented) JSONObject().put("clip", cfg.clip).put("index", pieceIndex) else JSONObject.NULL)
      put("recording", currentRecording ?: JSONObject.NULL)
      put("startedAt", iso(startedAt))
      put("mode", cfg.mode)
      put("gapBeforeMs", gapBeforeMs ?: JSONObject.NULL)
      put("cutoffSafe", cutoffSafe)
      put("rotationDegrees", currentRotation ?: JSONObject.NULL)
    }
    if (closedAt != null) {
      json.put("closedAt", iso(closedAt))
      json.put("endReason", endReason)
    }
    // Beside, then swapped in one step (repair round A, group 1): a kill or a power cut during
    // this write leaves the old marker or the new one, never an empty file that recovery can't read.
    AtomicFile.write(marker, json.toString().toByteArray())
  }
}
