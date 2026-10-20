import { CONFISCATION_LIVE_HOURS, type ConfiscationDeps, startConfiscation } from '../confiscation';

function deps(overrides: Partial<ConfiscationDeps> = {}) {
  const calls: string[] = [];
  const base: ConfiscationDeps = {
    startBug: jest.fn(async () => void calls.push('bug')),
    startLive: jest.fn(async () => {
      calls.push('live');
      return { link: 'https://example.org/live/#tok', invite: 'Follow: https://example.org/live/#tok' };
    }),
    alert: jest.fn(async () => void calls.push('alert')),
    text: jest.fn(async () => void calls.push('text')),
    liveWaitMs: 50,
    ...overrides,
  };
  return { deps: base, calls };
}

describe('confiscation mode', () => {
  it('starts bug mode and live location, then alerts with the live link', async () => {
    const { deps: d, calls } = deps();
    const result = await startConfiscation(d);
    expect(result).toEqual({ bug: 'started', live: 'started', alert: 'started', errors: [] });
    expect(d.startLive).toHaveBeenCalledWith(CONFISCATION_LIVE_HOURS);
    expect(d.alert).toHaveBeenCalledWith('https://example.org/live/#tok');
    expect(calls.indexOf('alert')).toBeGreaterThan(calls.indexOf('live'));
    expect(d.text).not.toHaveBeenCalled();
  });

  it('still alerts when live location fails, without a link', async () => {
    const { deps: d } = deps({ startLive: jest.fn(async () => Promise.reject(new Error('offline'))) });
    const result = await startConfiscation(d);
    expect(d.alert).toHaveBeenCalledWith(undefined);
    expect(result.live).toBe('failed');
    expect(result.alert).toBe('started');
  });

  it('still alerts when bug mode fails', async () => {
    const { deps: d } = deps({ startBug: jest.fn(async () => Promise.reject(new Error('microphone denied'))) });
    const result = await startConfiscation(d);
    expect(result).toMatchObject({ bug: 'failed', live: 'started', alert: 'started' });
    expect(result.errors).toEqual(['bug: microphone denied']);
  });

  it('does not hold the alert for a slow link, and texts the link when it comes', async () => {
    let finish: (value: { link: string; invite: string }) => void = () => undefined;
    const { deps: d } = deps({
      startLive: jest.fn(() => new Promise<{ link: string; invite: string }>((resolve) => (finish = resolve))),
      alert: jest.fn(async () => {
        finish({ link: 'https://example.org/live/#late', invite: 'Follow: late' });
      }),
    });
    const result = await startConfiscation(d);
    expect(d.alert).toHaveBeenCalledWith(undefined);
    expect(d.text).toHaveBeenCalledWith('Follow: late');
    expect(result.live).toBe('started');
  });
});
