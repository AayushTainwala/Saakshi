import { startUnlockPractice } from '../bodycam/practice';

/** A stand-in for the native module's button half: presses are fired by the test. */
function fakeNative() {
  const listeners = new Set<() => void>();
  const calls: string[] = [];
  const native = {
    calls,
    addListener(name: string, listener: () => void) {
      calls.push(`listen ${name}`);
      listeners.add(listener);
      return { remove: () => void listeners.delete(listener) };
    },
    volumeKeysStart: jest.fn(async () => void calls.push('volumeKeysStart')),
    volumeKeysStop: jest.fn(async () => void calls.push('volumeKeysStop')),
    unlockPracticeStart: jest.fn(async () => void calls.push('unlockPracticeStart')),
    unlockPracticeStop: jest.fn(async () => void calls.push('unlockPracticeStop')),
    press() {
      for (const listener of [...listeners]) listener();
    },
    listening: () => listeners.size,
  };
  return native;
}

describe('startUnlockPractice', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-05T10:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('on iPhone, runs the camera practice and finishes on volume-up twice', async () => {
    const native = fakeNative();
    const done = jest.fn();
    const practice = startUnlockPractice(native, 'ios', done);
    expect(native.calls).toEqual(['unlockPracticeStart', 'listen onVolumeUp']);
    native.press();
    jest.advanceTimersByTime(600);
    native.press();
    expect(done).toHaveBeenCalledTimes(1);
    expect(native.listening()).toBe(0);
    await practice.stop();
    expect(native.unlockPracticeStop).toHaveBeenCalledTimes(1);
    expect(native.volumeKeysStart).not.toHaveBeenCalled();
  });

  it('on Android, uses the volume keys', async () => {
    const native = fakeNative();
    const done = jest.fn();
    const practice = startUnlockPractice(native, 'android', done);
    native.press();
    native.press();
    expect(done).toHaveBeenCalledTimes(1);
    await practice.stop();
    expect(native.calls).toEqual(['volumeKeysStart', 'listen onVolumeUp', 'volumeKeysStop']);
    expect(native.unlockPracticeStart).not.toHaveBeenCalled();
  });

  it('needs the two presses within the unlock window', () => {
    const native = fakeNative();
    const done = jest.fn();
    startUnlockPractice(native, 'ios', done);
    native.press();
    jest.advanceTimersByTime(2000);
    native.press();
    expect(done).not.toHaveBeenCalled();
    jest.advanceTimersByTime(500);
    native.press();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('stops without finishing when cancelled, and releases the buttons once', async () => {
    const native = fakeNative();
    const done = jest.fn();
    const practice = startUnlockPractice(native, 'ios', done);
    native.press();
    const first = practice.stop();
    const second = practice.stop();
    expect(second).toBe(first);
    await first;
    native.press();
    expect(done).not.toHaveBeenCalled();
    expect(native.unlockPracticeStop).toHaveBeenCalledTimes(1);
  });

  it('still releases the camera if starting it failed', async () => {
    const native = fakeNative();
    native.unlockPracticeStart.mockRejectedValueOnce(new Error('no camera'));
    const practice = startUnlockPractice(native, 'ios', jest.fn());
    await practice.stop();
    expect(native.unlockPracticeStop).toHaveBeenCalledTimes(1);
  });
});
