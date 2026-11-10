import { router } from 'expo-router';

import type { Protected } from './running';

/**
 * What the one code screen is opened for. `recovery`: make a new recovery code, after the code
 * (round 2, group 1.6).
 */
export type CodeScreenMode = 'confirm' | 'set' | 'change' | 'remove' | 'recovery';

const pending = new Map<string, (ok: boolean) => void>();
let next = 0;

/**
 * Opens the one full-screen code screen and resolves when it is done: true when the right code was
 * entered (or, for "set", a code was set), false when the user backed out. `reason` says what for:
 * for "set", `phone-taken` means the code is set to start "My phone is being taken" at once.
 */
export function openCodeScreen(mode: CodeScreenMode, reason?: Protected): Promise<boolean> {
  const request = String(++next);
  return new Promise((resolve) => {
    pending.set(request, resolve);
    router.push({ pathname: '/secret-code', params: { mode, request, ...(reason ? { reason } : {}) } });
  });
}

/**
 * Asks for the secret code before something that was turned on is turned off (SPEC 5.3): every
 * Stop calls this. Resolves true when the right code was entered, false when the user backed out.
 * If no code is set yet, the screen asks the user to set one first; setting it counts.
 */
export function requireSecretCode({ reason }: { reason: Protected }): Promise<boolean> {
  return openCodeScreen('confirm', reason);
}

/** Called by the code screen when it is done or goes away. A second call does nothing. */
export function settleCodeRequest(request: string | undefined, ok: boolean): void {
  if (!request) return;
  const resolve = pending.get(request);
  if (!resolve) return;
  pending.delete(request);
  resolve(ok);
}
