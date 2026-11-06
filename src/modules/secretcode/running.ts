/**
 * What is running that the secret code protects (SPEC 5.3): body-cam, Pocket recording, live
 * location and "My phone is being taken". Each feature tells this module how to ask whether it is
 * running (`registerRunningCheck`, wired in the app's root layout), so that this module imports no
 * other feature and none imports how the code is kept.
 */
export type Protected = 'body-cam' | 'pocket-recording' | 'live-location' | 'phone-taken';

const checks = new Map<Protected, () => boolean>();

export function registerRunningCheck(what: Protected, isRunning: () => boolean): void {
  checks.set(what, isRunning);
}

/** What is running now. A check that fails counts as running: the reset stays closed. */
export function whatIsRunning(): Protected[] {
  const running: Protected[] = [];
  for (const [what, isRunning] of checks) {
    let on = true;
    try {
      on = isRunning();
    } catch {
      on = true;
    }
    if (on) running.push(what);
  }
  return running;
}

/** For tests. */
export function clearRunningChecks(): void {
  checks.clear();
}
