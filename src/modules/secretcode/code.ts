/**
 * The secret code's rules (SPEC 5.3; round 2, group 1.2).
 *
 * Four digits. Built so (for the owner to confirm): codes that are guessed first are refused with a
 * plain reason, namely one digit four times (0000, 7777) and a straight run up or down (1234, 6789,
 * 9876, 3210).
 */
export const CODE_LENGTH = 4;

export type CodeProblem = 'format' | 'repeated' | 'run';

/** Why a new code can't be used, or null if it can. */
export function checkNewCode(code: string): CodeProblem | null {
  if (!new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code)) return 'format';
  if (/^(\d)\1+$/.test(code)) return 'repeated';
  const digits = Array.from(code, Number);
  const steps = digits.slice(1).map((digit, i) => digit - digits[i]);
  if (steps.every((step) => step === 1) || steps.every((step) => step === -1)) return 'run';
  return null;
}

/**
 * How long to wait after this many wrong tries in a row (owner: waits get longer; built so: two
 * wrong tries cost nothing, then 30 seconds, 1, 2, 5, 15 and 30 minutes, and 1 hour from there).
 */
export const WAIT_SECONDS: readonly number[] = [0, 0, 30, 60, 120, 300, 900, 1800, 3600];

export function waitAfter(wrongTries: number): number {
  if (wrongTries <= 0) return 0;
  return WAIT_SECONDS[Math.min(wrongTries, WAIT_SECONDS.length) - 1] * 1000;
}
