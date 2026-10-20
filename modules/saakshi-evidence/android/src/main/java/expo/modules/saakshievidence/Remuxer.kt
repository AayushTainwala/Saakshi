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
}
