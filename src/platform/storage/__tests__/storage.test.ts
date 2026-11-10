import { GB, MB, SAFETY_FLOOR_BYTES, startingKeepFreeBytes } from '../limits';
import { canStart, roundedMinutes, secondsLeft, type StorageAction, storageMonitor } from '../monitor';
import { bytesPerHour, cameraBytesPerSecond, soundBytesPerSecond, videoBytesPerSecond } from '../rates';
import { normalizeStorageSettings } from '../settings';
import { watchStorage } from '../watch';

/** Repair round A, group 2: free storage, stage one. */

const video = videoBytesPerSecond(720);
const KEEP = 5 * GB;

describe('how long the free room allows', () => {
  it('is the room above the limit, divided by the rate', () => {
    // 3 Mbit/s of video and 128 kbit/s of sound, with a tenth added: 430,100 bytes a second.
    expect(video).toBe(430_100);
    expect(secondsLeft(KEEP + video * 12_000, KEEP, video)).toBe(12_000);
    expect(secondsLeft(KEEP + video * 12_000 + 5, KEEP, video)).toBe(12_000);
  });

  it('is nothing at or below the limit, and unknown when the phone does not say', () => {
    expect(secondsLeft(KEEP, KEEP, video)).toBe(0);
    expect(secondsLeft(KEEP - 1, KEEP, video)).toBe(0);
    expect(secondsLeft(null, KEEP, video)).toBeNull();
    expect(secondsLeft(10 * GB, KEEP, 0)).toBeNull();
  });

  it('says a time roughly: minutes under an hour, then steps of 5 minutes, then of half an hour', () => {
    expect(roundedMinutes(59)).toBe(0);
    expect(roundedMinutes(47 * 60 + 59)).toBe(47);
    expect(roundedMinutes(12_000)).toBe(200); // 3 h 20 min
    expect(roundedMinutes(12_000 + 4 * 60)).toBe(200);
    expect(roundedMinutes(7 * 3600 + 50 * 60)).toBe(450); // 7 h 30 min
  });

  it('takes its sizes for an hour from the rates the recorders are set to', () => {
    // About 1.4 GB for an hour of 720p body-cam video, about 2.8 GB at 1080p.
    expect(bytesPerHour(videoBytesPerSecond(720)) / GB).toBeCloseTo(1.4, 1);
    expect(bytesPerHour(videoBytesPerSecond(1080)) / GB).toBeCloseTo(2.8, 1);
    // Sound: 128 kbit/s on iPhone, 64 kbit/s on Android.
    expect(Math.round(bytesPerHour(soundBytesPerSecond('ios')) / MB)).toBe(60);
    expect(Math.round(bytesPerHour(soundBytesPerSecond('android')) / MB)).toBe(30);
    // The Android evidence camera is the app's own recorder at 720p; iPhone's rate is an assumption.
    expect(cameraBytesPerSecond('android')).toBe(videoBytesPerSecond(720));
    expect(cameraBytesPerSecond('ios')).toBeGreaterThan(videoBytesPerSecond(1080));
  });
});

describe('the keep-free amount and the floor', () => {
  it('starts at 5 GB whatever the phone, from one function', () => {
    expect(startingKeepFreeBytes(null)).toBe(5 * GB);
    expect(startingKeepFreeBytes(32 * GB)).toBe(5 * GB);
    expect(startingKeepFreeBytes(256 * GB)).toBe(5 * GB);
  });

  it('keeps a floor of 300 MB', () => {
    expect(SAFETY_FLOOR_BYTES).toBe(300 * MB);
  });

  it('keeps only settings it offers', () => {
    const defaults = { keepFreeBytes: 5 * GB, bodyCamSoundOnly: true, explained: false };
    expect(normalizeStorageSettings(null, defaults)).toEqual(defaults);
    expect(normalizeStorageSettings({ keepFreeBytes: 10 * GB, bodyCamSoundOnly: false, explained: true }, defaults)).toEqual({
      keepFreeBytes: 10 * GB,
      bodyCamSoundOnly: false,
      explained: true,
    });
    // An amount that isn't offered (or below the floor) is not kept.
    expect(normalizeStorageSettings({ keepFreeBytes: 100 * MB }, defaults).keepFreeBytes).toBe(5 * GB);
    expect(normalizeStorageSettings({ keepFreeBytes: '5' }, defaults).keepFreeBytes).toBe(5 * GB);
  });

  it('lets a recording start only above the amount it would stop at, and never refuses on an unknown reading', () => {
    expect(canStart(KEEP + 1, KEEP)).toBe(true);
    expect(canStart(KEEP, KEEP)).toBe(false);
    expect(canStart(SAFETY_FLOOR_BYTES + 1, SAFETY_FLOOR_BYTES)).toBe(true);
    expect(canStart(SAFETY_FLOOR_BYTES, SAFETY_FLOOR_BYTES)).toBe(false);
    expect(canStart(null, KEEP)).toBe(true);
  });
});

describe('storageMonitor', () => {
  const at = (minutesLeft: number) => KEEP + video * 60 * minutesLeft;
  const reading = (freeBytes: number | null, limitBytes = KEEP) => ({ freeBytes, limitBytes, floorBytes: SAFETY_FLOOR_BYTES, bytesPerSecond: video });

  it('warns at about 30 and 10 minutes left, each once, then says the limit, then the floor', () => {
    const monitor = storageMonitor();
    const seen: StorageAction[] = [];
    for (const free of [at(120), at(31), at(30), at(29), at(15), at(10), at(9), at(1), KEEP, KEEP - MB, SAFETY_FLOOR_BYTES + 1, SAFETY_FLOOR_BYTES, 0]) {
      seen.push(...monitor(reading(free)));
    }
    expect(seen).toEqual([{ type: 'warn', minutes: 30 }, { type: 'warn', minutes: 10 }, { type: 'limit' }, { type: 'floor' }]);
  });

  it('says only the nearer warning when a recording starts with little room', () => {
    const monitor = storageMonitor();
    expect(monitor(reading(at(8)))).toEqual([{ type: 'warn', minutes: 10 }]);
    expect(monitor(reading(at(7)))).toEqual([]);
  });

  it('says the floor even if the limit was never seen, and nothing after it', () => {
    const monitor = storageMonitor();
    expect(monitor(reading(at(100)))).toEqual([]);
    expect(monitor(reading(SAFETY_FLOOR_BYTES - 1))).toEqual([{ type: 'floor' }]);
    expect(monitor(reading(SAFETY_FLOOR_BYTES - 2))).toEqual([]);
    expect(monitor(reading(at(100)))).toEqual([]);
  });

  it('watches down to the floor for a recorder whose limit is the floor', () => {
    // "My phone is being taken": past the keep-free amount, down to the floor.
    const monitor = storageMonitor();
    const sound = soundBytesPerSecond('android');
    const toFloor = (freeBytes: number) => ({ freeBytes, limitBytes: SAFETY_FLOOR_BYTES, floorBytes: SAFETY_FLOOR_BYTES, bytesPerSecond: sound });
    expect(monitor(toFloor(KEEP + GB))).toEqual([]);
    expect(monitor(toFloor(KEEP))).toEqual([]);
    expect(monitor(toFloor(KEEP - GB))).toEqual([]);
    expect(monitor(toFloor(SAFETY_FLOOR_BYTES + sound * 60 * 20))).toEqual([{ type: 'warn', minutes: 30 }]);
    expect(monitor(toFloor(SAFETY_FLOOR_BYTES + sound * 60 * 5))).toEqual([{ type: 'warn', minutes: 10 }]);
    expect(monitor(toFloor(SAFETY_FLOOR_BYTES))).toEqual([{ type: 'floor' }]);
  });

  it('never stops anything on a failed reading: it says "unknown" once, and "known" when the phone answers again', () => {
    const monitor = storageMonitor();
    expect(monitor(reading(null))).toEqual([{ type: 'unknown' }]);
    expect(monitor(reading(null))).toEqual([]);
    expect(monitor(reading(null))).toEqual([]);
    expect(monitor(reading(at(100)))).toEqual([{ type: 'known' }]);
    expect(monitor(reading(null))).toEqual([{ type: 'unknown' }]);
    // The phone answers again, and it is at the limit.
    expect(monitor(reading(KEEP))).toEqual([{ type: 'known' }, { type: 'limit' }]);
  });

  it('starts its warnings again after a reset, for body-cam carrying on as sound only', () => {
    const monitor = storageMonitor();
    const sound = soundBytesPerSecond('ios');
    expect(monitor(reading(at(5)))).toEqual([{ type: 'warn', minutes: 10 }]);
    expect(monitor(reading(KEEP))).toEqual([{ type: 'limit' }]);
    monitor.reset();
    const soundOnly = (freeBytes: number) => ({ freeBytes, limitBytes: SAFETY_FLOOR_BYTES, floorBytes: SAFETY_FLOOR_BYTES, bytesPerSecond: sound });
    // Hours of sound fit between the keep-free amount and the floor.
    expect(monitor(soundOnly(KEEP - MB))).toEqual([]);
    expect(monitor(soundOnly(SAFETY_FLOOR_BYTES + sound * 60 * 25))).toEqual([{ type: 'warn', minutes: 30 }]);
    expect(monitor(soundOnly(SAFETY_FLOOR_BYTES + sound * 60 * 9))).toEqual([{ type: 'warn', minutes: 10 }]);
    expect(monitor(soundOnly(SAFETY_FLOOR_BYTES))).toEqual([{ type: 'floor' }]);
  });

  it('can reach the limit again after room came back', () => {
    const monitor = storageMonitor();
    expect(monitor(reading(KEEP))).toEqual([{ type: 'limit' }]);
    expect(monitor(reading(KEEP))).toEqual([]);
    expect(monitor(reading(at(200)))).toEqual([]);
    expect(monitor(reading(KEEP))).toEqual([{ type: 'limit' }]);
  });
});

describe('watchStorage', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('reads at once and every 10 seconds, until stopped', () => {
    const free = [KEEP + video * 60 * 40, KEEP + video * 60 * 20, null, KEEP, 0];
    const seen: StorageAction[] = [];
    let reads = 0;
    const watch = watchStorage(
      () => ({ limitBytes: KEEP, floorBytes: SAFETY_FLOOR_BYTES, bytesPerSecond: video }),
      (action) => seen.push(action),
      () => free[Math.min(reads++, free.length - 1)],
    );
    expect(reads).toBe(1);
    jest.advanceTimersByTime(10_000);
    expect(seen).toEqual([{ type: 'warn', minutes: 30 }]);
    jest.advanceTimersByTime(10_000);
    expect(seen.at(-1)).toEqual({ type: 'unknown' });
    jest.advanceTimersByTime(10_000);
    expect(seen.slice(-2)).toEqual([{ type: 'known' }, { type: 'limit' }]);
    watch.stop();
    jest.advanceTimersByTime(60_000);
    expect(reads).toBe(4);
    expect(seen.some((action) => action.type === 'floor')).toBe(false);
  });
});
