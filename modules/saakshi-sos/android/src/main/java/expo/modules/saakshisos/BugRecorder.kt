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
import java.util.UUID
import org.json.JSONObject

/**
 * Bug mode's sound recorder on Android (spec E8): the microphone into AAC with ADTS framing
 * (`.aac`), which needs nothing written at the end, so a file cut off by a dead battery still plays
 * up to the cut.
 *
 * One continuous file from Start to Stop (owner's decision, fix round 1, as for body-cam). While
 * it is written, [AdtsCheckpointer] fingerprints it about every `checkpointMillis` and each
 * checkpoint is sent as "onBugCheckpoint", to be signed into the session's chain. A new file
 * starts only as a fail-safe: when MediaRecorder reports an error. Each file has a random
 * `recording` id, which its checkpoints and its record carry, and a crash-recovery marker in the
 * session's `pending/` folder in the format of src/modules/evidence/locker/pending.ts. Runs inside
 * [BugModeService], so it carries on with the screen off.
 *
 * Everything happens on one thread, so a file's checkpoints are always sent before its
 * "onBugPieceClosed", and nothing is checkpointed after it closes.
 */
object BugRecorder {
  data class Config(val outputDir: File, val pendingDir: File, val checkpointMillis: Long, val clip: Int)

  private class Piece(
    val recorder: MediaRecorder,
    val file: File,
    val index: Int,
    val startedAt: Long,
    val gapBeforeMs: Long?,
    val recording: String,
    val checkpointer: AdtsCheckpointer,
  ) {
    var checkpointing = true
  }

  /** Set by the module: receives "onBugCheckpoint", "onBugPieceClosed", "onBugRecorderError" and "onBugRecorderStopped". */
  @Volatile var listener: ((String, Map<String, Any?>) -> Unit)? = null

  private var thread: HandlerThread? = null
  private var handler: Handler? = null
  private var config: Config? = null
  private var current: Piece? = null
  private var nextIndex = 0
  private var lastEnded: Long? = null
  private var context: Context? = null

  fun start(context: Context, config: Config) {
    if (thread != null) return
    config.outputDir.mkdirs()
    config.pendingDir.mkdirs()
    this.config = config
    this.context = context.applicationContext
    nextIndex = 0
    lastEnded = null
    val t = HandlerThread("SaakshiBugRecorder").apply { start() }
    thread = t
    handler = Handler(t.looper).apply { post { begin() } }
  }

  fun stop() {
    val h = handler ?: return
    h.removeCallbacksAndMessages(null)
    h.post {
      current?.let { finish(it, "stopped", byStop = true) }
      current = null
      emit("onBugRecorderStopped", emptyMap())
      thread?.quitSafely()
      thread = null
      handler = null
      config = null
      context = null
    }
  }

  /** Starts a file; if it can't start, tries again in a few seconds, until Stop. */
  private fun begin() {
    val cfg = config ?: return
    val ctx = context ?: return
    current = try {
      startPiece(ctx, cfg)
    } catch (error: Exception) {
      emit("onBugRecorderError", mapOf("message" to "Could not start recording: ${error.message}"))
      handler?.postDelayed({ if (current == null) begin() }, RETRY_MILLIS)
      null
    }
  }

  private fun startPiece(context: Context, cfg: Config): Piece {
    val index = nextIndex++
    val file = File(cfg.outputDir, "bug-${cfg.clip}-$index-${System.currentTimeMillis()}.aac")
    val recorder = if (Build.VERSION.SDK_INT >= 31) MediaRecorder(context) else @Suppress("DEPRECATION") MediaRecorder()
    try {
      recorder.setAudioSource(MediaRecorder.AudioSource.MIC)
      recorder.setOutputFormat(MediaRecorder.OutputFormat.AAC_ADTS)
      recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
      recorder.setAudioChannels(1)
      recorder.setAudioSamplingRate(44_100)
      recorder.setAudioEncodingBitRate(64_000)
      recorder.setOutputFile(file.absolutePath)
      recorder.prepare()
      recorder.start()
    } catch (error: Exception) {
      recorder.release()
      file.delete()
      throw error
    }
    val now = System.currentTimeMillis()
    val piece = Piece(recorder, file, index, now, lastEnded?.let { now - it }, UUID.randomUUID().toString(), AdtsCheckpointer(file))
    // The media server died or the recorder failed: end this file as an error and start another.
    recorder.setOnErrorListener { _, what, extra ->
      handler?.post {
        if (current !== piece) return@post
        emit("onBugRecorderError", mapOf("message" to "The recorder stopped (error $what, $extra); a new file starts"))
        current = null
        finish(piece, "error", byStop = false)
        begin()
      }
    }
    writeMarker(cfg, piece, null, null)
    if (cfg.checkpointMillis > 0) scheduleCheckpoint(piece, cfg.checkpointMillis)
    return piece
  }

  private fun scheduleCheckpoint(piece: Piece, every: Long) {
    handler?.postDelayed({
      if (current === piece && piece.checkpointing) {
        checkpoint(piece)
        scheduleCheckpoint(piece, every)
      }
    }, every)
  }

  private fun checkpoint(piece: Piece) {
    val cfg = config ?: return
    try {
      val snapshot = piece.checkpointer.checkpoint() ?: return
      emit("onBugCheckpoint", mapOf(
        "recording" to piece.recording,
        "uri" to "file://${piece.file.absolutePath}",
        "kind" to "audio",
        "clip" to cfg.clip,
        "index" to piece.index,
        "checkpoint" to snapshot.index,
        "bytes" to snapshot.bytes.toDouble(),
        "sha256" to snapshot.sha256,
        "at" to iso(System.currentTimeMillis()),
        "startedAt" to iso(piece.startedAt),
      ))
    } catch (error: Exception) {
      // Say so once, and stop checkpointing this file; recording carries on.
      piece.checkpointing = false
      emit("onBugRecorderError", mapOf("message" to "Checkpoint failed: ${error.message ?: error}"))
    }
  }

  private fun finish(piece: Piece, reason: String, byStop: Boolean) {
    var endReason = reason
    try {
      piece.recorder.stop()
    } catch (error: RuntimeException) {
      // Stopped with no audio captured, or the media server died. What is on disk stays.
      endReason = "error"
    }
    piece.recorder.release()
    // AACWriter closes its file when its thread ends, inside stop(); wait in case a phone's writer
    // is slower (at most about a second), so the final fingerprint covers every byte.
    var last = -1L
    for (i in 0 until 20) {
      val now = piece.file.length()
      if (now == last) break
      last = now
      Thread.sleep(50)
    }
    val whole = try {
      piece.checkpointer.finish()
    } catch (error: Exception) {
      emit("onBugRecorderError", mapOf("message" to "Final fingerprint failed: ${error.message ?: error}"))
      null
    }
    val endedAt = System.currentTimeMillis()
    lastEnded = endedAt
    val cfg = config ?: return
    if (!piece.file.exists() || piece.file.length() == 0L) {
      piece.file.delete()
      File(cfg.pendingDir, "${piece.file.name}.json").delete()
      return
    }
    writeMarker(cfg, piece, endedAt, endReason)
    emit("onBugPieceClosed", mapOf(
      "uri" to "file://${piece.file.absolutePath}",
      "clip" to cfg.clip,
      "index" to piece.index,
      "startedAt" to iso(piece.startedAt),
      "endedAt" to iso(endedAt),
      "endReason" to endReason,
      "gapBeforeMs" to piece.gapBeforeMs?.toDouble(),
      "marker" to "${piece.file.name}.json",
      "recording" to piece.recording,
      "finalSize" to whole?.bytes?.toDouble(),
      "finalSha256" to whole?.sha256,
      "final" to byStop,
    ))
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
      put("recording", piece.recording)
      if (closedAt != null) {
        put("closedAt", iso(closedAt))
        put("endReason", endReason)
      }
    }
    File(cfg.pendingDir, "${piece.file.name}.json").writeText(json.toString())
  }

  private fun emit(name: String, body: Map<String, Any?>) {
    listener?.invoke(name, body)
  }

  private fun iso(millis: Long): String =
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
      .apply { timeZone = TimeZone.getTimeZone("UTC") }
      .format(Date(millis))

  private const val RETRY_MILLIS = 5_000L
}
