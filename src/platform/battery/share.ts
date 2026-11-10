/**
 * The battery level leaves the phone only when it is low (SPEC 5.2; owner, 9 Nov 2026, narrowing
 * 6 Nov): at 20% or less it goes in alerts, the calm "Share my location" message and live-location
 * positions; above that, or when the phone can't read it, it is left out, so nothing unneeded
 * leaves the phone. The level kept in the phone's own evidence records is not affected.
 */
export const SHARE_BATTERY_AT_OR_BELOW = 20;

/** The level to send, or null to leave it out. */
export function batteryToShare(percent: number | null | undefined): number | null {
  if (percent == null || !Number.isFinite(percent)) return null;
  return percent <= SHARE_BATTERY_AT_OR_BELOW ? percent : null;
}
