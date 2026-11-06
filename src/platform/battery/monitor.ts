/** While recording: warn at 10% and 5%, and stop and save at 3% (spec E1). */
export const WARN_LEVELS = [0.1, 0.05] as const;
export const STOP_LEVEL = 0.03;

export type BatteryAction = { type: 'warn'; percent: number } | { type: 'stop' };

/**
 * Turns battery readings into at most one action each: each warning fires once, on the way down,
 * and the stop fires once. Nothing fires while the phone is charging, since the battery is not
 * running down; readings of -1 (level unknown) are ignored.
 */
export function batteryMonitor() {
  const warned = new Set<number>();
  let stopped = false;
  return (level: number, charging: boolean): BatteryAction | null => {
    if (level < 0 || charging || stopped) return null;
    if (level <= STOP_LEVEL) {
      stopped = true;
      return { type: 'stop' };
    }
    for (const threshold of [...WARN_LEVELS].sort((a, b) => a - b)) {
      if (level <= threshold && !warned.has(threshold)) {
        // Crossing straight to 5% shows only the 5% warning.
        for (const higher of WARN_LEVELS) if (higher >= threshold) warned.add(higher);
        return { type: 'warn', percent: Math.round(threshold * 100) };
      }
    }
    return null;
  };
}
