import { batteryToShare } from '@/platform/battery';

import type { LiveApi, LivePoint } from './api';
import { viewerLink } from './config';

/** The phone's side of one live share, kept in a file so the background task can read it. */
export type LiveShare = {
  shareId: string;
  /** Proves to the server that this phone owns the share. Never leaves the phone except to it. */
  writeSecret: string;
  viewToken: string;
  link: string;
  startedAt: string;
  /** When the server deletes it. A persistent share's end moves on with every position. */
  expiresAt: string;
  /**
   * "My phone is being taken" (SPEC 5.4): no fixed end; the server keeps it while the phone
   * reports, and deletes it a week after the last position. Absent in shares saved before round 2.
   */
  persistent?: boolean;
  lastSentAt: string | null;
  /** Positions not yet accepted by the server (no signal), oldest first. */
  pending: LivePoint[];
  /**
   * Saving mode (round 2, group 1.5): at 5% battery in body-cam or Pocket recording, positions go
   * to the server in one burst every 5 minutes, not as they come. Absent in older shares.
   */
  saving?: boolean;
};

/** In saving mode, positions are sent at most this often. */
export const SAVING_SEND_MS = 5 * 60 * 1000;

type Saved = {
  version: 1;
  active: LiveShare | null;
  /** Shares stopped while offline; the server is told when the signal returns. */
  unstopped: { shareId: string; writeSecret: string }[];
};

/**
 * The battery level goes with the newest position of each delivery: it is the level now, so the
 * older ones in the same delivery (iPhone can hold a few back) are left without one. Only at 20%
 * or less (SPEC 5.2; round 2, group 1.6): above that, or when the phone can't read it, no position
 * carries `bat`.
 */
export function withBattery(points: LivePoint[], reading: number | null): LivePoint[] {
  const battery = batteryToShare(reading);
  if (battery === null || points.length === 0) return points;
  let newest = 0;
  points.forEach((point, i) => {
    if (Date.parse(point.at) >= Date.parse(points[newest].at)) newest = i;
  });
  return points.map((point, i) => (i === newest ? { ...point, bat: battery } : point));
}

/** Positions kept on the phone while there's no signal; the oldest are dropped first. */
export const MAX_PENDING = 120;
/** The server takes at most this many positions per call. */
const BATCH = 60;

export type LiveStorage = { read(): string | null; write(text: string): void };

/** What Android shows in the notification while sharing (a foreground service needs one). */
export type TrackerNotice = { title: string; body: string };

export type Tracker = {
  /** Starts position updates that continue with the screen locked. */
  start(notice: TrackerNotice): Promise<void>;
  stop(): Promise<void>;
  /**
   * Saving mode's GPS (round 2, group 1.6): slows the position updates already running, where the
   * phone can do it without stopping and restarting them (iPhone only; see task.ts). Never starts
   * updates that aren't running. Resolves whether it changed anything.
   */
  setSaving?(on: boolean): Promise<boolean>;
};

export type LiveDeps = {
  api: LiveApi;
  storage: LiveStorage;
  randomHex: (bytes: number) => string;
  sha256Hex: (text: string) => Promise<string>;
  tracker: Tracker;
  now: () => Date;
};

/**
 * Live location by link (spec S3). Starting a share creates it on the server, starts position
 * updates and returns the link for contacts. Positions go to the server as they come (or as soon
 * as there is signal). Stopping deletes the share and every position on the server. A share also
 * ends by itself at its expiry, when the server deletes it.
 */
export class LiveShareController {
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();
  private snapshot: LiveShare | null = null;

  constructor(private readonly deps: LiveDeps) {
    this.snapshot = this.load().active;
  }

  /** The share in progress, or null. */
  getShare = (): LiveShare | null => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /**
   * Starts sharing for some hours, or returns the share already running. With `persistent`, the
   * share has no fixed end; a share already running is made persistent, keeping its link.
   */
  start(hours: number, notice: TrackerNotice, options: { persistent?: boolean } = {}): Promise<LiveShare> {
    return this.serial(async () => {
      const saved = this.load();
      if (saved.active && !this.expired(saved.active)) {
        const running = saved.active;
        if (!options.persistent || running.persistent) return running;
        const ends = await this.deps.api.keep(running.shareId, running.writeSecret);
        if (ends !== null) {
          const kept: LiveShare = { ...running, persistent: true, expiresAt: ends };
          this.save({ ...saved, active: kept });
          return kept;
        }
        // It had already ended on the server: start afresh below.
        await this.deps.tracker.stop().catch(() => undefined);
        this.save({ ...saved, active: null });
      }

      const persistent = options.persistent === true;
      const writeSecret = this.deps.randomHex(32);
      const started = await this.deps.api.start(await this.deps.sha256Hex(writeSecret), hours, persistent);
      const share: LiveShare = {
        ...started,
        writeSecret,
        link: viewerLink(started.viewToken),
        startedAt: this.deps.now().toISOString(),
        lastSentAt: null,
        pending: [],
        ...(persistent ? { persistent: true } : {}),
      };
      this.save({ ...this.load(), active: share });
      try {
        await this.deps.tracker.start(notice);
      } catch (error) {
        // Without positions the link would show nothing: take the share down again.
        this.save({ ...this.load(), active: null });
        await this.deps.api.stop(share.shareId, writeSecret).catch(() => undefined);
        throw error;
      }
      return share;
    });
  }

  /**
   * Saving mode on or off (round 2, groups 1.5 and 1.6). Positions are kept and sent every 5
   * minutes. The phone's location updates are never stopped and restarted for it (a backgrounded
   * app may not start them again: Android refuses a foreground service then, and iPhone can't
   * start location updates); where the phone can slow the updates already running without that
   * (iPhone), the tracker does so. A failure there changes nothing: live location carries on.
   */
  setSaving(on: boolean): Promise<void> {
    return this.serial(async () => {
      const saved = this.load();
      if (!saved.active || !!saved.active.saving === on) return;
      this.save({ ...saved, active: { ...saved.active, saving: on } });
      await this.deps.tracker.setSaving?.(on).catch(() => false);
    });
  }

  /** New positions from the phone. Sends them with anything still waiting. */
  receive(points: LivePoint[]): Promise<void> {
    return this.serial(async () => {
      const saved = this.load();
      const share = saved.active;
      if (!share) return;
      if (this.expired(share)) return this.end(saved);

      const pending = [...share.pending, ...points].slice(-MAX_PENDING);
      // Saving mode: held until 5 minutes after the last send, then sent in one burst.
      const sentAt = share.lastSentAt ? Date.parse(share.lastSentAt) : null;
      if (share.saving && sentAt !== null && this.deps.now().getTime() - sentAt < SAVING_SEND_MS) {
        this.save({ ...saved, active: { ...share, pending } });
        return;
      }
      let sent = 0;
      let expiresAt = share.expiresAt;
      try {
        while (sent < pending.length) {
          const batch = pending.slice(sent, sent + BATCH);
          const ends = await this.deps.api.push(share.shareId, share.writeSecret, batch);
          if (ends === null) return this.end(saved);
          // A persistent share's end moves on with each position.
          expiresAt = ends;
          sent += batch.length;
        }
      } catch {
        // No signal: keep what wasn't sent for next time.
      }
      this.save({
        ...saved,
        active: {
          ...share,
          expiresAt,
          pending: pending.slice(sent),
          lastSentAt: sent > 0 ? this.deps.now().toISOString() : share.lastSentAt,
        },
      });
    });
  }

  /** Stops sharing: position updates stop, and the server deletes the share and its positions. */
  stop(): Promise<void> {
    return this.serial(async () => {
      const saved = this.load();
      await this.deps.tracker.stop().catch(() => undefined);
      if (!saved.active) return;
      const { shareId, writeSecret } = saved.active;
      const next: Saved = { ...saved, active: null };
      try {
        await this.deps.api.stop(shareId, writeSecret);
      } catch {
        next.unstopped = [...next.unstopped, { shareId, writeSecret }];
      }
      this.save(next);
    });
  }

  /** Tells the server about shares stopped while offline. Call when the app opens. */
  retryStops(): Promise<void> {
    return this.serial(async () => {
      const saved = this.load();
      const left: Saved['unstopped'] = [];
      for (const entry of saved.unstopped) {
        try {
          await this.deps.api.stop(entry.shareId, entry.writeSecret);
        } catch {
          left.push(entry);
        }
      }
      if (left.length !== saved.unstopped.length) this.save({ ...saved, unstopped: left });
      if (saved.active && this.expired(saved.active)) await this.end(this.load());
    });
  }

  private async end(saved: Saved): Promise<void> {
    await this.deps.tracker.stop().catch(() => undefined);
    this.save({ ...saved, active: null });
  }

  private expired(share: LiveShare): boolean {
    return Date.parse(share.expiresAt) <= this.deps.now().getTime();
  }

  private serial<T>(work: () => Promise<T>): Promise<T> {
    const result = this.queue.then(work);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private load(): Saved {
    try {
      const text = this.deps.storage.read();
      const raw = text ? (JSON.parse(text) as Partial<Saved>) : {};
      return {
        version: 1,
        active: raw.active ?? null,
        unstopped: Array.isArray(raw.unstopped) ? raw.unstopped : [],
      };
    } catch {
      return { version: 1, active: null, unstopped: [] };
    }
  }

  private save(saved: Saved): void {
    this.deps.storage.write(JSON.stringify(saved));
    if (saved.active !== this.snapshot) {
      this.snapshot = saved.active;
      for (const listener of this.listeners) listener();
    }
  }
}
