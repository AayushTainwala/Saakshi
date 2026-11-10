import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { POLL_MS } from './limits';
import { type StorageAction, storageMonitor, type StorageReading } from './monitor';
import { readFreeBytes } from './read';
import { loadStorageSettings, type StorageSettings, subscribeToStorageSettings } from './settings';

/** What a recorder is watching for now; asked at each reading, so it can change while recording. */
export type StorageTarget = Omit<StorageReading, 'freeBytes'>;

export type StorageWatch = {
  stop: () => void;
  /** Starts the warnings again, after the target changes (body-cam carrying on as sound only). */
  reset: () => void;
};

/**
 * Reads the phone's free space now and every 10 seconds until stopped, and calls `onAction` for the
 * warnings, the limit and the floor (monitor.ts). For code that isn't a screen, such as Pocket
 * recording's controller; screens use it too.
 */
export function watchStorage(
  target: () => StorageTarget,
  onAction: (action: StorageAction, freeBytes: number | null) => void,
  read: () => number | null = readFreeBytes,
  /** Every reading, whether or not anything follows from it. */
  onReading?: (freeBytes: number | null) => void,
): StorageWatch {
  const monitor = storageMonitor();
  const check = () => {
    const freeBytes = read();
    onReading?.(freeBytes);
    for (const action of monitor({ ...target(), freeBytes })) onAction(action, freeBytes);
  };
  check();
  const timer = setInterval(check, POLL_MS);
  return { stop: () => clearInterval(timer), reset: () => monitor.reset() };
}

/** The phone's free space, read now and every 10 seconds while `active`; null when not known. */
export function useFreeBytes(active = true): number | null {
  const [reading, setReading] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setReading((n) => n + 1), POLL_MS);
    return () => clearInterval(timer);
  }, [active]);
  // Read when it starts showing, and again at each tick.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `reading` stands for "ten seconds have passed"
  return useMemo(() => (active ? readFreeBytes() : null), [active, reading]);
}

export function useStorageSettings(): StorageSettings {
  return useSyncExternalStore(subscribeToStorageSettings, loadStorageSettings);
}
