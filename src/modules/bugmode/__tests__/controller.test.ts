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
  const stopEngine = jest.fn(async () => undefined);
  const uploads: number[] = [];
  const deps: BugDeps = {
    startEngine: jest.fn(async () => ({ session: fake.session, stop: stopEngine })),
    witnessCost: jest.fn(async () => options.contacts ?? 2),
    witness: jest.fn(async () => options.contacts ?? 2),
    witnessText: (item, pieces) => `piece ${pieces}: ${item.recordSha256}`,
    liveActivity: { start: jest.fn(async () => undefined), update: jest.fn(async () => undefined), end: jest.fn(async () => undefined) },
    uploader: () => async ({ item }) => void uploads.push(item.sequence),
    now: () => new Date('2026-10-20T09:00:00Z'),
  };
  return { bug: new BugModeController(deps), deps, fake, stopEngine, uploads };
}

describe('BugModeController', () => {
  it('witnesses, uploads and counts each piece as it is sealed', async () => {
    const { bug, deps, fake, uploads } = setup();
    await bug.start();
    expect(bug.getState()).toMatchObject({ running: true, sessionId: 'session-1', sealed: 0 });
    expect(deps.liveActivity.start).toHaveBeenCalled();

    fake.seal(0, 'hashed');
    fake.seal(0);
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

  it('skips witness texts once the budget is spent', async () => {
    const { bug, deps, fake } = setup({ contacts: 10 });
    await bug.start();
    for (let i = 0; i < 4; i++) fake.seal(i);
    await bug.settled();
    // 10 contacts: two pieces fit in 20 texts per 30 minutes.
    expect(deps.witness).toHaveBeenCalledTimes(2);
    expect(bug.getState().sealed).toBe(4);
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
  it('allows 20 texts in any 30 minutes', () => {
    const throttle = new WitnessThrottle();
    const minute = 60_000;
    expect(throttle.allow(10, 0)).toBe(true);
    expect(throttle.allow(10, 5 * minute)).toBe(true);
    expect(throttle.allow(1, 10 * minute)).toBe(false);
    expect(throttle.allow(10, 30 * minute)).toBe(true);
    expect(throttle.allow(0, 31 * minute)).toBe(false);
  });
});
