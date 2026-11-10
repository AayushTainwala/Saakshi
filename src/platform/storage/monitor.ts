import { WARN_MINUTES } from './limits';

/** What a recorder is watching for: free space, the amount to stop at, and how fast it writes. */
export type StorageReading = {
  /** The phone's free space now, or null if the phone didn't say. */
  freeBytes: number | null;
  /** Free space at which this recorder acts: the keep-free amount, or the safety floor. */
  limitBytes: number;
  /** The safety floor, at which everything stops. */
  floorBytes: number;
  bytesPerSecond: number;
};

export type StorageAction =
  /** About this many minutes of recording are left before `limitBytes`. */
  | { type: 'warn'; minutes: number }
  /** Free space is at or below `limitBytes` (and still above the floor). */
  | { type: 'limit' }
  /** Free space is at or below the safety floor: stop now. */
  | { type: 'floor' }
  /** The phone didn't say how much is free. Nothing is stopped for this. */
  | { type: 'unknown' }
  /** The phone says again. */
  | { type: 'known' };

/**
 * How many seconds of recording fit between `freeBytes` and `limitBytes` at this rate. Zero at or
 * below the limit; null when the free space or the rate isn't known.
 */
export function secondsLeft(freeBytes: number | null, limitBytes: number, bytesPerSecond: number): number | null {
  if (freeBytes === null || !(bytesPerSecond > 0)) return null;
  return Math.max(0, Math.floor((freeBytes - limitBytes) / bytesPerSecond));
}

/**
 * Turns free-space readings into actions, each once, on the way down (as batteryMonitor does for
 * the battery). "floor" comes even if "limit" never did; after "floor" nothing more comes. A
 * reading that fails gives "unknown" once, and nothing else: a recording is never stopped because
 * the phone couldn't be asked. `reset()` starts the warnings again, for when the limit or the rate
 * changes (body-cam carrying on as sound only).
 */
export function storageMonitor(warnMinutes: readonly number[] = WARN_MINUTES) {
  let warned = new Set<number>();
  let atLimit = false;
  let atFloor = false;
  let unknown = false;
  const check = (reading: StorageReading): StorageAction[] => {
    const { freeBytes, limitBytes, floorBytes } = reading;
    if (freeBytes === null) {
      if (unknown) return [];
      unknown = true;
      return [{ type: 'unknown' }];
    }
    const actions: StorageAction[] = [];
    if (unknown) {
      unknown = false;
      actions.push({ type: 'known' });
    }
    if (atFloor) return actions;
    if (freeBytes <= floorBytes) {
      atFloor = true;
      atLimit = true;
      actions.push({ type: 'floor' });
      return actions;
    }
    if (freeBytes <= limitBytes) {
      if (!atLimit) {
        atLimit = true;
        actions.push({ type: 'limit' });
      }
      return actions;
    }
    // Room came back (the user deleted something): the limit can be reached again.
    atLimit = false;
    const left = secondsLeft(freeBytes, limitBytes, reading.bytesPerSecond);
    if (left === null) return actions;
    // Only the nearest warning passed is said: starting with 8 minutes left says "10 minutes" once.
    const passed = [...warnMinutes].sort((a, b) => a - b).find((minutes) => left <= minutes * 60);
    if (passed !== undefined && !warned.has(passed)) {
      for (const minutes of warnMinutes) if (minutes >= passed) warned.add(minutes);
      actions.push({ type: 'warn', minutes: passed });
    }
    return actions;
  };
  return Object.assign(check, {
    reset() {
      warned = new Set();
      atLimit = false;
    },
  });
}

/** Whether a recording may start: free space must be above the amount it would stop at. */
export function canStart(freeBytes: number | null, limitBytes: number): boolean {
  // Unknown is not "full": a failed reading never stops a recording by itself.
  return freeBytes === null || freeBytes > limitBytes;
}

/** "About" a length of time: whole minutes under an hour, steps of 5 minutes under 5 hours, then of 30. */
export function roundedMinutes(seconds: number): number {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes;
  const step = minutes < 300 ? 5 : 30;
  return Math.floor(minutes / step) * step;
}
