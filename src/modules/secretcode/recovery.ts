/**
 * The recovery code (SPEC 5.3; owner, 9 Nov 2026): on a phone with no screen lock, setting the
 * secret code also makes a recovery code, shown once, for the user to write down and keep away
 * from the phone. Entering it resets the secret code under the same rules as the passcode reset.
 *
 * Twelve characters from an alphabet without look-alikes: the digits 2 to 9 and the capital
 * letters without I, L and O (no 0/O, no 1/I/L). 31 characters, so a code is one of 31^12, about
 * 2^59. Shown in three groups of four ("7KQM-4WXH-9RTD"); typed in any case, with or without the
 * dashes and spaces.
 */
export const RECOVERY_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const RECOVERY_LENGTH = 12;

/**
 * Its slow hash: PBKDF2 with HMAC-SHA256, 100,000 iterations, a random 16-byte salt and 32 bytes
 * out, in native code (modules/saakshi-device). The iterations are stored with the hash, so a
 * later version can raise them.
 */
export const RECOVERY_ITERATIONS = 100_000;
export const RECOVERY_PREFIX = 'saakshi.recovery.v1';

/**
 * A new recovery code from random bytes, each byte used only if it falls in a whole number of
 * alphabets (below 248 = 8 x 31), so every character is equally likely. `randomBytes` gives fresh
 * random bytes each call.
 */
export function makeRecoveryCode(randomBytes: (count: number) => Uint8Array): string {
  const limit = Math.floor(256 / RECOVERY_ALPHABET.length) * RECOVERY_ALPHABET.length;
  let code = '';
  while (code.length < RECOVERY_LENGTH) {
    for (const byte of randomBytes(RECOVERY_LENGTH * 2)) {
      if (byte >= limit) continue;
      code += RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length];
      if (code.length === RECOVERY_LENGTH) break;
    }
  }
  return code;
}

/** "7KQM4WXH9RTD" as it is shown: "7KQM-4WXH-9RTD". */
export function formatRecoveryCode(code: string): string {
  return code.match(/.{1,4}/g)?.join('-') ?? code;
}

/** For a screen reader: each character on its own, the groups apart ("7 K Q M, 4 W X H, …"). */
export function spellRecoveryCode(code: string): string {
  return (code.match(/.{1,4}/g) ?? [code]).map((group) => group.split('').join(' ')).join(', ');
}

/**
 * What the user typed, as the code it means: capitals, without spaces and dashes. Null if it can't
 * be a recovery code (the wrong length, or a character the alphabet doesn't have).
 */
export function normalizeRecoveryCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s\-–—.]/g, '');
  if (code.length !== RECOVERY_LENGTH) return null;
  for (const char of code) if (!RECOVERY_ALPHABET.includes(char)) return null;
  return code;
}
