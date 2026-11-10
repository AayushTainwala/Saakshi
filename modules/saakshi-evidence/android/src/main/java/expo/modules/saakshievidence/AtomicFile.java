package expo.modules.saakshievidence;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

/**
 * Replaces a small file in one step (repair round A, group 1): the locker's bookkeeping
 * (session.json), the device-key files and the recovery markers.
 *
 * The new contents go into a file beside the target ("<name>.tmp"), are flushed to storage, and
 * the file is then renamed over the target. On Android and Linux, File.renameTo is rename(2), which
 * puts the new file in the old one's place in a single step: a reader, or the app after a kill or
 * a power cut, finds the old file or the new one, whole, never an empty or half-written one. If
 * anything fails before the rename (the storage is full, say), the old file is untouched.
 *
 * Plain Java with no Android classes, so that verify/atomic-write.sh can run it on a JVM.
 */
public final class AtomicFile {
  /** The ending of the file written beside the target. A leftover one is removed when the app next opens. */
  public static final String TEMPORARY_SUFFIX = ".tmp";

  private AtomicFile() {}

  public static void write(File target, byte[] bytes) throws IOException {
    File temporary = new File(target.getPath() + TEMPORARY_SUFFIX);
    try (FileOutputStream out = new FileOutputStream(temporary)) {
      out.write(bytes);
      // Onto storage before the rename: otherwise a power cut could leave the new name on an empty file.
      out.getFD().sync();
    } catch (IOException error) {
      temporary.delete();
      throw error;
    }
    if (!temporary.renameTo(target)) {
      temporary.delete();
      throw new IOException("Could not put " + target.getName() + " in place");
    }
  }
}
