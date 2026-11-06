package expo.modules.saakshievidence

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import java.io.File
import java.nio.ByteBuffer

/**
 * Makes an MP4 copy of an MPEG-TS recording without re-encoding: every video and audio sample is
 * copied as it is from the original's container into an MP4 container (a remux). The original is
 * only read. MPEG-TS has no field for rotation, so the copy is given the rotation the recorder
 * noted, and plays upright where the original may not.
 */
object Remuxer {
  private const val BUFFER_SIZE = 4 shl 20

  fun tsToMp4(input: File, output: File, rotationDegrees: Int?) {
    val extractor = MediaExtractor()
    var muxer: MediaMuxer? = null
    try {
      extractor.setDataSource(input.absolutePath)
      output.delete()
      val m = MediaMuxer(output.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
      muxer = m
      if (rotationDegrees != null && rotationDegrees != 0) m.setOrientationHint(rotationDegrees)

      val tracks = HashMap<Int, Int>()
      for (i in 0 until extractor.trackCount) {
        val format = extractor.getTrackFormat(i)
        val mime = format.getString(MediaFormat.KEY_MIME) ?: continue
        if (mime.startsWith("video/") || mime.startsWith("audio/")) {
          extractor.selectTrack(i)
          tracks[i] = m.addTrack(format)
        }
      }
      if (tracks.isEmpty()) throw IllegalStateException("No audio or video in ${input.name}")
      m.start()

      val buffer = ByteBuffer.allocate(BUFFER_SIZE)
      val info = MediaCodec.BufferInfo()
      while (true) {
        val size = extractor.readSampleData(buffer, 0)
        if (size < 0) break
        val track = tracks[extractor.sampleTrackIndex]
        if (track != null) {
          val keyFrame = extractor.sampleFlags and MediaExtractor.SAMPLE_FLAG_SYNC != 0
          info.set(0, size, extractor.sampleTime, if (keyFrame) MediaCodec.BUFFER_FLAG_KEY_FRAME else 0)
          m.writeSampleData(track, buffer, info)
        }
        extractor.advance()
      }
      m.stop()
    } catch (e: Exception) {
      output.delete()
      throw e
    } finally {
      runCatching { muxer?.release() }
      extractor.release()
    }
  }

  /** One stretch of a source file placed in a joined copy. Microseconds, in the file's own time. */
  data class Segment(val file: File, val atUs: Long, val fromUs: Long, val lengthUs: Long)

  /** Which stretches were placed (a file with no track of that kind places nothing). */
  data class Joined(val placedVideo: List<Boolean>, val placedAudio: List<Boolean>)

  /**
   * Joins a record's files into one MP4 copy for sharing (fix round 1, group 3), without
   * re-encoding: each stretch's samples are copied unchanged from its file to its place in the
   * copy. Picture and sound are interleaved by time, as MP4 expects. Each file's own clock, shared
   * by its picture and sound, places them, so the two stay in step. Where two stretches overlap,
   * the later one starts where the earlier ended (a video stretch at its next keyframe). The
   * originals are only read. Every file of one recording has the same encoder settings, so the
   * first file's track formats serve for all. The rotation is the one given (MPEG-TS can't hold
   * one), or else the MP4 files' own, which must agree.
   */
  fun join(video: List<Segment>, audio: List<Segment>, output: File, rotationDegrees: Int?): Joined {
    output.delete()
    output.parentFile?.mkdirs()
    val zeros = HashMap<String, Long>()
    val pictures = SegmentReader(video, "video/", zeros)
    val sounds = SegmentReader(audio, "audio/", zeros)
    var muxer: MediaMuxer? = null
    try {
      val videoFormat = pictures.firstFormat() ?: throw IllegalStateException("None of the video files could be read")
      val audioFormat = sounds.firstFormat()
      val rotation = rotationDegrees ?: pictures.commonRotation()
      val m = MediaMuxer(output.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
      muxer = m
      if (rotation != null && rotation != 0) m.setOrientationHint(rotation)
      val videoTrack = m.addTrack(videoFormat)
      val audioTrack = audioFormat?.let { m.addTrack(it) }
      m.start()
      val buffer = ByteBuffer.allocate(BUFFER_SIZE)
      val info = MediaCodec.BufferInfo()
      while (true) {
        val nextVideo = pictures.peekUs()
        val nextAudio = if (audioTrack != null) sounds.peekUs() else Long.MAX_VALUE
        if (nextVideo == Long.MAX_VALUE && nextAudio == Long.MAX_VALUE) break
        val (reader, track) = if (nextVideo <= nextAudio) pictures to videoTrack else sounds to audioTrack!!
        if (reader.read(buffer, info)) m.writeSampleData(track, buffer, info)
      }
      m.stop()
      return Joined(pictures.placed(), if (audioTrack != null) sounds.placed() else audio.map { false })
    } catch (e: Exception) {
      output.delete()
      throw e
    } finally {
      runCatching { muxer?.release() }
      pictures.close()
      sounds.close()
    }
  }

  /** Reads the samples of one kind (video or audio) from a list of segments, in order. */
  private class SegmentReader(
    private val segments: List<Segment>,
    private val prefix: String,
    /** Each file's zero: its earliest sample of any kind, shared by its picture and sound. */
    private val zeros: HashMap<String, Long>,
  ) {
    private var index = -1
    private var extractor: MediaExtractor? = null
    private var segment: Segment? = null
    private var zeroUs = 0L
    /** Where the stretch before ended: samples of this one up to here are already in the copy. */
    private var floorUs = Long.MIN_VALUE
    private var lastOutUs = Long.MIN_VALUE
    /** Video: wait for a keyframe before the first sample of a stretch. */
    private var needKey = false
    private val placed = BooleanArray(segments.size)

    fun placed(): List<Boolean> = placed.toList()

    fun firstFormat(): MediaFormat? {
      for (s in segments) formatOf(s.file)?.let { return it }
      return null
    }

    /** The MP4 files' own rotation, if they have one; they must all agree. */
    fun commonRotation(): Int? {
      val turns = segments.mapNotNull { formatOf(it.file) }
        .map { if (it.containsKey(MediaFormat.KEY_ROTATION)) it.getInteger(MediaFormat.KEY_ROTATION) else 0 }
        .toSet()
      if (turns.size > 1) throw IllegalStateException("The video files are turned different ways")
      return turns.firstOrNull()
    }

    private fun formatOf(file: File): MediaFormat? {
      val e = MediaExtractor()
      try {
        e.setDataSource(file.absolutePath)
        for (i in 0 until e.trackCount) {
          val format = e.getTrackFormat(i)
          if (format.getString(MediaFormat.KEY_MIME)?.startsWith(prefix) == true) return format
        }
      } catch (_: Exception) {
        // Unreadable: try the next file.
      } finally {
        e.release()
      }
      return null
    }

    private fun zeroOf(file: File): Long = zeros.getOrPut(file.absolutePath) {
      val e = MediaExtractor()
      try {
        e.setDataSource(file.absolutePath)
        for (i in 0 until e.trackCount) e.selectTrack(i)
        e.sampleTime.coerceAtLeast(0)
      } catch (_: Exception) {
        0L
      } finally {
        e.release()
      }
    }

    /** The output time of the next sample, or Long.MAX_VALUE when there are none left. */
    fun peekUs(): Long {
      while (true) {
        val e = extractor
        val s = segment
        if (e == null || s == null) {
          if (!openNext()) return Long.MAX_VALUE
          continue
        }
        val time = e.sampleTime
        if (time < 0 || time - zeroUs >= s.fromUs + s.lengthUs) {
          closeCurrent()
          continue
        }
        val out = s.atUs + (time - zeroUs - s.fromUs)
        val key = e.sampleFlags and MediaExtractor.SAMPLE_FLAG_SYNC != 0
        if (time - zeroUs < s.fromUs || out <= floorUs || (needKey && !key)) {
          e.advance()
          continue
        }
        return out
      }
    }

    /** Reads the sample `peekUs` named into `buffer`. */
    fun read(buffer: ByteBuffer, info: MediaCodec.BufferInfo): Boolean {
      val out = peekUs()
      val e = extractor ?: return false
      if (out == Long.MAX_VALUE) return false
      val size = e.readSampleData(buffer, 0)
      if (size < 0) {
        closeCurrent()
        return false
      }
      val keyFrame = e.sampleFlags and MediaExtractor.SAMPLE_FLAG_SYNC != 0
      info.set(0, size, out, if (keyFrame) MediaCodec.BUFFER_FLAG_KEY_FRAME else 0)
      needKey = false
      placed[index] = true
      if (out > lastOutUs) lastOutUs = out
      e.advance()
      return true
    }

    private fun openNext(): Boolean {
      while (++index < segments.size) {
        val s = segments[index]
        val e = MediaExtractor()
        try {
          e.setDataSource(s.file.absolutePath)
          val track = (0 until e.trackCount).firstOrNull {
            e.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith(prefix) == true
          }
          if (track == null) {
            e.release()
            continue
          }
          e.selectTrack(track)
          zeroUs = zeroOf(s.file)
          if (s.fromUs > 0) e.seekTo(zeroUs + s.fromUs, MediaExtractor.SEEK_TO_PREVIOUS_SYNC)
          extractor = e
          segment = s
          floorUs = lastOutUs
          needKey = prefix == "video/"
          return true
        } catch (_: Exception) {
          e.release()
        }
      }
      return false
    }

    private fun closeCurrent() {
      extractor?.release()
      extractor = null
      segment = null
    }

    fun close() = closeCurrent()
  }
}
