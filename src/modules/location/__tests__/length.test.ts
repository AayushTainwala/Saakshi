import { DEFAULT_LIVE_HOURS, LiveLengthStore, sanitizeLiveHours } from '../live/length';

function memory(initial: string | null = null) {
  let text = initial;
  return { store: new LiveLengthStore({ read: () => text, write: (value) => void (text = value) }), saved: () => text };
}

describe('Settings → Live-location length', () => {
  it('is 4 hours unless the user chose another', () => {
    expect(DEFAULT_LIVE_HOURS).toBe(4);
    expect(memory().store.get()).toBe(4);
  });

  it('keeps the choice of 1, 4, 8 or 24 hours across a restart', () => {
    const first = memory();
    const listener = jest.fn();
    first.store.subscribe(listener);
    first.store.set(24);
    expect(first.store.get()).toBe(24);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(memory(first.saved()).store.get()).toBe(24);
  });

  it('refuses other lengths, and reads a damaged file as 4 hours', () => {
    const { store } = memory();
    store.set(48 as never);
    expect(store.get()).toBe(4);
    expect(sanitizeLiveHours({ hours: 3 })).toBe(4);
    expect(sanitizeLiveHours({ hours: 8 })).toBe(8);
    expect(memory('{oops').store.get()).toBe(4);
  });
});
