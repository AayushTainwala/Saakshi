import type { CaptureSession, EvidenceItem } from '@/modules/evidence';

import { type BugDeps, BugModeController } from '../controller';
import { WitnessThrottle } from '../witness';

type Checkpoint = CaptureSession['checkpoints'][number];

/** Just enough of a CaptureSession: checkpoints and files that change, and listeners. */
function fakeSession() {
  const listeners = new Set<() => void>();
  let items: EvidenceItem[] = [];
  let checkpoints: Checkpoint[] = [];
  const session = {
    id: 'session-1',
    get items() {
      return items;
    },
    get checkpoints() {
      return checkpoints;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  } as unknown as CaptureSession;
  const notify = () => {
    for (const listener of listeners) listener();
  };
  return {
    session,
    /** A checkpoint of the file being written, signed into the chain at `sequence`. */
    checkpoint(sequence: number, at: string) {
      checkpoints = [
        ...checkpoints,
        { sequence, recording: 'rec', index: checkpoints.length, bytes: 1000 * (sequence + 1), sha256: 's', at, status: 'sealed', recordSha256: `hash-${sequence}` },
      ];
      notify();
    },
    file(sequence: number, status: EvidenceItem['status'], endedAt = '2026-10-20T09:30:00.000Z') {
      items = [
        ...items.filter((i) => i.sequence !== sequence),
        {
          sequence,
          kind: 'audio',
          segment: { clip: 0, index: 0 },
          media: `${sequence}.aac`,
          mediaType: 'audio/aac',
          startedAt: '2026-10-20T09:00:00.000Z',
          endedAt,
          status,
          recordSha256: status === 'sealed' ? `hash-${sequence}` : undefined,
        },
      ];
      notify();
    },
  };
}

function setup(options: { contacts?: number } = {}) {
  const fake = fakeSession();
  let clock = Date.parse('2026-10-20T09:00:00Z');
  const stopEngine = jest.fn(async (): Promise<void> => undefined);
  const deps: BugDeps = {
    startEngine: jest.fn(async () => ({ session: fake.session, stop: stopEngine })),
    witnessCost: jest.fn(async () => options.contacts ?? 2),
    witness: jest.fn(async () => options.contacts ?? 2),
    witnessText: (latest, startedAt) => `since ${startedAt}, to ${latest.at}: ${latest.recordSha256}`,
    liveActivity: { start: jest.fn(async () => undefined), update: jest.fn(async () => undefined), end: jest.fn(async () => undefined) },
    now: () => new Date(clock),
  };
  const advance = (seconds: number) => void (clock += seconds * 1000);
  const time = () => new Date(clock).toISOString();
  return { bug: new BugModeController(deps), deps, fake, stopEngine, advance, time };
}

describe('BugModeController', () => {
  it('counts checkpoints and texts the newest one, at most once every 10 minutes', async () => {
    const { bug, deps, fake, advance, time } = setup();
    await bug.start();
    expect(bug.getState()).toMatchObject({ running: true, sessionId: 'session-1', checkpoints: 0, lastSignedAt: null });
    expect(deps.liveActivity.start).toHaveBeenCalled();

    // A checkpoint every 10 seconds for 11 minutes: the first is texted, then the one at 10 minutes.
    for (let n = 0; n < 66; n++) {
      advance(10);
      fake.checkpoint(n, time());
      await bug.settled();
    }
    expect(bug.getState()).toMatchObject({ checkpoints: 66, files: 0, witnessed: 2, lastSignedAt: '2026-10-20T09:11:00.000Z' });
    expect(deps.witness).toHaveBeenCalledTimes(2);
    expect(deps.witness).toHaveBeenNthCalledWith(1, 'since 2026-10-20T09:00:00.000Z, to 2026-10-20T09:00:10.000Z: hash-0');
    expect(deps.witness).toHaveBeenNthCalledWith(2, 'since 2026-10-20T09:00:00.000Z, to 2026-10-20T09:10:10.000Z: hash-60');
    // Cheap check first: contacts are counted only when a text may be due.
    expect(deps.witnessCost).toHaveBeenCalledTimes(2);
  });

  it('updates the Live Activity at most once a minute', async () => {
    const { bug, deps, fake, advance, time } = setup();
    await bug.start();
    for (let n = 0; n < 13; n++) {
      advance(10);
      fake.checkpoint(n, time());
      await bug.settled();
    }
    expect((deps.liveActivity.update as jest.Mock).mock.calls).toEqual([
      ['2026-10-20T09:00:10.000Z'],
      ['2026-10-20T09:01:10.000Z'],
      ['2026-10-20T09:02:10.000Z'],
    ]);
  });

  it('counts the file when it is sealed at the end, and those that fail', async () => {
    const { bug, fake, advance, time } = setup();
    await bug.start();
    advance(10);
    fake.checkpoint(0, time());
    fake.file(1, 'hashed');
    fake.file(1, 'failed');
    fake.file(2, 'sealed', '2026-10-20T09:00:15.000Z');
    await bug.settled();
    expect(bug.getState()).toMatchObject({ checkpoints: 1, files: 1, failed: 1, lastSignedAt: '2026-10-20T09:00:15.000Z' });
  });

  it('also keeps to 20 texts in 30 minutes', async () => {
    const { bug, deps, fake, advance, time } = setup({ contacts: 10 });
    await bug.start();
    for (let n = 0; n < 3; n++) {
      fake.checkpoint(n, time());
      await bug.settled();
      advance(600);
    }
    // 10 contacts: two messages fit in 20 texts per 30 minutes.
    expect(deps.witness).toHaveBeenCalledTimes(2);
  });

  it('does not witness where the phone cannot text with no tap', async () => {
    const { bug, deps, fake, time } = setup({ contacts: 0 });
    await bug.start();
    fake.checkpoint(0, time());
    await bug.settled();
    expect(deps.witness).not.toHaveBeenCalled();
  });

  it('witnesses the last file when Stop seals it, if a text is due', async () => {
    const { bug, deps, fake, stopEngine, advance } = setup();
    stopEngine.mockImplementationOnce(async () => fake.file(0, 'sealed', '2026-10-20T09:00:05.000Z'));
    await bug.start();
    advance(5);
    await bug.stop();
    expect(deps.witness).toHaveBeenCalledWith('since 2026-10-20T09:00:00.000Z, to 2026-10-20T09:00:05.000Z: hash-0');
    expect(bug.getState()).toMatchObject({ running: false, files: 1, witnessed: 1 });
  });

  it('stops the recorder and the Live Activity', async () => {
    const { bug, deps, stopEngine } = setup();
    await bug.start();
    await bug.stop();
    expect(stopEngine).toHaveBeenCalledWith('stopped');
    expect(deps.liveActivity.end).toHaveBeenCalled();
    expect(bug.getState().running).toBe(false);
  });

  it('starts once however often it is asked', async () => {
    const { bug, deps } = setup();
    await Promise.all([bug.start(), bug.start()]);
    await bug.start();
    expect(deps.startEngine).toHaveBeenCalledTimes(1);
  });

  it('reports a recorder that cannot start', async () => {
    const { bug, deps } = setup();
    (deps.startEngine as jest.Mock).mockRejectedValueOnce(new Error('Microphone permission was not granted'));
    await expect(bug.start()).rejects.toThrow('Microphone');
    expect(bug.getState()).toMatchObject({ running: false, error: 'Microphone permission was not granted' });
  });
});

describe('WitnessThrottle', () => {
  const minute = 60_000;

  it('allows one message every 10 minutes', () => {
    const throttle = new WitnessThrottle();
    expect(throttle.due(0)).toBe(true);
    expect(throttle.allow(2, 0)).toBe(true);
    expect(throttle.due(9 * minute)).toBe(false);
    expect(throttle.allow(2, 9 * minute)).toBe(false);
    expect(throttle.due(10 * minute)).toBe(true);
    expect(throttle.allow(2, 10 * minute)).toBe(true);
  });

  it('allows 20 texts in any 30 minutes', () => {
    const throttle = new WitnessThrottle();
    expect(throttle.allow(10, 0)).toBe(true);
    expect(throttle.allow(10, 10 * minute)).toBe(true);
    expect(throttle.allow(1, 20 * minute)).toBe(false);
    expect(throttle.allow(10, 30 * minute)).toBe(true);
    expect(throttle.allow(0, 41 * minute)).toBe(false);
  });
});
