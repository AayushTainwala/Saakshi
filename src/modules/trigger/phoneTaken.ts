/**
 * "My phone is being taken" (SPEC 5.4; round 2, group 1.3). One swipe starts, each part on its own
 * so that one failing does not stop the rest:
 *   - the SOS alert to the people ticked for SOS alerts (with the live link if it is ready within a
 *     few seconds; otherwise the link follows on its own);
 *   - live location with no fixed end (the server keeps it while the phone reports, and deletes it
 *     a week after the last position);
 *   - Pocket recording, without Saakshi's Lock Screen Live Activity (it carries its own low-battery
 *     handover, group 1.5, and its upload parts go to E7 once that exists);
 *   - the silence alarm's heartbeat (group 3.5), through the `heartbeat` seam below.
 * Once all of them have started (group 1.7), the screen is locked where the user has allowed it
 * (Android's device admin, force-lock only), so that nothing waits on an unlock. Where it can't be
 * (iPhone, or Android with it off), the page asks the user, first and large, to lock the phone.
 * It needs a secret code to start, and stops only through the code screen: inside Saakshi it can
 * only be stopped with the code. (The phone's own controls remain: force-quit, switch-off, airplane
 * mode. That is what the silence alarm is for.)
 */

/** The alert won't wait longer than this for the live link. */
export const LIVE_WAIT_MS = 8000;

export type PartState = 'starting' | 'on' | 'failed' | 'off';
export type AlertPart = 'sending' | 'sent' | 'failed' | null;

export type PhoneTakenState = {
  active: boolean;
  startedAt: string | null;
  alert: AlertPart;
  live: PartState;
  pocket: PartState;
  /** What went wrong, part by part, in the order it happened (shown to the user). */
  errors: { part: 'alert' | 'live' | 'pocket' | 'link'; message: string }[];
  /**
   * "Now lock your phone", shown first and large once everything has started, where Saakshi didn't
   * lock the screen itself. It goes when the app goes to the background (the screen locked, or
   * the user left). Not kept across a restart.
   */
  lockReminder: boolean;
};

export const IDLE: PhoneTakenState = {
  active: false,
  startedAt: null,
  alert: null,
  live: 'off',
  pocket: 'off',
  errors: [],
  lockReminder: false,
};

export type PhoneTakenDeps = {
  storage: { read(): string | null; write(text: string): void };
  /** Whether a secret code is set: without one, this can't start. */
  codeIsSet: () => Promise<boolean>;
  /** The code screen; true for the right code. */
  requireCode: () => Promise<boolean>;
  startPocket: () => Promise<void>;
  stopPocket: () => Promise<void>;
  /** Starts live location with no fixed end, without texting the link; resolves to the link and its invite. */
  startLive: () => Promise<{ link: string; invite: string }>;
  stopLive: () => Promise<void>;
  /** Sends the SOS alert at once, with the live link if there is one. */
  alert: (liveLink?: string) => Promise<void>;
  /**
   * Texts the live link on its own to the people ticked for live location: all of them when the
   * link came after the alert had gone, or only those not ticked for SOS alerts when the alert
   * carried it.
   */
  textLink: (invite: string, to: 'all' | 'not-alerted') => Promise<void>;
  /**
   * The silence alarm (group 3.5) plugs in here: its heartbeat starts with this mode and stops only
   * when the mode is stopped with the code. Until 3.5, nothing.
   */
  heartbeat: { start(): void; stop(): void };
  /**
   * Locks the screen now, where the user allowed it (Android, device admin with force-lock only).
   * Resolves false where it can't (iPhone, switched off): the user is then asked to lock it.
   */
  lockScreen: () => Promise<boolean>;
  /** Whether Saakshi is on screen now: the reminder is shown only then. */
  inForeground: () => boolean;
  now: () => Date;
  liveWaitMs?: number;
};

export type StartResult = 'started' | 'already' | 'no-code';

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class PhoneTakenController {
  private current: PhoneTakenState;
  private listeners = new Set<() => void>();
  private busy = false;

  constructor(private readonly deps: PhoneTakenDeps) {
    this.current = this.load();
  }

  getState = (): PhoneTakenState => this.current;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** For the secret code's reset, which is never offered while this runs. */
  isRunning = (): boolean => this.current.active;

  /** After the app restarts while this mode is on: the heartbeat carries on. */
  resume(): void {
    if (this.current.active) this.deps.heartbeat.start();
  }

  async start(): Promise<StartResult> {
    if (this.current.active || this.busy) return 'already';
    this.busy = true;
    try {
      if (!(await this.deps.codeIsSet().catch(() => false))) return 'no-code';
      // Saved before anything starts, so a restart knows this mode is on.
      this.set({
        active: true,
        startedAt: this.deps.now().toISOString(),
        alert: 'sending',
        live: 'starting',
        pocket: 'starting',
        errors: [],
        lockReminder: false,
      });
      this.deps.heartbeat.start();

      const pocket = this.startPocket();

      let started: { link: string; invite: string } | null = null;
      const live = this.deps.startLive().then(
        (value) => {
          started = value;
          this.update({ live: 'on' });
        },
        (error) => this.fail('live', error),
      );
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([live, new Promise((resolve) => (timer = setTimeout(resolve, this.deps.liveWaitMs ?? LIVE_WAIT_MS)))]);
      clearTimeout(timer);
      const inAlert = started as { link: string; invite: string } | null;

      try {
        await this.deps.alert(inAlert?.link);
        this.update({ alert: 'sent' });
      } catch (error) {
        this.fail('alert', error);
      }

      await live;
      const late = started as { link: string; invite: string } | null;
      if (late) await this.deps.textLink(late.invite, inAlert ? 'not-alerted' : 'all').catch((error) => this.fail('link', error));
      await pocket;
      await this.lockOrRemind();
      return 'started';
    } finally {
      this.busy = false;
    }
  }

  /** The app went to the background (the screen locked, or the user left): the reminder goes. */
  appInBackground(): void {
    if (this.current.lockReminder) this.update({ lockReminder: false });
  }

  /** Starts a part again that failed or was stopped on its own. Harmless if it is running. */
  async retry(part: 'live' | 'pocket'): Promise<void> {
    if (!this.current.active || this.current[part] === 'starting') return;
    if (part === 'pocket') return this.startPocket();
    this.update({ live: 'starting' });
    try {
      const { invite } = await this.deps.startLive();
      this.update({ live: 'on' });
      await this.deps.textLink(invite, 'all').catch((error) => this.fail('link', error));
    } catch (error) {
      this.fail('live', error);
    }
  }

  /** Stops everything, but only after the right secret code. Resolves whether it stopped. */
  async stop(): Promise<boolean> {
    if (!this.current.active) return true;
    if (!(await this.deps.requireCode())) return false;
    await Promise.allSettled([this.deps.stopPocket(), this.deps.stopLive()]);
    this.deps.heartbeat.stop();
    this.set(IDLE);
    return true;
  }

  /**
   * Called once, after every part has started or failed (the recording, location, the alert's
   * sending and the link), so that none of them waits on an unlock: an Android app in the
   * background can't start location, and a text that needs a tap needs the screen.
   */
  private async lockOrRemind(): Promise<void> {
    if (!this.current.active) return;
    let locked = false;
    try {
      locked = await this.deps.lockScreen();
    } catch {
      // Not locked: the user is asked to lock it.
    }
    if (!locked && this.current.active && this.deps.inForeground()) this.update({ lockReminder: true });
  }

  private startPocket(): Promise<void> {
    this.update({ pocket: 'starting' });
    return this.deps.startPocket().then(
      () => this.update({ pocket: 'on' }),
      (error) => this.fail('pocket', error),
    );
  }

  private fail(part: PhoneTakenState['errors'][number]['part'], error: unknown): void {
    const errors = [...this.current.errors, { part, message: message(error) }];
    if (part === 'link') return this.update({ errors });
    this.update({ [part]: 'failed', errors } as Partial<PhoneTakenState>);
  }

  private update(patch: Partial<PhoneTakenState>): void {
    if (!this.current.active) return;
    this.set({ ...this.current, ...patch });
  }

  private set(state: PhoneTakenState): void {
    this.current = state;
    try {
      this.deps.storage.write(JSON.stringify({ version: 1, ...state }));
    } catch {
      // The mode runs whether or not its state could be saved.
    }
    for (const listener of this.listeners) listener();
  }

  private load(): PhoneTakenState {
    try {
      const text = this.deps.storage.read();
      if (!text) return IDLE;
      const raw = JSON.parse(text) as Partial<PhoneTakenState>;
      if (raw.active !== true) return IDLE;
      // After a restart nothing is still starting; the screen shows what really runs.
      const part = (value: unknown): PartState => (value === 'on' || value === 'failed' ? value : 'off');
      return {
        active: true,
        startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : null,
        // An alert cut off mid-send by a restart: unknown, so nothing is claimed about it.
        alert: raw.alert === 'sent' || raw.alert === 'failed' ? raw.alert : null,
        live: part(raw.live),
        pocket: part(raw.pocket),
        errors: Array.isArray(raw.errors) ? raw.errors : [],
        // A reminder belongs to the moment the mode started, not to a restart.
        lockReminder: false,
      };
    } catch {
      return IDLE;
    }
  }
}
