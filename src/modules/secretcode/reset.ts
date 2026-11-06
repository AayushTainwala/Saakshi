import type { Protected } from './running';

/**
 * A forgotten code is reset with the phone's own passcode (owner, 6 Nov 2026), through the
 * platform's authentication prompt. Built so: only while nothing is running, because whoever holds
 * the phone and its passcode could otherwise reset the code and switch the protection off. Nothing
 * running is checked before the prompt and again after it, in case something started meanwhile.
 *
 * What the prompt accepts (expo-local-authentication 58, read from its source): on iPhone Apple's
 * `deviceOwnerAuthentication` policy, which takes Face ID or Touch ID when enrolled and the
 * passcode otherwise or as a fallback; on Android the system's biometric prompt allowing a
 * fingerprint or face (when enrolled) or the screen lock's PIN, pattern or password. So a face or a
 * fingerprint also resets the code. Reported in BUILD_HANDOFF.md, group 1.2.
 */
export type ResetOutcome = 'reset' | 'running' | 'no-passcode' | 'cancelled';

export type ResetDeps = {
  running: () => Protected[];
  /** Whether the phone has a screen lock at all. */
  hasScreenLock: () => Promise<boolean>;
  /** The platform's prompt; resolves whether the owner passed it. */
  authenticate: () => Promise<{ success: boolean; noPasscode?: boolean }>;
  clear: () => Promise<void>;
};

export async function resetWithPhonePasscode(deps: ResetDeps): Promise<ResetOutcome> {
  if (deps.running().length > 0) return 'running';
  if (!(await deps.hasScreenLock())) return 'no-passcode';
  const result = await deps.authenticate();
  if (!result.success) return result.noPasscode ? 'no-passcode' : 'cancelled';
  if (deps.running().length > 0) return 'running';
  await deps.clear();
  return 'reset';
}
