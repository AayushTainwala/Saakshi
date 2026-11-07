import * as Battery from 'expo-battery';

import { readBatteryPercent, toPercent } from '../read';

describe('reading the battery level', () => {
  it('gives a whole percentage, or null when the phone doesn’t say', () => {
    expect(toPercent(0.823)).toBe(82);
    expect(toPercent(1)).toBe(100);
    expect(toPercent(0)).toBe(0);
    expect(toPercent(-1)).toBeNull();
    expect(toPercent(Number.NaN)).toBeNull();
    expect(toPercent(1.5)).toBeNull();
  });

  it('gives null if the reading fails or is slow', async () => {
    jest.spyOn(Battery, 'getBatteryLevelAsync').mockRejectedValueOnce(new Error('no battery'));
    expect(await readBatteryPercent()).toBeNull();
    jest.spyOn(Battery, 'getBatteryLevelAsync').mockReturnValueOnce(new Promise(() => undefined));
    expect(await readBatteryPercent(10)).toBeNull();
    jest.spyOn(Battery, 'getBatteryLevelAsync').mockResolvedValueOnce(0.64);
    expect(await readBatteryPercent()).toBe(64);
  });
});
