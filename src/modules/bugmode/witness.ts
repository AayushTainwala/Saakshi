/**
 * Bug mode's witness texts are rationed so they can't use up the SMS the user may need for an SOS:
 * - at most one witness message every 10 minutes (spec E8). A piece whose witness is skipped is
 *   still covered: each record carries the previous record's hash, so the next chain head sent
 *   vouches for every piece before it;
 * - at most 20 texts in any 30 minutes. Android asks the user to confirm once an app sends more
 *   than 30 in 30 minutes, so this leaves room for an SOS alert.
 */
export const WITNESS_BUDGET = { minIntervalMs: 10 * 60 * 1000, texts: 20, windowMs: 30 * 60 * 1000 };

export class WitnessThrottle {
  private sent: { at: number; texts: number }[] = [];

  constructor(private readonly budget = WITNESS_BUDGET) {}

  /** True, and the texts counted, if a message of `texts` texts may go at `now`. */
  allow(texts: number, now: number): boolean {
    const last = this.sent[this.sent.length - 1];
    if (last && now - last.at < this.budget.minIntervalMs) return false;
    this.sent = this.sent.filter((entry) => now - entry.at < this.budget.windowMs);
    const used = this.sent.reduce((sum, entry) => sum + entry.texts, 0);
    if (texts <= 0 || used + texts > this.budget.texts) return false;
    this.sent.push({ at: now, texts });
    return true;
  }
}
