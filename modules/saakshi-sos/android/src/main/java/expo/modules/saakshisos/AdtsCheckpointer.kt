package expo.modules.saakshisos

import java.io.File
import java.io.RandomAccessFile
import java.security.MessageDigest

/**
 * Fingerprints bug mode's sound file while MediaRecorder is still writing it (fix round 1: bug mode
 * as one continuous file, like body-cam).
 *
 * MediaRecorder writes `AAC_ADTS` through AOSP's AACWriter (StagefrightRecorder::setupAACRecording),
 * which only appends: for each frame, a 7-byte ADTS header and then the frame's data, each with
 * `write()` on its own descriptor, and never seeks back. So bytes already on disk never change.
 * Each checkpoint reads only the bytes added since the previous one, up to the end of the last
 * whole ADTS frame, feeds them to a running SHA-256, and reports the length so far and the SHA-256
 * of those bytes; the file is never re-read. Every checkpointed prefix is a whole number of frames,
 * so it plays on its own.
 *
 * If the bytes are not ADTS (a phone maker's recorder writing something else), [checkpoint] throws
 * once and takes no more checkpoints; recording carries on, and the file is still fingerprinted
 * whole by [finish].
 */
class AdtsCheckpointer(private val file: File) {
  data class Snapshot(val bytes: Long, val sha256: String, val index: Int)

  private val digest = MessageDigest.getInstance("SHA-256")
  private val buffer = ByteArray(1 shl 16)
  /** Hashed up to here: always the end of a whole frame, until [finish]. */
  private var offset = 0L
  private var finished = false
  private var stopped = false

  /** How many checkpoints have been taken. */
  @Volatile var checkpointsTaken = 0
    private set

  /**
   * Reads what has been added since the last checkpoint, up to the end of the last whole frame.
   * Null when no whole frame is new, or if this phone's SHA-256 can't be copied mid-stream.
   */
  @Synchronized
  fun checkpoint(): Snapshot? {
    if (finished || stopped) return null
    // Measure first, then flush to storage, so every byte the checkpoint names has been flushed.
    // (fsync works on the file, whichever descriptor wrote it.)
    val length = file.length()
    try {
      RandomAccessFile(file, "r").use { it.fd.sync() }
    } catch (e: Exception) {
      // Some file systems refuse; the bytes are still in the page cache.
    }
    if (length <= offset) return null
    // At most MAX_READ at a time (at 64 kbit/s, ten seconds is about 80 KB); the rest comes next time.
    val window = minOf(length - offset, MAX_READ).toInt()
    val pending = ByteArray(window)
    RandomAccessFile(file, "r").use { input ->
      input.seek(offset)
      input.readFully(pending)
    }
    var end = 0
    while (end + HEADER <= window) {
      val b0 = pending[end].toInt() and 0xff
      val b1 = pending[end + 1].toInt() and 0xff
      if (b0 != 0xff || (b1 and 0xf0) != 0xf0) {
        stopped = true
        throw IllegalStateException("${file.name} is not ADTS at byte ${offset + end}")
      }
      val frameLength = ((pending[end + 3].toInt() and 0x03) shl 11) or
        ((pending[end + 4].toInt() and 0xff) shl 3) or
        ((pending[end + 5].toInt() and 0xe0) ushr 5)
      if (frameLength < HEADER) {
        stopped = true
        throw IllegalStateException("${file.name} has a bad ADTS frame at byte ${offset + end}")
      }
      if (end + frameLength > window) break
      end += frameLength
    }
    if (end == 0) return null
    digest.update(pending, 0, end)
    offset += end
    val copy = try {
      digest.clone() as MessageDigest
    } catch (e: CloneNotSupportedException) {
      stopped = true
      return null
    }
    return Snapshot(offset, hex(copy.digest()), checkpointsTaken++)
  }

  /** Once the recorder has stopped and closed the file: reads the rest and fingerprints the whole file. */
  @Synchronized
  fun finish(): Snapshot {
    finished = true
    val length = file.length()
    // A file that is gone, or shorter than what was already read, is not the file we fingerprinted.
    if (!file.isFile || length < offset) throw IllegalStateException("${file.name} is missing or shorter than its checkpoints")
    RandomAccessFile(file, "r").use { input ->
      input.seek(offset)
      while (offset < length) {
        val count = input.read(buffer, 0, minOf(buffer.size.toLong(), length - offset).toInt())
        if (count <= 0) break
        digest.update(buffer, 0, count)
        offset += count
      }
    }
    return Snapshot(offset, hex(digest.digest()), checkpointsTaken)
  }

  companion object {
    /** An ADTS header without CRC, which AACWriter writes (protection_absent = 1). */
    private const val HEADER = 7
    private const val MAX_READ = 4L shl 20

    fun hex(bytes: ByteArray): String {
      val out = StringBuilder(bytes.size * 2)
      for (b in bytes) out.append(String.format("%02x", b.toInt() and 0xff))
      return out.toString()
    }
  }
}
