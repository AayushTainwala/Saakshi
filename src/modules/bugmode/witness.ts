/**
 * Android counts an app's texts and asks the user to confirm once it sends more than 30 in 30
 * minutes. Bug mode's witness texts stay within 20 of those, leaving room for an SOS alert. A piece
 * whose witness is skipped is still covered: each record carries the previous record's hash, so
 * the next chain head sent vouches for every piece before it.
 */
export const WITNESS_BUDGET = { texts: 20, windowMs: 30 * 60 * 1000 };

export class WitnessThrottle {
  private sent: { at: number; texts: number }[] = [];

  constructor(private readonly budget = WITNESS_BUDGET) {}

  /** True, and the texts counted, if `texts` more fit in the window ending at `now`. */
  allow(texts: number, now: number): boolean {
    this.sent = this.sent.filter((entry) => now - entry.at < this.budget.windowMs);
    const used = this.sent.reduce((sum, entry) => sum + entry.texts, 0);
    if (texts <= 0 || used + texts > this.budget.texts) return false;
    this.sent.push({ at: now, texts });
    return true;
  }
}
