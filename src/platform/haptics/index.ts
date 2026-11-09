import SaakshiDevice from '@native/saakshi-device';

/**
 * A light haptic tap (round 2, group 1.6): the swipe's handle entering its confirm region
 * (SPEC 5.1). Through the phone's own touch feedback, so it follows the phone's settings and
 * Android needs no vibration permission. Not a feature module: any module or component may use it.
 * Does nothing where the native module isn't built in (unit tests, Expo Go), and never throws.
 */
export function tapLight(): void {
  try {
    SaakshiDevice?.tapLight();
  } catch {
    // A missing tap must never stop a swipe.
  }
}
