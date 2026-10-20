/**
 * The quick-trigger code (spec S4): three digits typed on the code pad. Codes that are also
 * emergency or helpline numbers are refused, so that typing one is never confused with dialling
 * it. Indian numbers from G3 (Stream C verifies them in src/modules/helplines); 911, 999 and 000
 * because visitors may know them.
 */
export const CODE_LENGTH = 3;

export const REFUSED_CODES: readonly string[] = [
  '100', // police
  '101', // fire
  '102', // ambulance
  '104', // health helpline in several states
  '108', // emergency ambulance
  '112', // Emergency Response Support System
  '181', // women's helpline
  '000',
  '911',
  '999',
];

export type CodeProblem = 'format' | 'emergency';

export function checkCode(code: string): CodeProblem | null {
  if (!new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code)) return 'format';
  if (REFUSED_CODES.includes(code)) return 'emergency';
  return null;
}

export type PadState = { entered: string };
export type PadResult = { state: PadState; matched: boolean };

/**
 * One key press on the pad. The third digit either matches (the alert goes out at once, with no
 * Send button) or clears the pad without a word: a wrong code does nothing.
 */
export function pressDigit(state: PadState, digit: string, code: string): PadResult {
  const entered = state.entered + digit;
  if (entered.length < CODE_LENGTH) return { state: { entered }, matched: false };
  return { state: { entered: '' }, matched: entered === code };
}

export function pressDelete(state: PadState): PadState {
  return { entered: state.entered.slice(0, -1) };
}
