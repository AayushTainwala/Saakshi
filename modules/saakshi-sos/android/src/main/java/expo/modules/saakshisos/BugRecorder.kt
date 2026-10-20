package expo.modules.saakshisos

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import org.json.JSONObject

/**
 * Bug mode's sound recorder on Android (spec E8): the microphone into AAC with ADTS framing
 * (`.aac`), which needs nothing written at the end, so a piece cut off by a dead battery still
 * plays up to the cut. Pieces are fixed-length and are never joined. Each file gets a crash-recovery
 * marker in the session's `pending/` folder in the format of src/modules/evidence/locker/pending.ts.
 * Runs inside [BugModeService], so it carries on with the screen off.
 */
object BugRecorder {
  data class Config(val outputDir: File, val pendingDir: File, val pieceMillis: Long, val clip: Int)

  private class Piece(val recorder: MediaRecorder, val file: File, val index: Int, val startedAt: Long, val gapBeforeMs: Long?)

  /** Set by the module: receives "onBugPieceClosed" and "onBugRecorderError". */
  @Volatile var listener: ((String, Map<String, Any?>) -> Unit)? = null

  private var thread: HandlerThread? = null
  private var handler: Handler? = null
  private var config: Config? = null
  private var current: Piece? = null
  private var nextIndex = 0
  private var lastEnded: Long? = null

  fun start(context: Context, config: Config) {
    if (thread != null) return
    config.outputDir.mkdirs()
    config.pendingDir.mkdirs()
    this.config = config
    nextIndex = 0
    lastEnded = null
    val t = HandlerThread("SaakshiBugRecorder").apply { start() }
    thread = t
    handler = Handler(t.looper).apply {
      post {
        current = begin(context, config)
        scheduleRotation(context)
      }
    }
  }

  fun stop() {
    val h = handler ?: return
    h.removeCallbacksAndMessages(null)
    h.post {
      current?.let { finish(it, "stopped") }
      current = null
      thread?.quitSafely()
      thread = null
      handler = null
      config = null
    }
  }

  private fun scheduleRotation(context: Context) {
    val cfg = config ?: return
    handler?.postDelayed({
      val old = current ?: return@postDelayed
      // Prepare the next file first, so the gap is only the time the old recorder takes to stop.
      val next = try {
        prepare(context, cfg)
      } catch (error: Exception) {
        emitError("Could not start the next piece: ${error.message}")
        null
      }
      if (next == null) {
        // Keep the current piece running and try again a piece later.
        scheduleRotation(context)
        return@postDelayed
      }
      finish(old, "piece-complete")
      current = startPrepared(next)
      scheduleRotation(context)
    }, cfg.pieceMillis)
  }

  private fun begin(context: Context, cfg: Config): Piece? =
    try {
      startPrepared(prepare(context, cfg))
    } catch (error: Exception) {
      emitError("Could not start recording: ${error.message}")
      null
    }

  private class Prepared(val recorder: MediaRecorder, val file: File, val index: Int)

  private fun prepare(context: Context, cfg: Config): Prepared {
    val index = nextIndex++
    val file = File(cfg.outputDir, "bug-${System.currentTimeMillis()}-$index.aac")
    val recorder = if (Build.VERSION.SDK_INT >= 31) MediaRecorder(context) else @Suppress("DEPRECATION") MediaRecorder()
    recorder.setAudioSource(MediaRecorder.AudioSource.MIC)
    recorder.setOutputFormat(MediaRecorder.OutputFormat.AAC_ADTS)
    recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
    recorder.setAudioChannels(1)
    recorder.setAudioSamplingRate(44_100)
    recorder.setAudioEncodingBitRate(64_000)
    recorder.setOutputFile(file.absolutePath)
    recorder.prepare()
    return Prepared(recorder, file, index)
  }

  private fun startPrepared(prepared: Prepared): Piece {
    val now = System.currentTimeMillis()
    val gap = lastEnded?.let { now - it }
    prepared.recorder.start()
    val piece = Piece(prepared.recorder, prepared.file, prepared.index, now, gap)
    config?.let { writeMarker(it, piece, null, null) }
    return piece
  }

  private fun finish(piece: Piece, reason: String) {
    var endReason = reason
    try {
      piece.recorder.stop()
    } catch (error: RuntimeException) {
      // Stopped with no audio captured, or the system took the microphone.
      endReason = "error"
    }
    piece.recorder.release()
    val endedAt = System.currentTimeMillis()
    lastEnded = endedAt
    val cfg = config ?: return
    if (!piece.file.exists() || piece.file.length() == 0L) {
      piece.file.delete()
      File(cfg.pendingDir, "${piece.file.name}.json").delete()
      return
    }
    writeMarker(cfg, piece, endedAt, endReason)
    listener?.invoke(
      "onBugPieceClosed",
      mapOf(
        "uri" to "file://${piece.file.absolutePath}",
        "clip" to cfg.clip,
        "index" to piece.index,
        "startedAt" to iso(piece.startedAt),
        "endedAt" to iso(endedAt),
        "endReason" to endReason,
        "gapBeforeMs" to piece.gapBeforeMs?.toDouble(),
        "marker" to "${piece.file.name}.json"
      )
    )
  }

  private fun writeMarker(cfg: Config, piece: Piece, closedAt: Long?, endReason: String?) {
    val json = JSONObject().apply {
      put("file", "file://${piece.file.absolutePath}")
      put("kind", "audio")
      put("segment", JSONObject().put("clip", cfg.clip).put("index", piece.index))
      put("startedAt", iso(piece.startedAt))
      put("mode", "bug")
      put("gapBeforeMs", piece.gapBeforeMs ?: JSONObject.NULL)
      put("cutoffSafe", true)
      if (closedAt != null) {
        put("closedAt", iso(closedAt))
        put("endReason", endReason)
      }
    }
    File(cfg.pendingDir, "${piece.file.name}.json").writeText(json.toString())
  }

  private fun emitError(message: String) {
    listener?.invoke("onBugRecorderError", mapOf("message" to message))
  }

  private fun iso(millis: Long): String =
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
      .apply { timeZone = TimeZone.getTimeZone("UTC") }
      .format(Date(millis))
}
