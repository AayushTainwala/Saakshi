import type { BodyCamOptions, RecordingClosedEvent } from '@native/saakshi-evidence';

import { androidBodyCam, closedFileFromEvent, iosBodyCam } from '../bodycam/engine';
import { setBodyCamPartListener, type UploadPart } from '../bodycam/parts';
import { CaptureSession } from '../capture/pipeline';
import type { LocationSnapshot } from '../types';
import { memoryLocker } from './memoryLocker';

const noLocation: LocationSnapshot = { status: 'denied', fix: null };

/** A stand-in for the native module's body-cam half: events are fired by the test. */
function fakeNative() {
  const listeners = new Map<string, Set<(event: never) => void>>();
  const native = {
    started: [] as BodyCamOptions[],
    stopResult: [] as RecordingClosedEvent[] | null,
    failStart: false,
    addListener(name: string, listener: (event: never) => void) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(listener);
      return { remove: () => listeners.get(name)!.delete(listener) };
    },
    async bodyCamStart(options: BodyCamOptions) {
      if (native.failStart) throw new Error('no camera');
      native.started.push(options);
    },
    async bodyCamStop() {
      return native.stopResult;
    },
    handOvers: [] as { reason: string; saving: boolean }[],
    saving: [] as boolean[],
    async bodyCamHandOver(reason: string, saving: boolean) {
      native.handOvers.push({ reason, saving });
    },
    async bodyCamSetSaving(on: boolean) {
      native.saving.push(on);
    },
    fire(name: string, event: unknown) {
      for (const listener of listeners.get(name) ?? []) listener(event as never);
    },
    listenerCount: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
  };
  return native;
}

function closed(over: Partial<RecordingClosedEvent> & { uri: string }): RecordingClosedEvent {
  return {
    startedAt: '2026-11-05T05:10:00.000Z',
    endedAt: '2026-11-05T05:11:00.000Z',
    clip: 0,
    index: 0,
    cutoffSafe: true,
    rotationDegrees: null,
    endReason: 'piece-complete',
    gapBeforeMs: null,
    ...over,
  };
}

function setup() {
  const files = new Map<string, Uint8Array>();
  const locker = memoryLocker(files);
  const session = new CaptureSession({
    store: locker.store,
    now: () => new Date('2026-11-05T05:20:00Z'),
    newId: () => 'sess',
    // Stands in for signing: names the record after its place in the chain.
    sealCheckpoint: async ({ sequence, checkpoint }) => ({
      record: { file: `${String(sequence).padStart(4, '0')}.json`, recordId: `cp-${sequence}` },
      recordSha256: `${checkpoint.recording}:${checkpoint.index}`,
    }),
  });
  const native = fakeNative();
  const common = { session, store: locker.store, location: () => noLocation, quality: 720 as const };
  const file = (uri: string) => {
    files.set(uri, new Uint8Array([1, 2, 3]));
    return uri;
  };
  return { files, locker, session, native, common, file };
}

describe('closedFileFromEvent', () => {
  it('turns a recorder event into a body-cam file with its piece, gap and marker', () => {
    const file = closedFileFromEvent(
      closed({
        uri: 'file:///s/incoming/bodycam-1-0-5.aac',
        kind: 'audio',
        clip: 1,
        endReason: 'video-resumed',
        gapBeforeMs: -500,
        recording: 'rec-1',
        finalSize: 4096,
        finalSha256: 'ab'.repeat(32),
      }),
      noLocation,
      null,
    );
    expect(file).toEqual({
      uri: 'file:///s/incoming/bodycam-1-0-5.aac',
      kind: 'audio',
      segment: { clip: 1, index: 0 },
      startedAt: new Date('2026-11-05T05:10:00.000Z'),
      endedAt: new Date('2026-11-05T05:11:00.000Z'),
      location: noLocation,
      mode: 'body-cam',
      endReason: 'video-resumed',
      gapBeforeMs: -500,
      rotationDegrees: null,
      pendingMarker: 'bodycam-1-0-5.aac.json',
      recording: 'rec-1',
      written: { size: 4096, sha256: 'ab'.repeat(32) },
    });
  });

  it('treats an event with no kind as video (Android)', () => {
    expect(closedFileFromEvent(closed({ uri: 'file:///a.ts' }), noLocation, null).kind).toBe('video');
  });

  it("gives a stopped file the stop's reason, and leaves other reasons alone", () => {
    expect(closedFileFromEvent(closed({ uri: 'file:///a.mov', endReason: 'stopped' }), noLocation, 'low-battery').endReason).toBe(
      'low-battery',
    );
    expect(closedFileFromEvent(closed({ uri: 'file:///a.mov', endReason: 'app-left' }), noLocation, 'low-battery').endReason).toBe(
      'app-left',
    );
  });
});

describe('iosBodyCam', () => {
  it('starts the native recorder in the session folder with the first clip number', async () => {
    const { native, common } = setup();
    const engine = iosBodyCam(common, native);
    await engine.start();
    expect(native.started).toEqual([
      expect.objectContaining({
        outputDir: 'mem://sess/incoming',
        pendingDir: 'mem://sess/pending',
        pieceSeconds: 0,
        checkpointSeconds: 10,
        quality: 720,
        clip: 0,
        mode: 'body-cam',
      }),
    ]);
  });

  it('keeps every file in one session: video with sound, sound alone while away, video again', async () => {
    const { native, common, session, locker, file } = setup();
    const engine = iosBodyCam(common, native);
    await engine.start();
    native.fire('onRecordingClosed', closed({ uri: file('file:///v0.mov'), clip: 0, index: 0, endReason: 'piece-complete' }));
    native.fire('onRecordingClosed', closed({ uri: file('file:///v1.mov'), clip: 0, index: 1, endReason: 'app-left', gapBeforeMs: 0 }));
    native.fire(
      'onRecordingClosed',
      closed({ uri: file('file:///s0.m4a'), kind: 'audio', clip: 1, index: 0, endReason: 'video-resumed', gapBeforeMs: -500 }),
    );
    native.stopResult = [closed({ uri: file('file:///v2.mov'), clip: 2, index: 0, endReason: 'stopped', gapBeforeMs: 42_000 })];
    await engine.stop();
    await session.finish();

    const items = locker.store.readSession('sess')!.items;
    expect(items.map((i) => [i.kind, i.segment, i.endReason])).toEqual([
      ['video', { clip: 0, index: 0 }, 'piece-complete'],
      ['video', { clip: 0, index: 1 }, 'app-left'],
      ['audio', { clip: 1, index: 0 }, 'video-resumed'],
      ['video', { clip: 2, index: 0 }, 'stopped'],
    ]);
    expect(locker.store.listSessions()).toHaveLength(1);
  });

  it('adds a file once when both its event and the stop report it', async () => {
    const { native, common, session, locker, file } = setup();
    const engine = iosBodyCam(common, native);
    await engine.start();
    const last = closed({ uri: file('file:///v0.mov'), endReason: 'stopped' });
    native.fire('onRecordingClosed', last);
    native.stopResult = [last];
    await engine.stop('low-battery');
    await session.finish();
    const items = locker.store.readSession('sess')!.items;
    expect(items).toHaveLength(1);
    // The event came before the stop's reason was known.
    expect(items[0].endReason).toBe('stopped');
  });

  it("uses the stop's reason for files the stop closed", async () => {
    const { native, common, session, locker, file } = setup();
    const engine = iosBodyCam(common, native);
    await engine.start();
    native.stopResult = [
      closed({ uri: file('file:///v0.mov'), endReason: 'stopped' }),
      closed({ uri: file('file:///s0.m4a'), kind: 'audio', clip: 1, endReason: 'stopped' }),
    ];
    await engine.stop('low-battery');
    await session.finish();
    expect(locker.store.readSession('sess')!.items.map((i) => i.endReason)).toEqual(['low-battery', 'low-battery']);
  });

  it('passes recorder problems on, and stops listening after stop', async () => {
    const { native, common } = setup();
    const problems: string[] = [];
    const engine = iosBodyCam({ ...common, onProblem: (message) => problems.push(message) }, native);
    await engine.start();
    native.fire('onRecorderError', { message: 'A sound file could not be started' });
    expect(problems).toEqual(['A sound file could not be started']);
    await engine.stop();
    expect(native.listenerCount()).toBe(0);
  });

  it('stops listening if the recorder cannot start', async () => {
    const { native, common } = setup();
    native.failStart = true;
    const engine = iosBodyCam(common, native);
    await expect(engine.start()).rejects.toThrow('no camera');
    expect(native.listenerCount()).toBe(0);
  });
});

describe('the low-battery handover in body-cam (round 2, group 1.5)', () => {
  it('Android: a file closed as "low-battery" is not the last; Stop still waits for the last one', async () => {
    const { native, common, session, locker, file } = setup();
    const engine = androidBodyCam({ ...common, notificationTitle: 't', notificationText: 'x' }, native);
    await engine.start();
    await engine.handOver(true);
    expect(native.handOvers).toEqual([{ reason: 'low-battery', saving: true }]);
    native.fire('onRecordingClosed', closed({ uri: file('file:///p0.ts'), endReason: 'low-battery' }));
    const stopping = engine.stop();
    native.fire('onRecordingClosed', closed({ uri: file('file:///p1.ts'), index: 1, endReason: 'stopped', gapBeforeMs: 900 }));
    await stopping;
    await session.finish();
    expect(locker.store.readSession('sess')!.items.map((i) => [i.segment, i.endReason])).toEqual([
      [{ clip: 0, index: 0 }, 'low-battery'],
      [{ clip: 0, index: 1 }, 'stopped'],
    ]);
  });

  it('iPhone: hands over at 480p, and saving mode can be turned off for the next file', async () => {
    const { native, common } = setup();
    const engine = iosBodyCam(common, native);
    await engine.start();
    await engine.handOver(true);
    await engine.setSaving(false);
    expect(native.handOvers).toEqual([{ reason: 'low-battery', saving: true }]);
    expect(native.saving).toEqual([false]);
    await engine.stop();
  });
});

describe('androidBodyCam', () => {
  it('seals pieces as they close and waits for the last one on stop', async () => {
    const { native, common, session, locker, file } = setup();
    const engine = androidBodyCam({ ...common, notificationTitle: 't', notificationText: 'x' }, native);
    await engine.start();
    native.fire('onRecordingClosed', closed({ uri: file('file:///p0.ts'), endReason: 'piece-complete', rotationDegrees: 90 }));
    const stopping = engine.stop();
    native.fire('onRecordingClosed', closed({ uri: file('file:///p1.ts'), index: 1, endReason: 'stopped', gapBeforeMs: 180 }));
    await stopping;
    await session.finish();
    const items = locker.store.readSession('sess')!.items;
    expect(items.map((i) => [i.kind, i.segment, i.endReason])).toEqual([
      ['video', { clip: 0, index: 0 }, 'piece-complete'],
      ['video', { clip: 0, index: 1 }, 'stopped'],
    ]);
    expect(native.listenerCount()).toBe(0);
  });
});

describe('checkpoints (format 0.5)', () => {
  function checkpointEvent(recording: string, checkpoint: number, bytes: number, at: string) {
    return {
      recording,
      uri: `file:///s/incoming/${recording}.mp4`,
      kind: 'video' as const,
      clip: 0,
      index: 0,
      checkpoint,
      bytes,
      sha256: `${checkpoint}`.padStart(64, '0'),
      at,
      startedAt: '2026-11-05T05:10:00.000Z',
    };
  }

  afterEach(() => setBodyCamPartListener(null));

  it('chains each checkpoint as it comes, before the file it belongs to', async () => {
    const { native, common, session, locker, file } = setup();
    const engine = iosBodyCam(common, native);
    await engine.start();
    native.fire('onCheckpoint', checkpointEvent('rec-a', 0, 1000, '2026-11-05T05:10:10.000Z'));
    native.fire('onCheckpoint', checkpointEvent('rec-a', 1, 2500, '2026-11-05T05:10:20.000Z'));
    native.stopResult = [closed({ uri: file('file:///s/incoming/rec-a.mp4'), endReason: 'stopped', recording: 'rec-a', finalSize: 3, finalSha256: 'f'.repeat(64) })];
    await engine.stop();
    await session.finish();

    const state = locker.store.readSession('sess')!;
    expect(state.checkpoints!.map((c) => [c.sequence, c.recording, c.index, c.bytes, c.status])).toEqual([
      [0, 'rec-a', 0, 1000, 'sealed'],
      [1, 'rec-a', 1, 2500, 'sealed'],
    ]);
    expect(state.items.map((i) => [i.sequence, i.recording, i.media])).toEqual([[2, 'rec-a', '0002-clip0-seg0.mp4']]);
  });

  it("notes a file that differs from what the recorder wrote", async () => {
    const { native, common, session, locker, file } = setup();
    const hashing = new CaptureSession({
      store: locker.store,
      now: () => new Date(),
      newId: () => 'sess',
      hash: async () => ({ size: 3, sha256: 'a'.repeat(64), sha1: '', md5: '', crc32: 0 }),
    });
    const engine = iosBodyCam({ ...common, session: hashing }, native);
    await engine.start();
    native.stopResult = [closed({ uri: file('file:///s/incoming/x.mp4'), endReason: 'stopped', recording: 'x', finalSize: 3, finalSha256: 'b'.repeat(64) })];
    await engine.stop();
    await hashing.finish();
    expect(locker.store.readSession('sess')!.items[0].writtenMismatch).toBe(true);
    void session;
  });

  it('hands out upload parts that end on checkpoints and join up to the whole file', async () => {
    const parts: UploadPart[] = [];
    setBodyCamPartListener((part) => parts.push(part));
    const { native, common, file, session } = setup();
    const engine = androidBodyCam({ ...common, partSeconds: 20, notificationTitle: 't', notificationText: 'x' }, native);
    await engine.start();
    native.fire('onCheckpoint', checkpointEvent('rec-b', 0, 1000, '2026-11-05T05:10:10.000Z'));
    native.fire('onCheckpoint', checkpointEvent('rec-b', 1, 2000, '2026-11-05T05:10:20.000Z'));
    native.fire('onCheckpoint', checkpointEvent('rec-b', 2, 3000, '2026-11-05T05:10:30.000Z'));
    native.fire('onCheckpoint', checkpointEvent('rec-b', 3, 4000, '2026-11-05T05:10:40.000Z'));
    const stopping = engine.stop();
    native.fire('onRecordingClosed', closed({ uri: file('file:///s/incoming/rec-b.ts'), endReason: 'stopped', recording: 'rec-b', finalSize: 4500, finalSha256: 'e'.repeat(64) }));
    await stopping;
    // Parts come as their checkpoints are signed, and the last once the file is sealed.
    await session.drain();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(parts.map((p) => [p.index, p.offset, p.length, p.endsAt.checkpoint, p.final])).toEqual([
      [0, 0, 2000, 1, false],
      [1, 2000, 2000, 3, false],
      [2, 4000, 500, null, true],
    ]);
  });
});
