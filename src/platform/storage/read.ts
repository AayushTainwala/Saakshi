import { Paths } from 'expo-file-system';

/**
 * The phone's free space in bytes, or null when the phone doesn't say. Read through the file
 * library's current call, `Paths.availableDiskSpace` (the older `getFreeDiskStorageAsync` now
 * throws). In expo-file-system 58.0.10 that is:
 *
 * - **iPhone:** `FileManager.attributesOfFileSystem(forPath:)[.systemFreeSize]` for the app's
 *   documents folder: the file system's own count of free bytes. iPhone has other figures
 *   (`volumeAvailableCapacityForImportantUsage` and `…ForOpportunisticUsage`), which add space
 *   iOS could clear by removing caches. The one used here does not count that, so the real room
 *   can be more than Saakshi says, never less on that account.
 * - **Android:** `File.getFreeSpace()` on the app's files folder: every unallocated byte,
 *   including any the file system keeps back from ordinary apps (`getUsableSpace()` leaves those
 *   out). So this can be a little more than Saakshi can really write. The safety floor's margin is
 *   there for that (limits.ts).
 *
 * A failed reading is "unknown": callers never stop a recording because of it.
 */
export function readFreeBytes(): number | null {
  try {
    return usable(Paths.availableDiskSpace);
  } catch {
    return null;
  }
}

/** The phone's whole storage in bytes, or null when the phone doesn't say. */
export function readTotalBytes(): number | null {
  try {
    return usable(Paths.totalDiskSpace);
  } catch {
    return null;
  }
}

function usable(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
