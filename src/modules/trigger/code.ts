/**
 * The quick-trigger code (spec S4): three digits typed on the code pad. Codes that are also
 * emergency or helpline numbers are refused, so that typing one is never confused with dialling
 * it. 102, 108 and 112 are in the verified helpline list (helplines/helplines.json, Stream C). The
 * others are refused to be safe, without having been verified here: 100, 101, 104 and 181 are
 * commonly given as Indian police, fire, health and women's helpline numbers, and 000, 911 and 999
 * as emergency numbers abroad that visitors may know.
 */
export const CODE_LENGTH = 3;

export const REFUSED_CODES: readonly string[] = [
  '100',
  '101',
  '102',
  '104',
  '108',
  '112',
  '181',
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
