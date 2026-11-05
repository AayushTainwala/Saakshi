import type { BodyCamOptions, RecordingClosedEvent } from '@native/saakshi-evidence';

import { androidBodyCam, closedFileFromEvent, iosBodyCam } from '../bodycam/engine';
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
  const session = new CaptureSession({ store: locker.store, now: () => new Date('2026-11-05T05:20:00Z'), newId: () => 'sess' });
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
      closed({ uri: 'file:///s/incoming/bodycam-1-0-5.m4a', kind: 'audio', clip: 1, endReason: 'video-resumed', gapBeforeMs: -500 }),
      noLocation,
      null,
    );
    expect(file).toEqual({
      uri: 'file:///s/incoming/bodycam-1-0-5.m4a',
      kind: 'audio',
      segment: { clip: 1, index: 0 },
      startedAt: new Date('2026-11-05T05:10:00.000Z'),
      endedAt: new Date('2026-11-05T05:11:00.000Z'),
      location: noLocation,
      mode: 'body-cam',
      endReason: 'video-resumed',
      gapBeforeMs: -500,
      rotationDegrees: null,
      pendingMarker: 'bodycam-1-0-5.m4a.json',
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
        pieceSeconds: 60,
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

describe('androidBodyCam', () => {
  it('seals pieces as they close and waits for the last one on stop', async () => {
    const { native, common, session, locker, file } = setup();
    const engine = androidBodyCam({ ...common, notificationTitle: 't', notificationText: 'x', notificationStop: 's' }, native);
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
