import expo.modules.saakshievidence.StreamingHasher;
import java.io.File;

/** Runs the Android module's StreamingHasher on a file and prints its result, time and peak heap. */
public final class HashLargeFile {
  public static void main(String[] args) throws Exception {
    File file = new File(args[0]);
    Runtime runtime = Runtime.getRuntime();
    long start = System.nanoTime();
    StreamingHasher.Result result = StreamingHasher.hash(file);
    double seconds = (System.nanoTime() - start) / 1e9;
    long usedMb = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024);
    System.out.printf(
        "size=%d%nsha256=%s%nsha1=%s%nmd5=%s%ncrc32=%d%nseconds=%.1f%nmaxHeapMb=%d%nusedHeapMb=%d%n",
        result.size, result.sha256, result.sha1, result.md5, result.crc32, seconds,
        runtime.maxMemory() / (1024 * 1024), usedMb);
  }
}
