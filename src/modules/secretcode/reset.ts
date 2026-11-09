import type { ScreenLockResult } from '@native/saakshi-device';

import type { Protected } from './running';
import type { RecoveryResult } from './store';

/**
 * A forgotten code is reset with the phone's own passcode, and only the passcode, never a face or
 * fingerprint (SPEC 5.3; owner, 6 and 9 Nov 2026). A phone with no screen lock uses a recovery code
 * instead (owner, 9 Nov 2026). Built so: either way only while nothing is running, because whoever
 * holds the phone (and its passcode) could otherwise reset the code and switch the protection off.
 * Nothing running is checked before the prompt or the recovery code, and again after, in case
 * something started meanwhile.
 *
 * Which phones can ask for the passcode alone (round 2, group 1.6; BUILD_HANDOFF.md):
 * - iPhone: always, through a keychain item held to the passcode (`.devicePasscode`);
 * - Android 11 and later: the system prompt with the screen lock alone (`DEVICE_CREDENTIAL`);
 * - Android 7 to 10: no. The only system screens that ask for the screen lock there also take a
 *   fingerprint (and on Android 10 a face), and an app can't turn that off. So such a phone with a
 *   screen lock has no reset (built so, pending the owner's answer in the handoff).
 */
export type ResetMethod = 'passcode' | 'recovery' | 'none';

/** What this phone can reset a forgotten code with. Null: the phone couldn't be asked. */
export function resetMethodFor(phone: { hasScreenLock: boolean; canAskPasscodeOnly: boolean } | null): ResetMethod {
  if (!phone) return 'none';
  if (!phone.hasScreenLock) return 'recovery';
  return phone.canAskPasscodeOnly ? 'passcode' : 'none';
}

export type ResetOutcome = 'reset' | 'running' | 'no-passcode' | 'cancelled' | 'failed' | 'unavailable';

export type ResetDeps = {
  running: () => Protected[];
  /** Whether the phone has a screen lock at all. */
  hasScreenLock: () => Promise<boolean>;
  /** The phone's passcode-only prompt. */
  authenticate: () => Promise<ScreenLockResult>;
  clear: () => Promise<void>;
};

export async function resetWithPhonePasscode(deps: ResetDeps): Promise<ResetOutcome> {
  if (deps.running().length > 0) return 'running';
  if (!(await deps.hasScreenLock())) return 'no-passcode';
  const result = await deps.authenticate();
  if (result === 'no-lock') return 'no-passcode';
  if (result === 'cancelled' || result === 'failed' || result === 'unavailable') return result;
  if (deps.running().length > 0) return 'running';
  await deps.clear();
  return 'reset';
}

export type RecoveryResetDeps = {
  running: () => Protected[];
  verify: (input: string) => Promise<RecoveryResult>;
  clear: () => Promise<void>;
};

export type RecoveryResetResult = { outcome: 'reset' } | { outcome: 'running' } | { outcome: 'refused'; result: Exclude<RecoveryResult, { ok: true }> };

/** The reset with the recovery code: the same rules as with the passcode. */
export async function resetWithRecoveryCode(input: string, deps: RecoveryResetDeps): Promise<RecoveryResetResult> {
  if (deps.running().length > 0) return { outcome: 'running' };
  const result = await deps.verify(input);
  if (!result.ok) return { outcome: 'refused', result };
  if (deps.running().length > 0) return { outcome: 'running' };
  await deps.clear();
  return { outcome: 'reset' };
}
