import * as Battery from 'expo-battery';

/**
 * The battery level as a whole percentage, 0 to 100, or null when the phone doesn't say (or takes
 * too long). Like the location, it is the phone's report and not proof. Used in every alert, every
 * live-location position (round 2, group 1.4) and in the records of body-cam and Pocket recording
 * files (bundle format 0.9).
 */
export async function readBatteryPercent(timeoutMs = 1500): Promise<number | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const level = await Promise.race([
      Battery.getBatteryLevelAsync(),
      new Promise<number>((resolve) => (timer = setTimeout(() => resolve(-1), timeoutMs))),
    ]);
    return toPercent(level);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** expo-battery's 0..1 level, or -1 for unknown, as a whole percentage or null. */
export function toPercent(level: number): number | null {
  if (!Number.isFinite(level) || level < 0 || level > 1) return null;
  return Math.round(level * 100);
}
