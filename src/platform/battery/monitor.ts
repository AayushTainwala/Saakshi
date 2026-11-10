/**
 * While recording (SPEC E1, "Low battery"; owner, 6 Nov 2026): warnings at 10% and 5%, and at 5%
 * the low-battery handover in body-cam and Pocket recording. Nothing stops by itself any more: the
 * 3% stop-and-save of 21-22 Oct is gone for every mode.
 */
export const WARN_LEVELS = [0.1, 0.05] as const;
/** At or below this, body-cam and Pocket recording hand over to a new file and saving mode starts. */
export const HANDOVER_LEVEL = 0.05;

export type BatteryAction =
  | { type: 'warn'; percent: number }
  /** 5%: close the file cleanly ("low-battery"), carry on in a new one, and save power. */
  | { type: 'low' }
  /** Charging after a "low": saving mode ends; the next file is at the normal quality. */
  | { type: 'charging' };

/**
 * Turns battery readings into actions. Each warning fires once, on the way down; "low" fires once,
 * and again only after the phone has been charging ("charging"). Nothing fires while charging but
 * that; readings of -1 (level unknown) are ignored.
 */
export function batteryMonitor() {
  const warned = new Set<number>();
  let low = false;
  return (level: number, charging: boolean): BatteryAction[] => {
    if (level < 0 || Number.isNaN(level)) return [];
    if (charging) {
      if (!low) return [];
      low = false;
      return [{ type: 'charging' }];
    }
    const actions: BatteryAction[] = [];
    for (const threshold of [...WARN_LEVELS].sort((a, b) => a - b)) {
      if (level <= threshold && !warned.has(threshold)) {
        // Crossing straight to 5% shows only the 5% warning.
        for (const higher of WARN_LEVELS) if (higher >= threshold) warned.add(higher);
        actions.push({ type: 'warn', percent: Math.round(threshold * 100) });
        break;
      }
    }
    if (level <= HANDOVER_LEVEL && !low) {
      low = true;
      actions.push({ type: 'low' });
    }
    return actions;
  };
}
