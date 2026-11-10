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
 * Pocket recording's sound recorder on Android (spec E8; bug mode until round 2): the microphone into AAC with ADTS framing
 * (`.aac`), which needs nothing written at the end, so a file cut off by a dead battery still plays
 * up to the cut.
 *
 * One continuous file from Start to Stop (owner's decision, fix round 1, as for body-cam). While
 * it is written, [AdtsCheckpointer] fingerprints it about every `checkpointMillis` and each
 * checkpoint is sent as "onBugCheckpoint", to be signed into the session's chain. A new file
 * starts only as a fail-safe: when MediaRecorder reports an error, or the file stops growing
 * (AOSP's AACWriter stops writing on an I/O or microphone error without telling anyone). Each file
 * has a random `recording` id, which its checkpoints and its record carry, and a crash-recovery
 * marker in the session's `pending/` folder in the format of src/modules/evidence/locker/pending.ts.
 * Runs inside [BugModeService], so it carries on with the screen off.
 *
 * Everything happens on one thread, so a file's checkpoints are always sent before its
 * "onBugPieceClosed", and nothing is checkpointed after it closes. "onBugRecorderStarted" says the
 * first file is recording; "onBugRecorderStopped" says Stop has closed the last one.
 */
object BugRecorder {
  data class Config(val outputDir: File, val pendingDir: File, val checkpointMillis: Long, val clip: Int)

  private class Piece(
    val file: File,
    val index: Int,
    val startedAt: Long,
    val gapBeforeMs: Long?,
    val recording: String,
    val checkpointer: AdtsCheckpointer,
  ) {
    lateinit var recorder: MediaRecorder
    var checkpointing = true
    var lastLength = -1L
    var stalls = 0
  }

  /**
   * Set by the module: receives "onBugCheckpoint", "onBugPieceClosed", "onBugRecorderError",
   * "onBugRecorderStarted" and "onBugRecorderStopped".
   */
  @Volatile var listener: ((String, Map<String, Any?>) -> Unit)? = null

  @Volatile private var thread: HandlerThread? = null
  @Volatile private var handler: Handler? = null
  private var config: Config? = null
  private var current: Piece? = null
  private var nextIndex = 0
  private var lastEnded: Long? = null
  private var context: Context? = null
  private var announced = false
  @Volatile private var stopping = false
  private val waiting = mutableListOf<() -> Unit>()

  /** False if an earlier recording is still stopping (it says so as an error). */
  fun start(context: Context, config: Config): Boolean {
    if (thread != null) {
      emit("onBugRecorderError", mapOf("message" to "Pocket recording is still stopping. Try again in a moment."))
      return false
    }
    config.outputDir.mkdirs()
    config.pendingDir.mkdirs()
    this.config = config
    this.context = context.applicationContext
    nextIndex = 0
    lastEnded = null
    announced = false
    val t = HandlerThread("SaakshiBugRecorder").apply { start() }
    thread = t
    handler = Handler(t.looper).apply { post { begin() } }
    return true
  }

  /**
   * Closes the file, then calls `onStopped` on the recorder's thread. A second stop while the first
   * is closing the file only waits for it.
   */
  fun stop(onStopped: () -> Unit) {
    val h = handler
    if (h == null) {
      onStopped()
      return
    }
    synchronized(waiting) {
      waiting.add(onStopped)
      if (stopping) return
      stopping = true
    }
    h.removeCallbacksAndMessages(null)
    h.post {
      try {
        current?.let { finish(it, "stopped", byStop = true) }
      } finally {
        current = null
        emit("onBugRecorderStopped", emptyMap())
        config = null
        context = null
        handler = null
        thread?.quitSafely()
        thread = null
        val done = synchronized(waiting) {
          stopping = false
          waiting.toList().also { waiting.clear() }
        }
        done.forEach { it() }
      }
    }
  }

  /**
   * The low-battery handover at 5% (round 2, group 1.5; bundle format 0.9): the file being written
   * closes cleanly with `reason` and the next file of the same clip starts at once, on the path of
   * the fail-safe new file. The old recorder is stopped and the new one started before the old file
   * is fingerprinted and reported, so the gap is only the time to stop one recorder and start the
   * next.
   */
  fun handOver(reason: String) {
    post {
      val piece = current ?: return@post
      if (stopping) return@post
      current = null
      val (endedAt, endReason) = stopRecorder(piece, reason)
      begin()
      complete(piece, endedAt, endReason, byStop = false)
    }
  }

  /** Starts a file; if it can't start, tries again in a few seconds, until Stop. */
  private fun begin() {
    val cfg = config ?: return
    val ctx = context ?: return
    current = try {
      startPiece(ctx, cfg)
    } catch (error: Exception) {
      emit("onBugRecorderError", mapOf("message" to "Could not start recording: ${error.message ?: error}"))
      handler?.postDelayed({ if (current == null) begin() }, RETRY_MILLIS)
      null
    }
    if (current != null && !announced) {
      announced = true
      emit("onBugRecorderStarted", emptyMap())
    }
  }

  private fun startPiece(context: Context, cfg: Config): Piece {
    val index = nextIndex++
    val file = File(cfg.outputDir, "bug-${cfg.clip}-$index-${System.currentTimeMillis()}.aac")
    val now = System.currentTimeMillis()
    val piece = Piece(file, index, now, lastEnded?.let { now - it }, UUID.randomUUID().toString(), AdtsCheckpointer(file))
    // The marker first: if the app dies from here on, recovery finds the file (or removes the
    // marker if nothing was written).
    writeMarker(cfg, piece, null, null)
    val recorder = if (Build.VERSION.SDK_INT >= 31) MediaRecorder(context) else @Suppress("DEPRECATION") MediaRecorder()
    try {
      recorder.setAudioSource(MediaRecorder.AudioSource.MIC)
      recorder.setOutputFormat(MediaRecorder.OutputFormat.AAC_ADTS)
      recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
      recorder.setAudioChannels(1)
      recorder.setAudioSamplingRate(44_100)
      recorder.setAudioEncodingBitRate(64_000)
      recorder.setOutputFile(file.absolutePath)
      // The media server died or the recorder failed: end this file as an error and start another.
      recorder.setOnErrorListener { _, what, extra -> post { restart(piece, "The recorder stopped (error $what, $extra); a new file starts") } }
      recorder.prepare()
      recorder.start()
    } catch (error: Exception) {
      recorder.release()
      file.delete()
      File(cfg.pendingDir, "${file.name}.json").delete()
      throw error
    }
    piece.recorder = recorder
    if (cfg.checkpointMillis > 0) scheduleTick(piece, cfg.checkpointMillis)
    return piece
  }

  private fun post(work: () -> Unit) {
    handler?.post(work)
  }

  /** Ends `piece` as an error and starts a new file, if it is still the one recording. */
  private fun restart(piece: Piece, message: String) {
    if (current !== piece) return
    emit("onBugRecorderError", mapOf("message" to message))
    current = null
    finish(piece, "error", byStop = false)
    begin()
  }

  /** Every `every` ms while the file records: checkpoint it, and notice if it has stopped growing. */
  private fun scheduleTick(piece: Piece, every: Long) {
    handler?.postDelayed({
      if (current === piece) {
        val length = piece.file.length()
        if (length == piece.lastLength) piece.stalls++ else piece.stalls = 0
        piece.lastLength = length
        if (piece.stalls >= STALLED_TICKS) {
          restart(piece, "The recorder stopped writing (for example, the phone is full); a new file starts")
        } else {
          if (piece.checkpointing) checkpoint(piece)
          scheduleTick(piece, every)
        }
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
    val (endedAt, endReason) = stopRecorder(piece, reason)
    complete(piece, endedAt, endReason, byStop)
  }

  /** Stops the piece's recorder: when its sound ended, and the reason it ended with. */
  private fun stopRecorder(piece: Piece, reason: String): Pair<Long, String> {
    var endReason = reason
    try {
      piece.recorder.stop()
    } catch (error: RuntimeException) {
      // Stopped with no audio captured, or the media server died. What is on disk stays.
      endReason = "error"
    }
    // The sound ended here, before the waiting and hashing that follow.
    val endedAt = System.currentTimeMillis()
    lastEnded = endedAt
    runCatching { piece.recorder.release() }
    return endedAt to endReason
  }

  /** Fingerprints the stopped piece's whole file, updates its marker and reports it. */
  private fun complete(piece: Piece, endedAt: Long, endReason: String, byStop: Boolean) {
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
    val cfg = config ?: return
    if (!piece.file.exists() || piece.file.length() == 0L) {
      piece.file.delete()
      File(cfg.pendingDir, "${piece.file.name}.json").delete()
      return
    }
    try {
      writeMarker(cfg, piece, endedAt, endReason)
    } catch (error: Exception) {
      // The file is still found at the next start from its first marker, and sealed as interrupted.
      emit("onBugRecorderError", mapOf("message" to "The recovery marker could not be updated: ${error.message ?: error}"))
    }
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
    try {
      listener?.invoke(name, body)
    } catch (e: Exception) {
      // The app's JavaScript isn't listening (it may have closed); the files and markers stay.
    }
  }

  private fun iso(millis: Long): String =
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
      .apply { timeZone = TimeZone.getTimeZone("UTC") }
      .format(Date(millis))

  private const val RETRY_MILLIS = 5_000L
  /** The file hasn't grown for this many checkpoint ticks (30 seconds): the writer has stopped. */
  private const val STALLED_TICKS = 3
}
