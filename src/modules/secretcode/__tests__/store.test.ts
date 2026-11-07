import { createHash, randomBytes } from 'node:crypto';

import { SecretCodeStore } from '../store';
import { memoryCodeStore } from './memory';

const SECOND = 1000;
const MINUTE = 60 * SECOND;

describe('the secret code', () => {
  it('is set, checked and kept only as a salted hash', async () => {
    const { store, saved } = memoryCodeStore();
    expect(await store.isSet()).toBe(false);
    expect(await store.setCode('2580')).toEqual({ ok: true });
    expect(await store.isSet()).toBe(true);
    expect(await store.verify('2580')).toEqual({ ok: true });
    expect(await store.verify('2581')).toMatchObject({ ok: false, reason: 'wrong' });

    // The code itself is nowhere in what is stored: a random salt and a SHA-256 only.
    const text = saved() as string;
    expect(text).not.toContain('2580');
    const stored = JSON.parse(text);
    expect(stored.code.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(stored.code.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('gives the same code a different hash each time it is set', async () => {
    const a = memoryCodeStore();
    const b = memoryCodeStore();
    await a.store.setCode('2580');
    await b.store.setCode('2580');
    expect(JSON.parse(a.saved() as string).code.hash).not.toBe(JSON.parse(b.saved() as string).code.hash);
  });

  it('refuses guessable codes, and a second "set" over a code', async () => {
    const { store } = memoryCodeStore();
    expect(await store.setCode('1111')).toEqual({ ok: false, reason: 'repeated' });
    expect(await store.setCode('4321')).toEqual({ ok: false, reason: 'run' });
    expect(await store.isSet()).toBe(false);
    await store.setCode('2580');
    expect(await store.setCode('1357')).toEqual({ ok: false, reason: 'already-set' });
    expect(await store.verify('2580')).toEqual({ ok: true });
  });

  it('changes and removes the code only with the current one', async () => {
    const { store } = memoryCodeStore();
    await store.setCode('2580');
    expect(await store.changeCode('1357', '4096')).toMatchObject({ ok: false, reason: 'wrong' });
    expect(await store.changeCode('2580', '1234')).toEqual({ ok: false, reason: 'run' });
    expect(await store.changeCode('2580', '4096')).toEqual({ ok: true });
    expect(await store.verify('2580')).toMatchObject({ ok: false, reason: 'wrong' });
    expect(await store.verify('4096')).toEqual({ ok: true });

    expect(await store.removeCode('2580')).toMatchObject({ ok: false, reason: 'wrong' });
    expect(await store.isSet()).toBe(true);
    expect(await store.removeCode('4096')).toEqual({ ok: true });
    expect(await store.isSet()).toBe(false);
    expect(await store.verify('4096')).toEqual({ ok: false, reason: 'none' });
  });

  it('makes each wait longer after the second wrong try, on a clock', async () => {
    const clock = memoryCodeStore();
    const { store } = clock;
    await store.setCode('2580');
    const wrong = async () => store.verify('0001');

    // Two wrong tries cost nothing.
    expect(await wrong()).toEqual({ ok: false, reason: 'wrong', wrongTries: 1, waitUntil: null });
    expect(await wrong()).toEqual({ ok: false, reason: 'wrong', wrongTries: 2, waitUntil: null });

    const expected = [30 * SECOND, 1 * MINUTE, 2 * MINUTE, 5 * MINUTE, 15 * MINUTE, 30 * MINUTE, 60 * MINUTE, 60 * MINUTE];
    for (const [i, wait] of expected.entries()) {
      const result = await wrong();
      expect(result).toEqual({ ok: false, reason: 'wrong', wrongTries: i + 3, waitUntil: clock.now() + wait });
      // During the wait, even the right code is refused, and the try isn't counted.
      clock.advance(wait - 1);
      expect(await store.verify('2580')).toEqual({ ok: false, reason: 'wait', waitUntil: clock.now() + 1 });
      expect(store.getState().wrongTries).toBe(i + 3);
      clock.advance(1);
    }

    // The right code, once the wait is over, starts the count again.
    expect(await store.verify('2580')).toEqual({ ok: true });
    expect(store.getState()).toMatchObject({ wrongTries: 0, waitUntil: null });
    expect(await wrong()).toMatchObject({ wrongTries: 1, waitUntil: null });
  });

  it('keeps the count and the wait when the app is closed or the phone restarts', async () => {
    const clock = memoryCodeStore();
    await clock.store.setCode('2580');
    for (let i = 0; i < 3; i++) await clock.store.verify('0001');
    const waitUntil = clock.now() + 30 * SECOND;

    const reopened = clock.reopen();
    expect(await reopened.load()).toEqual({ loaded: true, set: true, wrongTries: 3, waitUntil });
    expect(await reopened.verify('2580')).toEqual({ ok: false, reason: 'wait', waitUntil });
    clock.advance(30 * SECOND);
    expect(await reopened.verify('0001')).toMatchObject({ wrongTries: 4, waitUntil: clock.now() + MINUTE });
  });

  it('counts a try before comparing, so closing the app mid-try does not undo it', async () => {
    let text: string | null = null;
    const storedWhenHashing: (number | null)[] = [];
    const store = new SecretCodeStore({
      storage: { read: async () => text, write: async (value) => void (text = value) },
      randomHex: (bytes) => randomBytes(bytes).toString('hex'),
      sha256Hex: async (value) => {
        // What a phone would find stored if the app were closed at this moment.
        storedWhenHashing.push(text ? JSON.parse(text).wrongTries : null);
        return createHash('sha256').update(value).digest('hex');
      },
      now: () => Date.parse('2026-11-06T10:00:00Z'),
    });
    await store.setCode('2580');
    storedWhenHashing.length = 0;
    await store.verify('0001');
    await store.verify('0001');
    await store.verify('2580');
    // Each try, the right one too, is already stored as a wrong one while it is compared.
    expect(storedWhenHashing).toEqual([1, 2, 3]);
    expect(store.getState().wrongTries).toBe(0);
  });

  it('starts the wait again if the phone clock is set back', async () => {
    const clock = memoryCodeStore();
    await clock.store.setCode('2580');
    for (let i = 0; i < 4; i++) {
      await clock.store.verify('0001');
      if (i < 3) clock.advance(30 * SECOND);
    }
    // A one-minute wait. Setting the clock back an hour doesn't end it: it restarts from the new time.
    clock.advance(-60 * MINUTE);
    expect(await clock.store.verify('2580')).toEqual({ ok: false, reason: 'wait', waitUntil: clock.now() + MINUTE });
  });

  it('fails, rather than reading as "no code", when the secure storage cannot be read', async () => {
    const clock = memoryCodeStore();
    await clock.store.setCode('2580');
    clock.breakReads();
    const reopened = clock.reopen();
    await expect(reopened.isSet()).rejects.toThrow('Keychain not available');
    await expect(reopened.setCode('1357')).rejects.toThrow();
    expect(JSON.parse(clock.saved() as string).code).not.toBeNull();
  });

  it('tells the screens at once after set, change and remove', async () => {
    const { store } = memoryCodeStore();
    const seen: boolean[] = [];
    store.subscribe(() => seen.push(store.getState().set));
    await store.load();
    await store.setCode('2580');
    expect(store.getState().set).toBe(true);
    await store.changeCode('2580', '4096');
    expect(store.getState().set).toBe(true);
    await store.removeCode('4096');
    expect(store.getState().set).toBe(false);
    expect(seen.at(-1)).toBe(false);
  });

  it('forgets the code and the tries on a reset', async () => {
    const { store } = memoryCodeStore();
    await store.setCode('2580');
    for (let i = 0; i < 5; i++) await store.verify('0001');
    await store.clear();
    expect(store.getState()).toEqual({ loaded: true, set: false, wrongTries: 0, waitUntil: null });
  });
});
