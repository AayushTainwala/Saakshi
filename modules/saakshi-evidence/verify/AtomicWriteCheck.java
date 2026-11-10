import expo.modules.saakshievidence.AtomicFile;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Arrays;

/**
 * Checks AtomicFile.write (repair round A, group 1) on a JVM.
 *
 *   AtomicWriteCheck write <file> <bytes>   rewrites the file for ever with payloads of that many
 *                                           bytes, each one letter repeated ('A', 'B', ...)
 *   AtomicWriteCheck check <file> <bytes>   exits 0 if the file is exactly one whole payload
 *
 * atomic-write.sh kills the writer at random moments and runs the check after each kill.
 */
public final class AtomicWriteCheck {
  public static void main(String[] args) throws Exception {
    File file = new File(args[1]);
    int size = Integer.parseInt(args[2]);
    if (args[0].equals("write")) {
      byte[] payload = new byte[size];
      for (int i = 0; ; i++) {
        Arrays.fill(payload, (byte) ('A' + i % 26));
        AtomicFile.write(file, payload);
      }
    }
    byte[] found = Files.readAllBytes(file.toPath());
    if (found.length != size) {
      System.out.println("FAIL: " + found.length + " bytes, expected " + size);
      System.exit(1);
    }
    for (byte b : found) {
      if (b != found[0] || b < 'A' || b > 'Z') {
        System.out.println("FAIL: mixed or foreign contents: " + new String(found, 0, Math.min(40, found.length), StandardCharsets.US_ASCII));
        System.exit(1);
      }
    }
  }
}
