import { batteryMonitor } from '../battery/monitor';

describe('batteryMonitor', () => {
  it('warns once at 10%, once at 5%, and stops once at 3%', () => {
    const next = batteryMonitor();
    const actions = [0.5, 0.11, 0.1, 0.09, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01].map((level) => next(level, false));
    expect(actions).toEqual([
      null,
      null,
      { type: 'warn', percent: 10 },
      null,
      null,
      { type: 'warn', percent: 5 },
      null,
      { type: 'stop' },
      null,
      null,
    ]);
  });

  it('shows only the 5% warning when the battery is already that low', () => {
    const next = batteryMonitor();
    expect(next(0.05, false)).toEqual({ type: 'warn', percent: 5 });
    expect(next(0.04, false)).toBeNull();
    expect(next(0.03, false)).toEqual({ type: 'stop' });
  });

  it('stops straight away if recording starts at 3% or less', () => {
    expect(batteryMonitor()(0.02, false)).toEqual({ type: 'stop' });
  });

  it('does nothing while charging, or when the level is unknown', () => {
    const next = batteryMonitor();
    expect(next(0.02, true)).toBeNull();
    expect(next(-1, false)).toBeNull();
    expect(next(0.04, false)).toEqual({ type: 'warn', percent: 5 });
  });
});
