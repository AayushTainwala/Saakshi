/**
 * The phone's free storage, shared by every recorder (SPEC section 4, "Storage", stage one; repair
 * round A, group 2): reading free space, the safety floor, the keep-free setting, how long the free
 * room allows, and the warnings as it runs low. Not a feature module: any module may import it.
 */
export { GB, KEEP_FREE_CHOICES_GB, type KeepFreeGb, MB, POLL_MS, SAFETY_FLOOR_BYTES, startingKeepFreeBytes, WARN_MINUTES } from './limits';
export { canStart, roundedMinutes, secondsLeft, type StorageAction, storageMonitor, type StorageReading } from './monitor';
export { bytesPerHour, cameraBytesPerSecond, soundBytesPerSecond, videoBytesPerSecond } from './rates';
export { readFreeBytes, readTotalBytes } from './read';
export { loadStorageSettings, saveStorageSettings, type StorageSettings } from './settings';
export { type StorageTarget, type StorageWatch, useFreeBytes, useStorageSettings, watchStorage } from './watch';
export { noRoomLabel, roomLabel, RoomLine, sizeLabel, StorageExplainer, timeLeftLabel } from './RoomLine';
