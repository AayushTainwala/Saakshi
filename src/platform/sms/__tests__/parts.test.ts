import { isGsm, smsLength, smsParts } from '../parts';

describe('SMS parts', () => {
  it('counts GSM text: 160 in one part, then 153 a part', () => {
    expect(smsParts('a'.repeat(160))).toBe(1);
    expect(smsParts('a'.repeat(161))).toBe(2);
    expect(smsParts('a'.repeat(306))).toBe(2);
    expect(smsParts('a'.repeat(307))).toBe(3);
  });

  it('counts GSM extension characters twice', () => {
    expect(smsLength('[€]')).toBe(6);
    expect(smsParts('a'.repeat(159) + '€')).toBe(2);
  });

  it('sends anything outside GSM as Unicode: 70, then 67 a part', () => {
    expect(isGsm('±20 m')).toBe(false);
    expect(isGsm('within 20 m')).toBe(true);
    expect(smsParts('म'.repeat(70))).toBe(1);
    expect(smsParts('म'.repeat(71))).toBe(2);
    expect(smsParts('म'.repeat(134))).toBe(2);
    expect(smsParts('म'.repeat(135))).toBe(3);
    // One character outside GSM makes the whole text Unicode.
    expect(smsParts('a'.repeat(100) + '±')).toBe(2);
  });
});
