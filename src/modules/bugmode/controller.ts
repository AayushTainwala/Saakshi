import type { CaptureSession, EndReason } from '@/modules/evidence';

import { WitnessThrottle } from './witness';

export type BugEngine = {
  session: CaptureSession;
  stop: (reason?: EndReason) => Promise<void>;
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
  startEngine: (onProblem: (message: string) => void) => Promise<BugEngine>;
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

export type BugState = {
  running: boolean;
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
  private work: Promise<void> = Promise.resolve();

  constructor(private readonly deps: BugDeps) {}

  getState = (): BugState => this.current;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Starts recording. Resolves once recording has started; ignored while running. */
  start(): Promise<void> {
    if (this.current.running) return Promise.resolve();
    this.starting ??= this.begin().finally(() => {
      this.starting = null;
    });
    return this.starting;
  }

  async stop(reason: EndReason = 'stopped'): Promise<void> {
    await this.starting?.catch(() => undefined);
    const engine = this.engine;
    if (!engine) return;
    this.engine = null;
    try {
      await engine.stop(reason);
    } finally {
      this.scan(engine.session);
      await this.work;
      this.unsubscribe?.();
      this.unsubscribe = null;
      await this.deps.liveActivity.end().catch(() => undefined);
      this.set({ ...this.current, running: false });
    }
  }

  /** Lets the work queued for new signed records (witness texts, the Live Activity) finish. For tests. */
  settled(): Promise<void> {
    return this.work;
  }

  private async begin(): Promise<void> {
    this.seen = new Set();
    this.newest = null;
    this.lastActivityUpdate = null;
    try {
      const engine = await this.deps.startEngine((message) => {
        if (this.current.running) this.set({ ...this.current, problem: { message, at: this.deps.now().toISOString() } });
      });
      this.engine = engine;
      this.set({ ...IDLE, running: true, startedAt: this.deps.now().toISOString(), sessionId: engine.session.id });
      this.unsubscribe = engine.session.subscribe(() => this.scan(engine.session));
      await this.deps.liveActivity.start().catch(() => undefined);
    } catch (error) {
      this.set({ ...IDLE, error: error instanceof Error ? error.message : String(error) });
      throw error;
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
    if (this.lastActivityUpdate === null || now - this.lastActivityUpdate >= ACTIVITY_UPDATE_MS) {
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
