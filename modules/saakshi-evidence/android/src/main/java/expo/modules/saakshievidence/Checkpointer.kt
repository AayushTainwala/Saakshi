package expo.modules.saakshievidence

import java.io.File
import java.io.RandomAccessFile
import java.security.MessageDigest

/**
 * Fingerprints a recording while MediaRecorder is still writing it (fix round 1, group 2a).
 *
 * MediaRecorder writes MPEG-TS through AOSP's MPEG2TSWriter, which only appends 188-byte packets
 * (`fwrite` to a stdio stream opened on the file) and never seeks back, so bytes already on disk
 * never change. Each checkpoint reads only the bytes added since the previous one, feeds them to a
 * running SHA-256, and reports the length so far and the SHA-256 of those bytes; the file is never
 * re-read. Checkpoint lengths are whole TS packets, so every checkpointed prefix is itself a
 * playable transport stream. Not for MP4, whose header MediaRecorder rewrites when it stops.
 */
class Checkpointer(private val file: File) {
  data class Snapshot(val bytes: Long, val sha256: String)

  private val digest = MessageDigest.getInstance("SHA-256")
  private val buffer = ByteArray(1 shl 16)
  private var offset = 0L
  private var finished = false

  /**
   * Reads what has been added since the last checkpoint, up to the last whole packet. Null when
   * nothing new is on disk, or if this phone's SHA-256 can't be copied mid-stream.
   */
  @Synchronized
  fun checkpoint(): Snapshot? {
    if (finished) return null
    // Flush what the writer has handed the kernel to storage first, so a checkpoint never names
    // bytes a power cut could still lose. (fsync works on the file, whichever descriptor wrote it.)
    try {
      RandomAccessFile(file, "r").use { it.fd.sync() }
    } catch (e: Exception) {
      // Some file systems refuse; the bytes are still in the page cache.
    }
    val length = file.length()
    val target = length - length % TS_PACKET
    if (target <= offset) return null
    read(target)
    val copy = try {
      digest.clone() as MessageDigest
    } catch (e: CloneNotSupportedException) {
      return null
    }
    return Snapshot(offset, hex(copy.digest()))
  }

  /** Once the recorder has stopped and closed the file: reads the rest and fingerprints the whole file. */
  @Synchronized
  fun finish(): Snapshot {
    finished = true
    read(file.length())
    return Snapshot(offset, hex(digest.digest()))
  }

  private fun read(target: Long) {
    if (target <= offset) return
    RandomAccessFile(file, "r").use { input ->
      input.seek(offset)
      while (offset < target) {
        val count = input.read(buffer, 0, minOf(buffer.size.toLong(), target - offset).toInt())
        if (count <= 0) break
        digest.update(buffer, 0, count)
        offset += count
      }
    }
  }

  companion object {
    const val TS_PACKET = 188

    fun hex(bytes: ByteArray): String {
      val out = StringBuilder(bytes.size * 2)
      for (b in bytes) out.append(String.format("%02x", b.toInt() and 0xff))
      return out.toString()
    }
  }
}
