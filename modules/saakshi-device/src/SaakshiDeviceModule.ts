import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { ScreenLockResult } from './SaakshiDevice.types';

declare class SaakshiDeviceModule extends NativeModule {
  /** Whether the phone has a screen lock (a passcode, PIN, pattern or password). */
  hasScreenLock(): boolean;
  /**
   * Whether this phone can ask for its screen lock alone: iPhone always; Android from 11 (API 30).
   * Android 7 to 10's only system screens for it also take a fingerprint or face (group 1.6).
   */
  canAskPasscodeOnly(): boolean;
  /**
   * Asks for the phone's own passcode, and only the passcode (round 2, group 1.6; SPEC 5.3):
   * - iPhone: reads a keychain item whose access control is `.devicePasscode`, so iOS asks for the
   *   passcode and never Face ID or Touch ID;
   * - Android 11 and later: the system's prompt with `DEVICE_CREDENTIAL` alone (PIN, pattern or
   *   password, never a fingerprint or face);
   * - older Android: `unavailable` where the phone's own confirm screen could also take a
   *   fingerprint (see BUILD_HANDOFF.md, group 1.6).
   * `title` and `subtitle` are shown in the prompt (iPhone shows the title as its reason).
   */
  confirmScreenLock(title: string, subtitle: string): Promise<ScreenLockResult>;
  /**
   * PBKDF2 with HMAC-SHA256 of `password` (UTF-8) with the salt (hex), as hex, `length` bytes: the
   * recovery code's slow hash (round 2, group 1.6). Off the JavaScript thread.
   */
  pbkdf2Sha256(password: string, saltHex: string, iterations: number, length: number): Promise<string>;
  /** A light haptic tap, through the system's touch feedback (no vibration permission needed). */
  tapLight(): void;
}

/** Null where the native module isn't built in (unit tests, Expo Go). */
export default requireOptionalNativeModule<SaakshiDeviceModule>('SaakshiDevice');
