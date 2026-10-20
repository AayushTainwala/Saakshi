import type { DirectSmsResult } from '@native/saakshi-sos';

import type { FixResult } from '@/modules/location';

import type { TrustedContact } from '../contacts/store';
import type { ComposerResult, SmsChannels } from './channels';
import { type AlertLabels, alertMessage } from './message';

export type AlertOutcome =
  | {
      channel: 'direct';
      sent: TrustedContact[];
      /** No report from the network within a minute; the text may still go out. */
      unknown: TrustedContact[];
      failed: TrustedContact[];
      located: boolean;
    }
  | { channel: 'composer'; result: ComposerResult; recipients: number; located: boolean };

export type AlertState =
  | { phase: 'idle' }
  /** Android APK: the alert sends itself when this reaches zero, unless cancelled. */
  | { phase: 'countdown'; secondsLeft: number }
  | { phase: 'locating' }
  | { phase: 'sending' }
  | { phase: 'done'; outcome: AlertOutcome }
  | { phase: 'failed'; error: 'no-contacts' | 'no-sms' | 'unexpected'; detail?: string };

export type AlertDeps = {
  contacts: () => readonly TrustedContact[];
  locate: () => Promise<FixResult>;
  now: () => Date;
  channels: SmsChannels;
  /** Read when the text is written, so it follows the app's language at that moment. */
  labels: () => AlertLabels;
  countdownSeconds?: number;
};

type Plan = { recipients: TrustedContact[]; message: string; located: boolean };

export type StartOptions = {
  /** Skip the countdown: the code pad (S4) is already a deliberate act. */
  immediate?: boolean;
  /** A live-location link (S3) to include. */
  liveLink?: string;
};

/**
 * Runs one SOS alert (spec S1, S2): finds the position, writes the text, and sends it to every
 * trusted contact. Where the build and the user allow it (the Android APK with SEND_SMS granted),
 * the text goes out by itself after a short countdown that can be cancelled; otherwise the phone's
 * Messages app opens with everything filled in and the user taps Send.
 */
export class AlertController {
  private current: AlertState = { phase: 'idle' };
  private listeners = new Set<() => void>();
  private run = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private plan: Promise<Plan> | null = null;
  private lastPlan: Plan | null = null;

  constructor(private readonly deps: AlertDeps) {}

  get state(): AlertState {
    return this.current;
  }

  getState = (): AlertState => this.current;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  get busy(): boolean {
    return ['countdown', 'locating', 'sending'].includes(this.current.phase);
  }

  /** Starts an alert. Ignored while one is already under way. */
  async start(options: StartOptions = {}): Promise<void> {
    if (this.busy) return;
    const run = ++this.run;
    const recipients = [...this.deps.contacts()];
    if (recipients.length === 0) return this.set({ phase: 'failed', error: 'no-contacts' });

    // Locating starts at once, during the countdown, so no time is lost.
    this.plan = this.makePlan(recipients, options.liveLink);
    const direct = await this.deps.channels.direct.allowed().catch(() => false);
    if (run !== this.run) return;

    if (direct) {
      const seconds = options.immediate ? 0 : (this.deps.countdownSeconds ?? 3);
      if (seconds > 0) {
        this.set({ phase: 'countdown', secondsLeft: seconds });
        this.timer = setInterval(() => {
          if (this.current.phase !== 'countdown') return;
          if (this.current.secondsLeft <= 1) void this.sendNow();
          else this.set({ phase: 'countdown', secondsLeft: this.current.secondsLeft - 1 });
        }, 1000);
        return;
      }
      return this.deliver(run, 'direct');
    }
    return this.deliver(run, 'composer');
  }

  /** During the countdown: send without waiting for it to finish. */
  async sendNow(): Promise<void> {
    if (this.current.phase !== 'countdown') return;
    this.stopTimer();
    return this.deliver(this.run, 'direct');
  }

  /** During the countdown: nothing is sent. */
  cancel(): void {
    if (this.current.phase !== 'countdown') return;
    this.run++;
    this.stopTimer();
    this.plan = null;
    this.set({ phase: 'idle' });
  }

  /** After a direct send: opens Messages for the contacts the network did not confirm. */
  async sendRestByComposer(): Promise<void> {
    const state = this.current;
    if (state.phase !== 'done' || state.outcome.channel !== 'direct' || !this.lastPlan) return;
    const rest = [...state.outcome.failed, ...state.outcome.unknown];
    if (rest.length === 0) return;
    const run = ++this.run;
    this.plan = Promise.resolve({ ...this.lastPlan, recipients: rest });
    return this.deliver(run, 'composer');
  }

  /** Back to the start, after a result has been read. */
  dismiss(): void {
    if (this.busy) return;
    this.set({ phase: 'idle' });
  }

  private async makePlan(recipients: TrustedContact[], liveLink?: string): Promise<Plan> {
    const where = await this.deps.locate();
    return {
      recipients,
      message: alertMessage(where, this.deps.now(), this.deps.labels(), liveLink),
      located: where.status === 'fixed',
    };
  }

  private async deliver(run: number, channel: 'direct' | 'composer'): Promise<void> {
    const planned = this.plan;
    if (!planned) return;
    try {
      this.set({ phase: 'locating' });
      const plan = await planned;
      if (run !== this.run) return;
      this.lastPlan = plan;
      this.set({ phase: 'sending' });
      const phones = plan.recipients.map((c) => c.phone);

      if (channel === 'direct') {
        try {
          const results = await this.deps.channels.direct.send(phones, plan.message);
          if (run !== this.run) return;
          return this.set({ phase: 'done', outcome: sortResults(plan, results) });
        } catch {
          // Permission withdrawn or no SIM: fall back to the Messages app rather than fail.
        }
      }

      if (!(await this.deps.channels.composer.available())) return this.set({ phase: 'failed', error: 'no-sms' });
      const result = await this.deps.channels.composer.send(phones, plan.message);
      if (run !== this.run) return;
      this.set({
        phase: 'done',
        outcome: { channel: 'composer', result, recipients: phones.length, located: plan.located },
      });
    } catch (error) {
      if (run !== this.run) return;
      this.set({ phase: 'failed', error: 'unexpected', detail: error instanceof Error ? error.message : String(error) });
    }
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private set(state: AlertState): void {
    this.current = state;
    for (const listener of this.listeners) listener();
  }
}

function sortResults(plan: Plan, results: DirectSmsResult[]): AlertOutcome {
  const outcome = { channel: 'direct' as const, sent: [] as TrustedContact[], unknown: [] as TrustedContact[], failed: [] as TrustedContact[], located: plan.located };
  plan.recipients.forEach((contact, index) => {
    const status = results.find((r) => r.phone === contact.phone)?.status ?? results[index]?.status ?? 'unknown';
    outcome[status].push(contact);
  });
  return outcome;
}
