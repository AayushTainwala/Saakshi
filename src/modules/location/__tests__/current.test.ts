import { getCurrentFix, type LocationApi, mapsLink } from '../current';

const at = (accuracy: number, timestamp: number) => ({
  coords: { latitude: 19.076, longitude: 72.8777, accuracy, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
  timestamp,
});

function api(overrides: Partial<LocationApi> = {}): LocationApi {
  return {
    getPermission: jest.fn(async () => ({ status: 'granted' as const, canAskAgain: true })),
    requestPermission: jest.fn(async () => ({ status: 'granted' as const })),
    lastKnown: jest.fn(async () => null),
    current: jest.fn(async () => at(8, Date.UTC(2026, 9, 20, 9, 0))),
    ...overrides,
  };
}

describe('getCurrentFix', () => {
  it('uses a recent, accurate fix at once', async () => {
    const phone = api({ lastKnown: jest.fn(async () => at(30, Date.UTC(2026, 9, 20, 8, 59))) });
    const result = await getCurrentFix({}, phone);
    expect(result).toEqual({
      status: 'fixed',
      fix: { latitude: 19.076, longitude: 72.8777, accuracyMeters: 30, fixedAt: '2026-10-20T08:59:00.000Z' },
    });
    expect(phone.current).not.toHaveBeenCalled();
  });

  it('waits for a new fix when there is no recent one', async () => {
    const phone = api();
    expect(await getCurrentFix({}, phone)).toMatchObject({ status: 'fixed', fix: { accuracyMeters: 8 } });
  });

  it('falls back to the last known fix, however old, when a new one is slow', async () => {
    const old = at(500, Date.UTC(2026, 9, 19, 9, 0));
    const phone = api({
      lastKnown: jest.fn(async (maxAge?: number) => (maxAge === undefined ? old : null)),
      current: () => new Promise(() => undefined),
    });
    expect(await getCurrentFix({ timeoutMs: 10 }, phone)).toMatchObject({
      status: 'fixed',
      fix: { fixedAt: '2026-10-19T09:00:00.000Z' },
    });
  });

  it('is unavailable when the phone has no fix at all', async () => {
    const phone = api({ current: jest.fn(async () => Promise.reject(new Error('Location services are off'))) });
    expect(await getCurrentFix({}, phone)).toEqual({ status: 'unavailable', fix: null });
  });

  it('asks once for permission, and reports a refusal', async () => {
    const phone = api({
      getPermission: jest.fn(async () => ({ status: 'undetermined' as const, canAskAgain: true })),
      requestPermission: jest.fn(async () => ({ status: 'denied' as const })),
    });
    expect(await getCurrentFix({}, phone)).toEqual({ status: 'denied', fix: null });
    expect(phone.requestPermission).toHaveBeenCalledTimes(1);

    const noAsk = api({ getPermission: jest.fn(async () => ({ status: 'undetermined' as const, canAskAgain: true })) });
    expect(await getCurrentFix({ ask: false }, noAsk)).toEqual({ status: 'denied', fix: null });
    expect(noAsk.requestPermission).not.toHaveBeenCalled();
  });
});

describe('mapsLink', () => {
  it('opens in any browser, to about a metre', () => {
    expect(mapsLink({ latitude: 19.0760012, longitude: 72.877701 })).toBe('https://maps.google.com/?q=19.07600,72.87770');
    expect(mapsLink({ latitude: -33.8688, longitude: 151.2093 })).toBe('https://maps.google.com/?q=-33.86880,151.20930');
  });
});
