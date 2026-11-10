import type { CaptureSession, EndReason } from '@/modules/evidence';
import type { BatteryAction } from '@/platform/battery';
import type { StorageAction, StorageTarget } from '@/platform/storage';

import { WitnessThrottle } from './witness';

export type BugEngine = {
  session: CaptureSession;
  stop: (reason?: EndReason) => Promise<void>;
  /** The low-battery handover: the file closes as "low-battery" and a new one continues. */
  handOver: () => Promise<void>;
};

/**
 * The newest signed record of a bug-mode recording: a checkpoint (about every 10 seconds while the
 * file is written) or a file's own record (when it closes). Its SHA-256 is the chain head, which
 * vouches for everything recorded before it.
 */
export type SignedPoint = {
  sequence: number;
  recordSha256: string;
  /** What it covers up to: the checkpoint's time, or the file's end. */
  at: string;
};

export type BugDeps = {
  /** Starts recording; `onProblem` hears what goes wrong while it records. */
  startEngine: (onProblem: (message: string) => void, options: { startedFrom: StartedFrom }) => Promise<BugEngine>;
  /**
   * Watches the battery while recording (round 2, group 1.5): the warnings, the 5% handover and
   * the end of saving mode on charging. Returns the function that stops watching.
   */
  watchBattery?: (onAction: (action: BatteryAction) => void) => () => void;
  /** Saving mode on or off: live location sends every 5 minutes while it is on. */
  savingMode?: (on: boolean) => void;
  /**
   * The phone's free storage (SPEC section 4, "Storage", stage one; repair round A, group 2):
   * reading it, watching it while recording, the amount the user keeps free, the safety floor, and
   * how fast sound fills the phone.
   */
  storage?: {
    free: () => number | null;
    watch: (target: () => StorageTarget, onAction: (action: StorageAction) => void) => { stop: () => void };
    keepFreeBytes: () => number;
    floorBytes: number;
    bytesPerSecond: number;
  };
  /** Texts the message to trusted contacts with no tap; resolves to how many texts went, or 0. */
  witness: (message: string) => Promise<number>;
  /** How many texts a witness message costs now (one per contact), or 0 if it can't go. */
  witnessCost: () => Promise<number>;
  /** The witness text for the newest signed record of a recording that started at `startedAt`. */
  witnessText: (latest: SignedPoint, startedAt: string) => string;
  liveActivity: {
    start: () => Promise<void>;
    /** `signedAt`: the time the newest signed record covers up to. */
    update: (signedAt: string) => Promise<void>;
    end: () => Promise<void>;
  };
  now: () => Date;
};

/**
 * There is too little room on the phone to start: free space is at or below the amount the
 * recording would stop at. `keepFreeBytes` is null when that amount is the safety floor.
 */
export class NoRoomError extends Error {
  constructor(
    readonly freeBytes: number,
    readonly keepFreeBytes: number | null,
  ) {
    super('There is too little room on the phone to record');
  }
}

/** How a recording was started (bundle format 0.9, `capture.startedFrom`; written by group 1.5). */
export type StartedFrom = 'pocket' | 'phone-taken';

export type StartOptions = {
  startedFrom?: StartedFrom;
  /**
   * Saakshi's own Lock Screen Live Activity (iPhone). "My phone is being taken" turns it off, so the
   * locked screen shows less (SPEC 5.4); iOS's orange microphone dot still shows.
   */
  liveActivity?: boolean;
};

export type BugState = {
  running: boolean;
  startedFrom: StartedFrom | null;
  /** Whether Saakshi's Live Activity is shown for this recording. */
  liveActivity: boolean;
  /** At 5% battery: the file closed and a new one carries on, in saving mode until charging. */
  saving: boolean;
  /** The last battery warning, as a percentage, or null. */
  batteryWarning: number | null;
  /** The last storage warning: about this many minutes of room are left, or null. */
  storageMinutes: number | null;
  /** The phone isn't saying how much room is free. Nothing is stopped for this. */
  storageUnknown: boolean;
  /**
   * Why the last recording was stopped for lack of room: at the amount the user keeps free, or at
   * the safety floor. Null if it wasn't. Kept after the stop, for the screen to say.
   */
  stoppedForStorage: 'keep-free' | 'floor' | null;
  startedAt: string | null;
  sessionId: string | null;
  /** Checkpoints signed while the file was being written. */
  checkpoints: number;
  /** Files closed, hashed, signed and chained. */
  files: number;
  /** Files that could not be signed (kept as they are). */
  failed: number;
  /** What the newest signed record (checkpoint or file) covers up to. */
  lastSignedAt: string | null;
  witnessed: number;
  lastWitnessAt: string | null;
  error: string | null;
  /** The latest thing that went wrong while recording (recording carries on, or tries to). */
  problem: { message: string; at: string } | null;
};

const IDLE: BugState = {
  running: false,
  startedFrom: null,
  liveActivity: false,
  saving: false,
  batteryWarning: null,
  storageMinutes: null,
  storageUnknown: false,
  stoppedForStorage: null,
  startedAt: null,
  sessionId: null,
  checkpoints: 0,
  files: 0,
  failed: 0,
  lastSignedAt: null,
  witnessed: 0,
  lastWitnessAt: null,
  error: null,
  problem: null,
};

/** The Live Activity is updated at most this often (checkpoints come every 10 seconds). */
const ACTIVITY_UPDATE_MS = 60_000;

/**
 * Bug mode (spec E8): the phone records sound as one continuous file until stopped or the battery
 * runs out (fix round 1, as for body-cam). About every 10 seconds the evidence module signs a
 * checkpoint of the file into the session's chain; when the file closes it is sealed. After a new
 * signed record, the newest chain head is texted to trusted contacts where the phone can send with
 * no tap, at most once every 10 minutes (WitnessThrottle). Upload parts for E7 are the engine's.
 */
export class BugModeController {
  private current: BugState = IDLE;
  private listeners = new Set<() => void>();
  private engine: BugEngine | null = null;
  private unsubscribe: (() => void) | null = null;
  private seen = new Set<number>();
  private newest: SignedPoint | null = null;
  private throttle = new WitnessThrottle();
  private lastActivityUpdate: number | null = null;
  private starting: Promise<void> | null = null;
  private unwatchBattery: (() => void) | null = null;
  private unwatchStorage: (() => void) | null = null;
  /** "My phone is being taken" records past the amount kept free, down to the safety floor. */
  private toFloor = false;
  private work: Promise<void> = Promise.resolve();

  constructor(private readonly deps: BugDeps) {}

  getState = (): BugState => this.current;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /**
   * Starts recording. Resolves once recording has started. While it already runs, nothing restarts,
   * but `liveActivity: false` still takes the Live Activity away ("My phone is being taken" started
   * over a Pocket recording).
   */
  async start(options: StartOptions = {}): Promise<void> {
    if (this.starting) await this.starting.catch(() => undefined);
    if (this.current.running) {
      // Started over a Pocket recording: from now it records down to the floor.
      if (options.startedFrom === 'phone-taken') this.toFloor = true;
      if (options.liveActivity === false && this.current.liveActivity) {
        this.set({ ...this.current, liveActivity: false });
        await this.deps.liveActivity.end().catch(() => undefined);
      }
      return;
    }
    this.starting ??= this.begin({ startedFrom: options.startedFrom ?? 'pocket', liveActivity: options.liveActivity !== false }).finally(() => {
      this.starting = null;
    });
    return this.starting;
  }

  async stop(reason: EndReason = 'stopped'): Promise<void> {
    await this.starting?.catch(() => undefined);
    const engine = this.engine;
    if (!engine) return;
    this.engine = null;
    this.unwatchBattery?.();
    this.unwatchBattery = null;
    this.unwatchStorage?.();
    this.unwatchStorage = null;
    if (this.current.saving) this.deps.savingMode?.(false);
    try {
      await engine.stop(reason);
    } finally {
      this.scan(engine.session);
      await this.work;
      this.unsubscribe?.();
      this.unsubscribe = null;
      if (this.current.liveActivity) await this.deps.liveActivity.end().catch(() => undefined);
      this.set({ ...this.current, running: false, liveActivity: false });
    }
  }

  /** Lets the work queued for new signed records (witness texts, the Live Activity) finish. For tests. */
  settled(): Promise<void> {
    return this.work;
  }

  private async begin(options: { startedFrom: StartedFrom; liveActivity: boolean }): Promise<void> {
    this.seen = new Set();
    this.newest = null;
    this.lastActivityUpdate = null;
    this.toFloor = options.startedFrom === 'phone-taken';
    // It doesn't start with less room than it would stop at. A reading that fails is "unknown",
    // and never stops a start.
    const free = this.deps.storage?.free() ?? null;
    const limit = this.storageTarget()?.limitBytes;
    if (free !== null && limit !== undefined && free <= limit) {
      const error = new NoRoomError(free, this.toFloor ? null : limit);
      this.set({ ...IDLE, error: error.message });
      throw error;
    }
    try {
      const engine = await this.deps.startEngine(
        (message) => {
          if (this.current.running) this.set({ ...this.current, problem: { message, at: this.deps.now().toISOString() } });
        },
        { startedFrom: options.startedFrom },
      );
      this.engine = engine;
      this.set({
        ...IDLE,
        running: true,
        startedFrom: options.startedFrom,
        liveActivity: options.liveActivity,
        startedAt: this.deps.now().toISOString(),
        sessionId: engine.session.id,
      });
      this.unsubscribe = engine.session.subscribe(() => this.scan(engine.session));
      this.unwatchBattery = this.deps.watchBattery?.((action) => this.onBattery(action)) ?? null;
      this.unwatchStorage =
        this.deps.storage?.watch(
          () => this.storageTarget()!,
          (action) => this.onStorage(action),
        ).stop ?? null;
      if (options.liveActivity) await this.deps.liveActivity.start().catch(() => undefined);
    } catch (error) {
      this.set({ ...IDLE, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Low battery (SPEC E1, E8; round 2, group 1.5): warnings at 10% and 5%; at 5% the file closes
   * cleanly and a new one continues until the phone dies, with saving mode on; charging ends it.
   * Nothing stops the recording.
   */
  private onBattery(action: BatteryAction): void {
    const engine = this.engine;
    if (!engine || !this.current.running) return;
    if (action.type === 'warn') return this.set({ ...this.current, batteryWarning: action.percent });
    if (action.type === 'low') {
      this.set({ ...this.current, saving: true, batteryWarning: 5 });
      void engine.handOver().catch(() => undefined);
      this.deps.savingMode?.(true);
      return;
    }
    this.set({ ...this.current, saving: false });
    this.deps.savingMode?.(false);
  }

  /** What to watch for: the amount the user keeps free, or the floor for "My phone is being taken". */
  private storageTarget(): StorageTarget | null {
    const storage = this.deps.storage;
    if (!storage) return null;
    const floorBytes = storage.floorBytes;
    return { limitBytes: this.toFloor ? floorBytes : Math.max(storage.keepFreeBytes(), floorBytes), floorBytes, bytesPerSecond: storage.bytesPerSecond };
  }

  /**
   * Free storage, stage one (SPEC section 4, "Storage"; repair round A, group 2): warnings at about
   * 30 and 10 minutes of room left. Pocket recording stops cleanly, with the end reason
   * "storage-full", at the amount the user keeps free; "My phone is being taken" records past it
   * and stops at the safety floor. A reading that fails stops nothing.
   */
  private onStorage(action: StorageAction): void {
    if (!this.engine || !this.current.running) return;
    switch (action.type) {
      case 'warn':
        return this.set({ ...this.current, storageMinutes: action.minutes });
      case 'unknown':
        return this.set({ ...this.current, storageUnknown: true });
      case 'known':
        return this.set({ ...this.current, storageUnknown: false });
      case 'limit':
        // The limit was the keep-free amount when it was read; "My phone is being taken" may have
        // started since.
        if (this.toFloor) return;
        this.set({ ...this.current, stoppedForStorage: 'keep-free' });
        void this.stop('storage-full').catch(() => undefined);
        return;
      case 'floor':
        this.set({ ...this.current, stoppedForStorage: 'floor' });
        void this.stop('storage-full').catch(() => undefined);
    }
  }

  /** Picks out checkpoints and files that have just been signed, and files that failed. */
  private scan(session: CaptureSession): void {
    let { checkpoints, files, failed } = this.current;
    let newest = this.newest;
    for (const checkpoint of session.checkpoints) {
      if (this.seen.has(checkpoint.sequence) || checkpoint.status !== 'sealed' || !checkpoint.recordSha256) continue;
      this.seen.add(checkpoint.sequence);
      checkpoints++;
      if (!newest || checkpoint.sequence > newest.sequence) {
        newest = { sequence: checkpoint.sequence, recordSha256: checkpoint.recordSha256, at: checkpoint.at };
      }
    }
    for (const item of session.items) {
      if (this.seen.has(item.sequence)) continue;
      if (item.status === 'sealed' && item.recordSha256) {
        this.seen.add(item.sequence);
        files++;
        if (!newest || item.sequence > newest.sequence) {
          newest = { sequence: item.sequence, recordSha256: item.recordSha256, at: item.endedAt };
        }
      } else if (item.status === 'failed') {
        this.seen.add(item.sequence);
        failed++;
      }
    }
    const changed = newest !== this.newest;
    if (
      !changed &&
      checkpoints === this.current.checkpoints &&
      files === this.current.files &&
      failed === this.current.failed &&
      session.id === this.current.sessionId
    ) {
      return;
    }
    this.newest = newest;
    this.set({ ...this.current, sessionId: session.id, checkpoints, files, failed, lastSignedAt: newest?.at ?? null });
    if (changed && newest) {
      const latest = newest;
      this.work = this.work.then(() => this.afterSigned(latest));
    }
  }

  private async afterSigned(latest: SignedPoint): Promise<void> {
    const now = this.deps.now().getTime();
    if (this.current.liveActivity && (this.lastActivityUpdate === null || now - this.lastActivityUpdate >= ACTIVITY_UPDATE_MS)) {
      this.lastActivityUpdate = now;
      await this.deps.liveActivity.update(latest.at).catch(() => undefined);
    }

    // Cheap check first: most new checkpoints come well inside the 10 minutes.
    if (!this.throttle.due(now)) return;
    // A later record may have come while this waited: text the newest.
    const newest = this.newest && this.newest.sequence > latest.sequence ? this.newest : latest;
    const cost = await this.deps.witnessCost().catch(() => 0);
    if (cost > 0 && this.throttle.allow(cost, this.deps.now().getTime())) {
      const text = this.deps.witnessText(newest, this.current.startedAt ?? newest.at);
      const sent = await this.deps.witness(text).catch(() => 0);
      if (sent > 0) {
        this.set({ ...this.current, witnessed: this.current.witnessed + 1, lastWitnessAt: this.deps.now().toISOString() });
      }
    }
  }

  private set(state: BugState): void {
    this.current = state;
    for (const listener of this.listeners) listener();
  }
}
