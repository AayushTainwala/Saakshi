import expo.modules.saakshisos.AdtsCheckpointer
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest
import kotlin.random.Random

/**
 * Runs bug mode's Android checkpointer (../android/.../AdtsCheckpointer.kt) on the JVM, against a
 * file that grows the way AOSP's AACWriter writes it: each frame's 7-byte header one byte at a
 * time, then the frame's data, so a checkpoint can land anywhere, even inside a header.
 *
 * Usage: AdtsCheckpointerCheck <source.aac> <work dir>
 * Prints each checkpoint's length; writes each checkpointed prefix to <work dir>/prefix-<n>.aac for
 * ffprobe, and fails (exit 1) if anything disagrees.
 */
fun main(args: Array<String>) {
  val source = File(args[0]).readBytes()
  val work = File(args[1]).apply { mkdirs() }
  val frames = frameEnds(source)
  val random = Random(63)
  var failures = 0
  fun check(ok: Boolean, what: String) {
    if (!ok) {
      failures++
      println("FAIL: $what")
    }
  }

  // 1. A growing file, checkpointed every so often.
  val growing = File(work, "growing.aac").apply { delete() }
  val checkpointer = AdtsCheckpointer(growing)
  val snapshots = mutableListOf<AdtsCheckpointer.Snapshot>()
  FileOutputStream(growing).use { out ->
    var at = 0
    var sinceCheckpoint = 0
    for (end in frames) {
      // Header byte by byte, then the data: as AACWriter::writeAdtsHeader and threadFunc do.
      for (i in 0 until 7) {
        out.write(source[at + i].toInt())
        out.flush()
        sinceCheckpoint++
        if (sinceCheckpoint > 4000 && random.nextInt(9) == 0) {
          checkpointer.checkpoint()?.let { snapshots.add(it) }
          sinceCheckpoint = 0
        }
      }
      out.write(source, at + 7, end - at - 7)
      out.flush()
      sinceCheckpoint += end - at - 7
      if (sinceCheckpoint > 4000 && random.nextInt(3) == 0) {
        checkpointer.checkpoint()?.let { snapshots.add(it) }
        sinceCheckpoint = 0
      }
      at = end
    }
  }
  val whole = checkpointer.finish()
  check(snapshots.size >= 4, "expected several checkpoints, got ${snapshots.size}")
  check(whole.bytes == source.size.toLong(), "final size ${whole.bytes} != ${source.size}")
  check(whole.sha256 == sha256(source, source.size), "final SHA-256 differs from the file's")
  check(whole.index == snapshots.size, "final index ${whole.index} != ${snapshots.size} checkpoints")
  var previous = 0L
  for ((n, snapshot) in snapshots.withIndex()) {
    val length = snapshot.bytes.toInt()
    check(snapshot.index == n, "checkpoint $n has index ${snapshot.index}")
    check(snapshot.bytes > previous, "checkpoint $n does not grow")
    check(frames.contains(length), "checkpoint $n ($length bytes) is not on a frame boundary")
    check(snapshot.sha256 == sha256(source, length), "checkpoint $n: SHA-256 differs from the prefix re-read")
    File(work, "prefix-$n.aac").writeBytes(source.copyOf(length))
    println("checkpoint $n: $length bytes, on frame ${frames.indexOf(length) + 1} of ${frames.size}")
    previous = snapshot.bytes
  }

  // 2. Upload parts ending on checkpoints, joined in order, are the file byte for byte.
  val joined = java.io.ByteArrayOutputStream()
  var offset = 0
  for (end in snapshots.map { it.bytes.toInt() } + source.size) {
    joined.write(source, offset, end - offset)
    offset = end
  }
  check(joined.toByteArray().contentEquals(source), "joined parts differ from the file")

  // 3. Bytes that are not ADTS: one error, then no more checkpoints; the whole file still hashes.
  val notAdts = File(work, "not-adts.aac").apply { writeBytes(ByteArray(5000) { 0x47 }) }
  val other = AdtsCheckpointer(notAdts)
  val threw = try {
    other.checkpoint()
    false
  } catch (e: IllegalStateException) {
    true
  }
  check(threw, "non-ADTS bytes did not throw")
  check(other.checkpoint() == null, "a second checkpoint after the error was taken")
  check(other.finish().sha256 == sha256(notAdts.readBytes(), 5000), "non-ADTS final SHA-256 differs")

  // 4. A file shorter than its checkpoints is refused at the end.
  val shrunk = File(work, "shrunk.aac").apply { writeBytes(source.copyOf(frames[10])) }
  val cut = AdtsCheckpointer(shrunk)
  cut.checkpoint()
  shrunk.writeBytes(source.copyOf(frames[2]))
  val refused = try {
    cut.finish()
    false
  } catch (e: IllegalStateException) {
    true
  }
  check(refused, "a file shorter than its checkpoints was accepted")

  println(if (failures == 0) "OK: ${snapshots.size} checkpoints, ${frames.size} frames, ${source.size} bytes" else "$failures failure(s)")
  if (failures > 0) kotlin.system.exitProcess(1)
}

/** The end offset of every ADTS frame in the file. */
fun frameEnds(bytes: ByteArray): List<Int> {
  val ends = mutableListOf<Int>()
  var at = 0
  while (at + 7 <= bytes.size) {
    val length = ((bytes[at + 3].toInt() and 0x03) shl 11) or ((bytes[at + 4].toInt() and 0xff) shl 3) or
      ((bytes[at + 5].toInt() and 0xe0) ushr 5)
    require((bytes[at].toInt() and 0xff) == 0xff && length >= 7) { "source is not ADTS at $at" }
    at += length
    ends.add(at)
  }
  require(at == bytes.size) { "source ends inside a frame" }
  return ends
}

fun sha256(bytes: ByteArray, length: Int): String =
  MessageDigest.getInstance("SHA-256").apply { update(bytes, 0, length) }.digest()
    .joinToString("") { String.format("%02x", it.toInt() and 0xff) }
