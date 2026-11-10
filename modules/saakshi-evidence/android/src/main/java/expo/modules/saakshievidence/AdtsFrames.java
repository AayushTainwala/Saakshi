package expo.modules.saakshievidence;

/**
 * Finds where whole ADTS AAC frames end, for checkpoints of body-cam's sound-only file (repair
 * round A, group 2), so that every checkpointed length is a whole number of frames and plays on its
 * own. MediaRecorder writes AAC_ADTS through AOSP's AACWriter: for each frame a 7-byte header
 * (no CRC) and then the frame's data, only ever appended. The same reading of the header as
 * AdtsCheckpointer in the saakshi-sos module, which this module does not depend on.
 *
 * Plain Java with no Android classes, so that verify/adts-frames.sh can run it on a JVM.
 */
public final class AdtsFrames {
  /** An ADTS header without CRC (protection_absent = 1). */
  public static final int HEADER = 7;

  private AdtsFrames() {}

  /**
   * How many of the first `length` bytes of `window` are whole frames, when `window` starts at the
   * start of a frame. A frame cut short at the end is left out. Throws if the bytes are not ADTS.
   */
  public static int wholeFrames(byte[] window, int length) {
    int end = 0;
    while (end + HEADER <= length) {
      int b0 = window[end] & 0xff;
      int b1 = window[end + 1] & 0xff;
      if (b0 != 0xff || (b1 & 0xf0) != 0xf0) throw new IllegalStateException("not ADTS at byte " + end);
      int frameLength = ((window[end + 3] & 0x03) << 11) | ((window[end + 4] & 0xff) << 3) | ((window[end + 5] & 0xe0) >>> 5);
      if (frameLength < HEADER) throw new IllegalStateException("a bad ADTS frame at byte " + end);
      if (end + frameLength > length) break;
      end += frameLength;
    }
    return end;
  }
}
