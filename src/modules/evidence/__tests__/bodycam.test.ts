import type { AudioRecorder } from 'expo-audio';

import { AudioPieces } from '../bodycam/audioPieces';
import { doublePress } from '../bodycam/doublePress';
import { CaptureSession } from '../capture/pipeline';
import { memoryLocker } from './memoryLocker';

jest.mock('expo-audio', () => ({ setAudioModeAsync: jest.fn(async () => undefined) }));

describe('doublePress', () => {
  it('fires on two presses within the window, then needs two more', () => {
    const unlock = jest.fn();
    const press = doublePress(unlock, 1500);
    press(0);
    expect(unlock).not.toHaveBeenCalled();
    press(1400);
    expect(unlock).toHaveBeenCalledTimes(1);
    press(1500);
    expect(unlock).toHaveBeenCalledTimes(1);
    press(4000);
    press(5600);
    expect(unlock).toHaveBeenCalledTimes(1);
    press(6000);
    expect(unlock).toHaveBeenCalledTimes(2);
  });
});

/** A stand-in for expo-audio's recorder that logs what happens to it. */
function fakeRecorder(name: string, log: string[], files: Map<string, Uint8Array>) {
  let n = 0;
  const recorder = {
    uri: null as string | null,
    isRecording: false,
    failNextPrepare: false,
    async prepareToRecordAsync() {
      if (recorder.failNextPrepare) {
        recorder.failNextPrepare = false;
        throw new Error('cannot start recording');
      }
      recorder.uri = `cache://${name}-${n++}.m4a`;
      files.set(recorder.uri, new Uint8Array([1, 2, 3]));
    },
    record() {
      recorder.isRecording = true;
      log.push(`start ${recorder.uri}`);
    },
    async stop() {
      recorder.isRecording = false;
      log.push(`stop ${recorder.uri}`);
    },
  };
  return recorder;
}

describe('AudioPieces (iPhone body-cam sound)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function setup() {
    const files = new Map<string, Uint8Array>();
    const locker = memoryLocker(files);
    const session = new CaptureSession({ store: locker.store, now: () => new Date(), newId: () => 'sess' });
    const log: string[] = [];
    const a = fakeRecorder('a', log, files);
    const b = fakeRecorder('b', log, files);
    const pieces = new AudioPieces(
      [a, b] as unknown as [AudioRecorder, AudioRecorder],
      session,
      locker.store,
      () => ({ status: 'denied', fix: null }),
      60,
    );
    return { files, locker, session, log, a, b, pieces };
  }

  it('starts each piece before stopping the last, so there is no silence', async () => {
    const { pieces, log, session, locker } = setup();
    await pieces.start();
    await jest.advanceTimersByTimeAsync(60_000);
    await jest.advanceTimersByTimeAsync(60_000);
    await pieces.stop();
    await session.drain();
    expect(log).toEqual([
      'start cache://a-0.m4a',
      'start cache://b-0.m4a',
      'stop cache://a-0.m4a',
      'start cache://a-1.m4a',
      'stop cache://b-0.m4a',
      'stop cache://a-1.m4a',
    ]);
    const items = locker.store.readSession('sess')!.items;
    expect(items.map((i) => [i.kind, i.segment, i.endReason, i.media])).toEqual([
      ['audio', { clip: 0, index: 0 }, 'piece-complete', '0000-audio0-seg0.m4a'],
      ['audio', { clip: 0, index: 1 }, 'piece-complete', '0001-audio0-seg1.m4a'],
      ['audio', { clip: 0, index: 2 }, 'stopped', '0002-audio0-seg2.m4a'],
    ]);
    expect(locker.store.listPending('sess')).toEqual([]);
  });

  it('keeps the current piece running if the next one cannot start, and logs the gap later', async () => {
    const { pieces, log, b } = setup();
    await pieces.start();
    b.failNextPrepare = true;
    await jest.advanceTimersByTimeAsync(60_000);
    expect(log).toEqual(['start cache://a-0.m4a']);
    await jest.advanceTimersByTimeAsync(60_000);
    expect(log).toEqual(['start cache://a-0.m4a', 'start cache://b-0.m4a', 'stop cache://a-0.m4a']);
    await pieces.stop();
  });

  it('marks a piece the system stopped (for example, a call) as audio-interrupted', async () => {
    const { pieces, a, session, locker } = setup();
    await pieces.start();
    a.isRecording = false;
    await jest.advanceTimersByTimeAsync(60_000);
    await pieces.stop();
    await session.drain();
    expect(locker.store.readSession('sess')!.items[0].endReason).toBe('audio-interrupted');
  });
});
