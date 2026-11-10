import expo.modules.saakshievidence.AdtsFrames;
import java.io.ByteArrayOutputStream;
import java.util.Random;

/**
 * Checks AdtsFrames.wholeFrames (repair round A, group 2) on a JVM: over a stream of ADTS frames
 * of mixed lengths, cut at every possible byte, the answer is always the end of the last whole
 * frame; and bytes that are not ADTS are refused. Run by adts-frames.sh.
 */
public final class AdtsFramesCheck {
  /** A frame of `length` bytes: the 7-byte header AOSP's AACWriter writes (AAC LC, 44.1 kHz, mono), then data. */
  static byte[] frame(int length, Random random) {
    byte[] bytes = new byte[length];
    random.nextBytes(bytes);
    bytes[0] = (byte) 0xff;
    bytes[1] = (byte) 0xf1;
    bytes[2] = (byte) 0x50;
    bytes[3] = (byte) (0x40 | ((length >> 11) & 0x03));
    bytes[4] = (byte) ((length >> 3) & 0xff);
    bytes[5] = (byte) (((length & 0x07) << 5) | 0x1f);
    bytes[6] = (byte) 0xfc;
    return bytes;
  }

  public static void main(String[] args) {
    Random random = new Random(63);
    ByteArrayOutputStream stream = new ByteArrayOutputStream();
    int[] lengths = {7, 8, 180, 371, 372, 1024, 2047, 8191, 190, 7, 365};
    int[] ends = new int[lengths.length];
    int total = 0;
    for (int i = 0; i < lengths.length; i++) {
      byte[] f = frame(lengths[i], random);
      stream.write(f, 0, f.length);
      total += lengths[i];
      ends[i] = total;
    }
    byte[] all = stream.toByteArray();
    for (int cut = 0; cut <= all.length; cut++) {
      int expected = 0;
      for (int end : ends) if (end <= cut) expected = end;
      int found = AdtsFrames.wholeFrames(all, cut);
      if (found != expected) {
        System.out.println("FAIL: cut at " + cut + " gave " + found + ", expected " + expected);
        System.exit(1);
      }
    }
    // From the start of a later frame, as a checkpoint after the first reads it.
    byte[] rest = java.util.Arrays.copyOfRange(all, ends[3], all.length);
    if (AdtsFrames.wholeFrames(rest, rest.length) != rest.length) {
      System.out.println("FAIL: the rest of the stream is not whole frames");
      System.exit(1);
    }
    for (byte[] bad : new byte[][] {{0, 1, 2, 3, 4, 5, 6, 7}, {(byte) 0xff, (byte) 0xf1, 0x50, 0x40, 0, 0x1f, (byte) 0xfc}}) {
      try {
        AdtsFrames.wholeFrames(bad, bad.length);
        System.out.println("FAIL: bytes that are not ADTS were accepted");
        System.exit(1);
      } catch (IllegalStateException expected) {
        // Refused, as it should be.
      }
    }
    System.out.println("OK: " + (all.length + 1) + " cuts of " + lengths.length + " frames each ended on a whole frame.");
  }
}
