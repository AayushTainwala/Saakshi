import { formatRecoveryCode, makeRecoveryCode, normalizeRecoveryCode, RECOVERY_ALPHABET, RECOVERY_LENGTH, spellRecoveryCode } from '../recovery';

describe('the recovery code (round 2, group 1.6)', () => {
  it('uses 31 characters with no look-alikes', () => {
    expect(RECOVERY_ALPHABET).toHaveLength(31);
    for (const lookAlike of ['0', 'O', '1', 'I', 'L']) expect(RECOVERY_ALPHABET).not.toContain(lookAlike);
    expect(new Set(RECOVERY_ALPHABET).size).toBe(31);
    expect(RECOVERY_LENGTH).toBe(12);
  });

  it('is made from random bytes, each character equally likely', () => {
    // Bytes 248 to 255 would make the first 8 characters likelier; they are skipped.
    let call = 0;
    const bytes = (count: number) => {
      call++;
      return Uint8Array.from({ length: count }, (_, i) => (call === 1 && i % 2 === 0 ? 250 : i));
    };
    const code = makeRecoveryCode(bytes);
    expect(code).toHaveLength(12);
    for (const char of code) expect(RECOVERY_ALPHABET).toContain(char);
    // Only the odd places of the first 24 bytes counted: 1, 3, 5, ... 23.
    expect(code).toBe([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23].map((n) => RECOVERY_ALPHABET[n % 31]).join(''));
    expect(makeRecoveryCode(() => Uint8Array.from({ length: 24 }, () => 247))).toBe(RECOVERY_ALPHABET[247 % 31].repeat(12));
  });

  it('is shown in three groups of four, and spelled out for a screen reader', () => {
    expect(formatRecoveryCode('7KQM4WXH9RTD')).toBe('7KQM-4WXH-9RTD');
    expect(spellRecoveryCode('7KQM4WXH9RTD')).toBe('7 K Q M, 4 W X H, 9 R T D');
  });

  it('is read back in any case, with or without dashes and spaces', () => {
    expect(normalizeRecoveryCode('7kqm-4wxh-9rtd')).toBe('7KQM4WXH9RTD');
    expect(normalizeRecoveryCode(' 7KQM 4WXH 9RTD ')).toBe('7KQM4WXH9RTD');
    expect(normalizeRecoveryCode('7KQM4WXH9RT')).toBeNull();
    expect(normalizeRecoveryCode('7KQM4WXH9RTD7')).toBeNull();
    expect(normalizeRecoveryCode('7KQM-4WXH-9RT0')).toBeNull();
  });
});
