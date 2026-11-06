import { batteryMonitor } from '../monitor';

describe('batteryMonitor (SPEC E1, low battery; round 2, group 1.5)', () => {
  it('warns once at 10% and once at 5%, hands over once at 5%, and never stops', () => {
    const next = batteryMonitor();
    const actions = [0.5, 0.11, 0.1, 0.09, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01, 0].map((level) => next(level, false));
    expect(actions).toEqual([
      [],
      [],
      [{ type: 'warn', percent: 10 }],
      [],
      [],
      [{ type: 'warn', percent: 5 }, { type: 'low' }],
      [],
      // The 3% stop-and-save is gone, for every mode.
      [],
      [],
      [],
      [],
    ]);
    expect(actions.flat().some((action) => (action.type as string) === 'stop')).toBe(false);
  });

  it('shows only the 5% warning, and hands over, when recording starts that low', () => {
    const next = batteryMonitor();
    expect(next(0.02, false)).toEqual([{ type: 'warn', percent: 5 }, { type: 'low' }]);
    expect(next(0.01, false)).toEqual([]);
  });

  it('ends saving mode on charging, and hands over again only after that', () => {
    const next = batteryMonitor();
    expect(next(0.05, false)).toEqual([{ type: 'warn', percent: 5 }, { type: 'low' }]);
    expect(next(0.05, true)).toEqual([{ type: 'charging' }]);
    expect(next(0.06, true)).toEqual([]);
    // Unplugged again, still low: a new file at lower quality again.
    expect(next(0.05, false)).toEqual([{ type: 'low' }]);
  });

  it('does nothing while charging before a handover, or when the level is unknown', () => {
    const next = batteryMonitor();
    expect(next(0.02, true)).toEqual([]);
    expect(next(-1, false)).toEqual([]);
    expect(next(Number.NaN, false)).toEqual([]);
    expect(next(0.04, false)).toEqual([{ type: 'warn', percent: 5 }, { type: 'low' }]);
  });
});
