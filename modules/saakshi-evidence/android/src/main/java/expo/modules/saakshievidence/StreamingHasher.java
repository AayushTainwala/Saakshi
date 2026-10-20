package expo.modules.saakshievidence;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.zip.CRC32;

/**
 * Reads a file once, in fixed-size chunks, and computes its SHA-256, SHA-1, MD5 and CRC-32 together.
 * Memory use stays at one buffer whatever the file size. Plain Java with no Android dependencies, so
 * it can be tested on any JVM (see modules/saakshi-evidence/verify/).
 */
public final class StreamingHasher {
  public static final int BUFFER_SIZE = 1 << 20;

  public static final class Result {
    public final long size;
    public final String sha256;
    public final String sha1;
    public final String md5;
    public final long crc32;

    Result(long size, String sha256, String sha1, String md5, long crc32) {
      this.size = size;
      this.sha256 = sha256;
      this.sha1 = sha1;
      this.md5 = md5;
      this.crc32 = crc32;
    }
  }

  private StreamingHasher() {}

  public static Result hash(File file) throws IOException {
    try (InputStream in = new FileInputStream(file)) {
      return hash(in);
    }
  }

  public static Result hash(InputStream in) throws IOException {
    MessageDigest sha256 = digest("SHA-256");
    MessageDigest sha1 = digest("SHA-1");
    MessageDigest md5 = digest("MD5");
    CRC32 crc = new CRC32();
    byte[] buffer = new byte[BUFFER_SIZE];
    long size = 0;
    int read;
    while ((read = in.read(buffer)) != -1) {
      sha256.update(buffer, 0, read);
      sha1.update(buffer, 0, read);
      md5.update(buffer, 0, read);
      crc.update(buffer, 0, read);
      size += read;
    }
    return new Result(size, hex(sha256.digest()), hex(sha1.digest()), hex(md5.digest()), crc.getValue());
  }

  private static MessageDigest digest(String algorithm) {
    try {
      return MessageDigest.getInstance(algorithm);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(algorithm + " is required on every Java platform", e);
    }
  }

  static String hex(byte[] bytes) {
    char[] digits = "0123456789abcdef".toCharArray();
    char[] out = new char[bytes.length * 2];
    for (int i = 0; i < bytes.length; i++) {
      out[i * 2] = digits[(bytes[i] >> 4) & 0xf];
      out[i * 2 + 1] = digits[bytes[i] & 0xf];
    }
    return new String(out);
  }
}
