import type { CaptureSession, EndReason, EvidenceItem } from '@/modules/evidence';

import { WitnessThrottle } from './witness';

/** Bug mode's pieces are this long (spec E8: 1–3 minutes). */
export const BUG_PIECE_SECONDS = 120;

export type BugEngine = {
  session: CaptureSession;
  stop: (reason?: EndReason) => Promise<void>;
};

/** Copies a sealed piece to the user's cloud (E7). Provided by the cloud module once it exists. */
export type PieceUploader = (piece: { sessionId: string; item: EvidenceItem }) => Promise<void>;

export type BugDeps = {
  startEngine: () => Promise<BugEngine>;
  /** Texts the message to trusted contacts with no tap; resolves to how many texts went, or 0. */
  witness: (message: string) => Promise<number>;
  /** How many texts a witness message costs now (one per contact), or 0 if it can't go. */
  witnessCost: () => Promise<number>;
  witnessText: (item: EvidenceItem, pieces: number) => string;
  liveActivity: {
    start: () => Promise<void>;
    update: (pieces: number) => Promise<void>;
    end: () => Promise<void>;
  };
  uploader: () => PieceUploader | null;
  now: () => Date;
};

export type BugState = {
  running: boolean;
  startedAt: string | null;
  sessionId: string | null;
  /** Pieces hashed, signed and chained. */
  sealed: number;
  failed: number;
  witnessed: number;
  lastWitnessAt: string | null;
  error: string | null;
};

const IDLE: BugState = {
  running: false,
  startedAt: null,
  sessionId: null,
  sealed: 0,
  failed: 0,
  witnessed: 0,
  lastWitnessAt: null,
  error: null,
};

/**
 * Bug mode (spec E8): the phone records sound in fixed pieces until stopped or the battery runs
 * out. Each piece is sealed by the evidence module as it is saved; then its chain head is texted to
 * trusted contacts where the phone can send with no tap (within Android's limit), and the piece is
 * handed to the cloud uploader (E7) when there is one.
 */
export class BugModeController {
  private current: BugState = IDLE;
  private listeners = new Set<() => void>();
  private engine: BugEngine | null = null;
  private unsubscribe: (() => void) | null = null;
  private seen = new Set<number>();
  private throttle = new WitnessThrottle();
  private starting: Promise<void> | null = null;
  private work: Promise<void> = Promise.resolve();

  constructor(private readonly deps: BugDeps) {}

  getState = (): BugState => this.current;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Starts recording. Resolves once the first piece is recording; ignored while running. */
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

  /** Lets the work queued for sealed pieces (witness texts, uploads) finish. For tests. */
  settled(): Promise<void> {
    return this.work;
  }

  private async begin(): Promise<void> {
    this.seen = new Set();
    try {
      const engine = await this.deps.startEngine();
      this.engine = engine;
      this.set({ ...IDLE, running: true, startedAt: this.deps.now().toISOString(), sessionId: engine.session.id });
      this.unsubscribe = engine.session.subscribe(() => this.scan(engine.session));
      await this.deps.liveActivity.start().catch(() => undefined);
    } catch (error) {
      this.set({ ...IDLE, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /** Picks out pieces that have just been sealed or have failed. */
  private scan(session: CaptureSession): void {
    for (const item of session.items) {
      if (this.seen.has(item.sequence)) continue;
      if (item.status === 'sealed') {
        this.seen.add(item.sequence);
        this.set({ ...this.current, sessionId: session.id, sealed: this.current.sealed + 1 });
        const pieces = this.current.sealed;
        this.work = this.work.then(() => this.afterSealed(session.id!, item, pieces));
      } else if (item.status === 'failed') {
        this.seen.add(item.sequence);
        this.set({ ...this.current, failed: this.current.failed + 1 });
      }
    }
  }

  private async afterSealed(sessionId: string, item: EvidenceItem, pieces: number): Promise<void> {
    await this.deps.liveActivity.update(pieces).catch(() => undefined);

    const cost = await this.deps.witnessCost().catch(() => 0);
    if (cost > 0 && this.throttle.allow(cost, this.deps.now().getTime())) {
      const sent = await this.deps.witness(this.deps.witnessText(item, pieces)).catch(() => 0);
      if (sent > 0) {
        this.set({ ...this.current, witnessed: this.current.witnessed + 1, lastWitnessAt: this.deps.now().toISOString() });
      }
    }

    const upload = this.deps.uploader();
    if (upload) await upload({ sessionId, item }).catch(() => undefined);
  }

  private set(state: BugState): void {
    this.current = state;
    for (const listener of this.listeners) listener();
  }
}
