import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';

import { LIVE_HOURS_CHOICES, type LiveHours } from './config';

/**
 * How long live location lasts when it is started (Settings → Live-location length; SPEC 5.8):
 * 1, 4, 8 or 24 hours, 4 by default (owner, 6 Nov 2026). Before round 2 the length was chosen each
 * time, starting at 4 hours, so nobody had a stored value to keep.
 */
export const DEFAULT_LIVE_HOURS: LiveHours = 4;

export type LengthStorage = { read(): string | null; write(text: string): void };

export function sanitizeLiveHours(raw: unknown): LiveHours {
  const hours = (raw as { hours?: unknown } | null)?.hours;
  return LIVE_HOURS_CHOICES.includes(hours as LiveHours) ? (hours as LiveHours) : DEFAULT_LIVE_HOURS;
}

export class LiveLengthStore {
  private value: LiveHours | null = null;
  private listeners = new Set<() => void>();

  constructor(private readonly storage: LengthStorage) {}

  get = (): LiveHours => {
    if (this.value === null) {
      try {
        const text = this.storage.read();
        this.value = text ? sanitizeLiveHours(JSON.parse(text)) : DEFAULT_LIVE_HOURS;
      } catch {
        this.value = DEFAULT_LIVE_HOURS;
      }
    }
    return this.value;
  };

  set(hours: LiveHours): void {
    if (!LIVE_HOURS_CHOICES.includes(hours)) return;
    this.storage.write(JSON.stringify({ version: 1, hours }));
    this.value = hours;
    for (const listener of this.listeners) listener();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

const FILE_NAME = 'live-length.json';

export const liveLength = new LiveLengthStore({
  read() {
    const file = new File(Paths.document, FILE_NAME);
    return file.exists ? file.textSync() : null;
  },
  write(text) {
    const file = new File(Paths.document, FILE_NAME);
    if (!file.exists) file.create();
    file.writeSync(text);
  },
});

export function useLiveLength(): LiveHours {
  return useSyncExternalStore(liveLength.subscribe, liveLength.get);
}
