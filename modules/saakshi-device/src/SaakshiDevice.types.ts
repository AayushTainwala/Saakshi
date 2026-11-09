/**
 * How the phone's own passcode prompt ended (round 2, group 1.6):
 * - `passed`: the phone's passcode, PIN, pattern or password was entered (never a face or
 *   fingerprint: the prompt doesn't offer them);
 * - `cancelled`: the person backed out;
 * - `failed`: the prompt ended without the passcode (for example, too many wrong tries);
 * - `no-lock`: the phone has no screen lock;
 * - `unavailable`: this phone can't ask for the passcode alone, or the prompt couldn't be shown.
 */
export type ScreenLockResult = 'passed' | 'cancelled' | 'failed' | 'no-lock' | 'unavailable';
