import { batteryToShare, SHARE_BATTERY_AT_OR_BELOW } from '../share';

describe('the battery level leaves the phone only at 20% or less (SPEC 5.2; round 2, group 1.6)', () => {
  it('gives the level at 20% or less', () => {
    expect(SHARE_BATTERY_AT_OR_BELOW).toBe(20);
    expect(batteryToShare(20)).toBe(20);
    expect(batteryToShare(5)).toBe(5);
    expect(batteryToShare(0)).toBe(0);
  });

  it('leaves it out above 20%, and when the phone can not read it', () => {
    expect(batteryToShare(21)).toBeNull();
    expect(batteryToShare(100)).toBeNull();
    expect(batteryToShare(null)).toBeNull();
    expect(batteryToShare(undefined)).toBeNull();
    expect(batteryToShare(Number.NaN)).toBeNull();
  });
});
