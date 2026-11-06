import type { BugCheckpointEvent, BugPieceClosedEvent, BugRecorderOptions } from '@native/saakshi-sos';

import type { SoundCheckpoint, SoundClosed } from '@/modules/evidence';

import { androidRecorder } from '../engines';

jest.mock('expo-audio', () => ({ requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true })) }));
jest.mock('@/modules/location', () => ({ getCurrentFix: jest.fn(async () => ({ status: 'unavailable' })) }));

/** A stand-in for the SaakshiSos module's bug-mode half: the test fires its events. */
function fakeSos() {
  const listeners = new Map<string, Set<(event: never) => void>>();
  const native = {
    started: [] as BugRecorderOptions[],
    stops: 0,
    /** Fire onBugRecorderStopped when stopped, as the service does. */
    confirmStop: true,
    /** What the recorder in the service says after a start: started, an error, or nothing. */
    onStart: 'started' as 'started' | 'error' | 'silent',
    addListener(name: string, listener: (event: never) => void) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(listener);
      return { remove: () => listeners.get(name)!.delete(listener) };
    },
    async bugRecorderStart(options: BugRecorderOptions) {
      native.started.push(options);
      if (native.onStart === 'started') setTimeout(() => native.fire('onBugRecorderStarted', {}), 10);
      if (native.onStart === 'error') setTimeout(() => native.fire('onBugRecorderError', { message: 'Could not start recording: busy' }), 10);
    },
    async bugRecorderStop() {
      native.stops++;
      if (native.confirmStop) setTimeout(() => native.fire('onBugRecorderStopped', {}), 10);
    },
    handOvers: [] as string[],
    async bugRecorderHandOver(reason: string) {
      native.handOvers.push(reason);
    },
    fire(name: string, event: unknown) {
      for (const listener of listeners.get(name) ?? []) listener(event as never);
    },
    listenerCount: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
  };
  return native;
}

const closed: BugPieceClosedEvent = {
  uri: 'file:///s/incoming/bug-0-0-1.aac',
  clip: 0,
  index: 0,
  startedAt: '2026-11-06T05:10:00.000Z',
  endedAt: '2026-11-06T05:20:00.000Z',
  endReason: 'stopped',
  gapBeforeMs: null,
  marker: 'bug-0-0-1.aac.json',
  recording: 'rec-1',
  finalSize: 4800,
  finalSha256: 'f'.repeat(64),
  final: true,
};

const checkpoint: BugCheckpointEvent = {
  recording: 'rec-1',
  uri: closed.uri,
  kind: 'audio',
  clip: 0,
  index: 0,
  checkpoint: 0,
  bytes: 800,
  sha256: 'c'.repeat(64),
  at: '2026-11-06T05:10:10.000Z',
  startedAt: closed.startedAt,
};

describe('androidRecorder (bug mode on Android)', () => {
  it('starts the service with its notification and passes its events on', async () => {
    const sos = fakeSos();
    const recorder = androidRecorder({ title: 'Recording', text: 'Open to stop' }, sos);
    const got = { checkpoints: [] as SoundCheckpoint[], closed: [] as SoundClosed[], errors: [] as string[] };
    const subscription = recorder.listen({
      checkpoint: (e) => got.checkpoints.push(e),
      closed: (e) => got.closed.push(e),
      error: (m) => got.errors.push(m),
    });
    await recorder.start({ outputDir: 'file:///s/incoming', pendingDir: 'file:///s/pending', clip: 0, checkpointSeconds: 10 });
    expect(sos.started).toEqual([
      {
        outputDir: 'file:///s/incoming',
        pendingDir: 'file:///s/pending',
        clip: 0,
        checkpointSeconds: 10,
        notificationTitle: 'Recording',
        notificationText: 'Open to stop',
      },
    ]);
    sos.fire('onBugCheckpoint', checkpoint);
    sos.fire('onBugRecorderError', { message: 'Checkpoint failed' });
    sos.fire('onBugPieceClosed', closed);
    expect(got.checkpoints).toEqual([checkpoint]);
    expect(got.errors).toEqual(['Checkpoint failed']);
    expect(got.closed).toEqual([
      {
        uri: closed.uri,
        clip: 0,
        index: 0,
        startedAt: closed.startedAt,
        endedAt: closed.endedAt,
        endReason: 'stopped',
        gapBeforeMs: null,
        recording: 'rec-1',
        finalSize: 4800,
        finalSha256: 'f'.repeat(64),
      },
    ]);
    subscription.remove();
    expect(sos.listenerCount()).toBe(0);
  });

  it('fails Start with the recorder\'s reason, and stops the service, if the first file cannot start', async () => {
    const sos = fakeSos();
    sos.onStart = 'error';
    const recorder = androidRecorder({ title: 't', text: 'x' }, sos);
    await expect(
      recorder.start({ outputDir: 'file:///s/incoming', pendingDir: 'file:///s/pending', clip: 0, checkpointSeconds: 10 }),
    ).rejects.toThrow('Could not start recording: busy');
    expect(sos.stops).toBe(1);
    expect(sos.listenerCount()).toBe(0);
  });

  it('fails Start if the recorder says nothing for 8 seconds', async () => {
    jest.useFakeTimers();
    try {
      const sos = fakeSos();
      sos.onStart = 'silent';
      const recorder = androidRecorder({ title: 't', text: 'x' }, sos);
      const starting = recorder.start({ outputDir: 'file:///s/incoming', pendingDir: 'file:///s/pending', clip: 0, checkpointSeconds: 10 });
      const outcome = starting.catch((e: Error) => e.message);
      await jest.advanceTimersByTimeAsync(8100);
      await expect(outcome).resolves.toBe('Recording did not start');
      expect(sos.stops).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('stops once the service says the last file has closed', async () => {
    const sos = fakeSos();
    const recorder = androidRecorder({ title: 't', text: 'x' }, sos);
    const subscription = recorder.listen({ checkpoint: () => undefined, closed: () => undefined, error: () => undefined });
    await expect(recorder.stop()).resolves.toEqual([]);
    expect(sos.stops).toBe(1);
    subscription.remove();
  });

  it('does not wait more than 5 seconds for the service', async () => {
    jest.useFakeTimers();
    try {
      const sos = fakeSos();
      sos.confirmStop = false;
      const recorder = androidRecorder({ title: 't', text: 'x' }, sos);
      recorder.listen({ checkpoint: () => undefined, closed: () => undefined, error: () => undefined });
      let done = false;
      const stopping = recorder.stop().then(() => {
        done = true;
      });
      await jest.advanceTimersByTimeAsync(4900);
      expect(done).toBe(false);
      await jest.advanceTimersByTimeAsync(200);
      await stopping;
      expect(done).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('refuses where bug mode is not built in', () => {
    expect(() => androidRecorder({ title: 't', text: 'x' }, null)).toThrow('not built into this app');
  });
});
