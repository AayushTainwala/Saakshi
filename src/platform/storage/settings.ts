import { File, Paths } from 'expo-file-system';

import { GB, KEEP_FREE_CHOICES_GB, startingKeepFreeBytes } from './limits';
import { readTotalBytes } from './read';

/** Settings → Storage (repair round A, group 2), kept on the phone in `storage.json`. */
export type StorageSettings = {
  /** How much of the phone to leave for everything else, in bytes. */
  keepFreeBytes: number;
  /** At the keep-free amount, body-cam carries on as sound only instead of stopping. On by default. */
  bodyCamSoundOnly: boolean;
  /** The user has read what Saakshi does about storage (shown the first time body-cam or Pocket recording opens). */
  explained: boolean;
};

export function defaultStorageSettings(totalBytes: number | null = readTotalBytes()): StorageSettings {
  return { keepFreeBytes: startingKeepFreeBytes(totalBytes), bodyCamSoundOnly: true, explained: false };
}

/** What is stored, made whole: anything missing or not one of the offered amounts takes its default. */
export function normalizeStorageSettings(raw: unknown, defaults: StorageSettings): StorageSettings {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<StorageSettings>;
  const offered = KEEP_FREE_CHOICES_GB.some((gb) => gb * GB === value.keepFreeBytes);
  return {
    keepFreeBytes: offered ? (value.keepFreeBytes as number) : defaults.keepFreeBytes,
    bodyCamSoundOnly: typeof value.bodyCamSoundOnly === 'boolean' ? value.bodyCamSoundOnly : defaults.bodyCamSoundOnly,
    explained: value.explained === true,
  };
}

const file = () => new File(Paths.document, 'storage.json');

type Listener = () => void;
const listeners = new Set<Listener>();
let cached: StorageSettings | null = null;

export function loadStorageSettings(): StorageSettings {
  if (cached) return cached;
  const defaults = defaultStorageSettings();
  try {
    const stored = file();
    cached = stored.exists ? normalizeStorageSettings(JSON.parse(stored.textSync()), defaults) : defaults;
  } catch {
    cached = defaults;
  }
  return cached;
}

export function saveStorageSettings(patch: Partial<StorageSettings>): StorageSettings {
  const next = { ...loadStorageSettings(), ...patch };
  cached = next;
  try {
    const stored = file();
    if (!stored.exists) stored.create({ intermediates: true });
    stored.writeSync(JSON.stringify(next));
  } catch {
    // Kept for this run of the app; asked again next time.
  }
  for (const listener of listeners) listener();
  return next;
}

export function subscribeToStorageSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
