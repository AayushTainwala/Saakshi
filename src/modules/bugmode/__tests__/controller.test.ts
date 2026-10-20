import type { CaptureSession, EvidenceItem } from '@/modules/evidence';

import { type BugDeps, BugModeController } from '../controller';
import { WitnessThrottle } from '../witness';

/** Just enough of a CaptureSession: items that change, and listeners. */
function fakeSession() {
  const listeners = new Set<() => void>();
  let items: EvidenceItem[] = [];
  const session = {
    id: 'session-1',
    get items() {
      return items;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  } as unknown as CaptureSession;
  const piece = (sequence: number, status: EvidenceItem['status']): EvidenceItem => ({
    sequence,
    kind: 'audio',
    segment: { clip: 0, index: sequence },
    media: `${sequence}.aac`,
    mediaType: 'audio/aac',
    startedAt: '2026-10-20T09:00:00.000Z',
    endedAt: '2026-10-20T09:02:00.000Z',
    status,
    recordSha256: status === 'sealed' ? `hash-${sequence}` : undefined,
  });
  return {
    session,
    seal(sequence: number, status: EvidenceItem['status'] = 'sealed') {
      items = [...items.filter((i) => i.sequence !== sequence), piece(sequence, status)];
      for (const listener of listeners) listener();
    },
  };
}

function setup(options: { contacts?: number } = {}) {
  const fake = fakeSession();
  let clock = Date.parse('2026-10-20T09:00:00Z');
  const stopEngine = jest.fn(async () => undefined);
  const uploads: number[] = [];
  const deps: BugDeps = {
    startEngine: jest.fn(async () => ({ session: fake.session, stop: stopEngine })),
    witnessCost: jest.fn(async () => options.contacts ?? 2),
    witness: jest.fn(async () => options.contacts ?? 2),
    witnessText: (item, pieces) => `piece ${pieces}: ${item.recordSha256}`,
    liveActivity: { start: jest.fn(async () => undefined), update: jest.fn(async () => undefined), end: jest.fn(async () => undefined) },
    uploader: () => async ({ item }) => void uploads.push(item.sequence),
    now: () => new Date(clock),
  };
  const advance = (minutes: number) => void (clock += minutes * 60_000);
  return { bug: new BugModeController(deps), deps, fake, stopEngine, uploads, advance };
}

describe('BugModeController', () => {
  it('witnesses, uploads and counts each piece as it is sealed', async () => {
    const { bug, deps, fake, uploads, advance } = setup();
    await bug.start();
    expect(bug.getState()).toMatchObject({ running: true, sessionId: 'session-1', sealed: 0 });
    expect(deps.liveActivity.start).toHaveBeenCalled();

    fake.seal(0, 'hashed');
    fake.seal(0);
    await bug.settled();
    advance(10);
    fake.seal(1);
    await bug.settled();

    expect(bug.getState()).toMatchObject({ sealed: 2, witnessed: 2 });
    expect(deps.witness).toHaveBeenNthCalledWith(1, 'piece 1: hash-0');
    expect(deps.witness).toHaveBeenNthCalledWith(2, 'piece 2: hash-1');
    expect(deps.liveActivity.update).toHaveBeenLastCalledWith(2);
    expect(uploads).toEqual([0, 1]);
  });

  it('counts pieces that failed to seal, without witnessing them', async () => {
    const { bug, deps, fake } = setup();
    await bug.start();
    fake.seal(0, 'failed');
    await bug.settled();
    expect(bug.getState()).toMatchObject({ sealed: 0, failed: 1 });
    expect(deps.witness).not.toHaveBeenCalled();
  });

  it('texts a witness at most once every 10 minutes', async () => {
    const { bug, deps, fake, advance } = setup();
    await bug.start();
    // Five 2-minute pieces: only the first is texted; the next chain head will cover them all.
    for (let i = 0; i < 5; i++) {
      fake.seal(i);
      await bug.settled();
      advance(2);
    }
    expect(deps.witness).toHaveBeenCalledTimes(1);
    fake.seal(5);
    await bug.settled();
    expect(deps.witness).toHaveBeenCalledTimes(2);
    expect(deps.witness).toHaveBeenLastCalledWith('piece 6: hash-5');
    expect(bug.getState().sealed).toBe(6);
  });

  it('also keeps to 20 texts in 30 minutes', async () => {
    const { bug, deps, fake, advance } = setup({ contacts: 10 });
    await bug.start();
    for (let i = 0; i < 3; i++) {
      fake.seal(i);
      await bug.settled();
      advance(10);
    }
    // 10 contacts: two messages fit in 20 texts per 30 minutes.
    expect(deps.witness).toHaveBeenCalledTimes(2);
  });

  it('does not witness where the phone cannot text with no tap', async () => {
    const { bug, deps, fake } = setup({ contacts: 0 });
    await bug.start();
    fake.seal(0);
    await bug.settled();
    expect(deps.witness).not.toHaveBeenCalled();
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
    expect(throttle.allow(2, 0)).toBe(true);
    expect(throttle.allow(2, 9 * minute)).toBe(false);
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
