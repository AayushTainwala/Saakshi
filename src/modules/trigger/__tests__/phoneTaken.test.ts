import { IDLE, type PhoneTakenDeps, PhoneTakenController } from '../phoneTaken';

/** A gate the test opens when it likes: the live link can be fast or slow. */
function gate<T>() {
  let open!: (value: T) => void;
  let fail!: (error: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    open = resolve;
    fail = reject;
  });
  return { promise, open, fail };
}

function setup(overrides: Partial<PhoneTakenDeps> = {}) {
  let text: string | null = null;
  const order: string[] = [];
  const deps: PhoneTakenDeps = {
    storage: { read: () => text, write: (value) => void (text = value) },
    codeIsSet: jest.fn(async () => true),
    requireCode: jest.fn(async () => true),
    startPocket: jest.fn(async () => void order.push('pocket')),
    stopPocket: jest.fn(async () => void order.push('stop pocket')),
    startLive: jest.fn(async () => {
      order.push('live');
      return { link: 'https://live/#tok', invite: 'Follow my live location: https://live/#tok' };
    }),
    stopLive: jest.fn(async () => void order.push('stop live')),
    alert: jest.fn(async (link?: string) => void order.push(`alert ${link ?? 'without link'}`)),
    textLink: jest.fn(async (_invite: string, to: 'all' | 'not-alerted') => void order.push(`link to ${to}`)),
    heartbeat: { start: jest.fn(), stop: jest.fn() },
    now: () => new Date('2026-11-06T10:40:00Z'),
    liveWaitMs: 50,
    ...overrides,
  };
  return { taken: new PhoneTakenController(deps), deps, order, saved: () => (text ? JSON.parse(text) : null), reopen: () => new PhoneTakenController(deps) };
}

describe('"My phone is being taken" (round 2, group 1.3)', () => {
  it('starts the alert with the live link, live location, Pocket recording and the heartbeat', async () => {
    const { taken, deps, order, saved } = setup();
    expect(await taken.start()).toBe('started');
    expect(deps.heartbeat.start).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['pocket', 'live', 'alert https://live/#tok', 'link to not-alerted']);
    expect(taken.getState()).toMatchObject({ active: true, startedAt: '2026-11-06T10:40:00.000Z', alert: 'sent', live: 'on', pocket: 'on', errors: [] });
    expect(saved()).toMatchObject({ version: 1, active: true });
    expect(taken.isRunning()).toBe(true);
  });

  it('cannot start until a secret code is set', async () => {
    const { taken, deps } = setup({ codeIsSet: jest.fn(async () => false) });
    expect(await taken.start()).toBe('no-code');
    expect(deps.startPocket).not.toHaveBeenCalled();
    expect(deps.startLive).not.toHaveBeenCalled();
    expect(deps.alert).not.toHaveBeenCalled();
    expect(taken.getState()).toEqual(IDLE);
  });

  it('sends the alert without waiting long for a slow link, and texts the link when it comes', async () => {
    const slow = gate<{ link: string; invite: string }>();
    const { taken, order } = setup({ startLive: jest.fn(() => slow.promise) });
    const starting = taken.start();
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(order).toEqual(['pocket', 'alert without link']);
    slow.open({ link: 'https://live/#late', invite: 'late invite' });
    await starting;
    expect(order).toEqual(['pocket', 'alert without link', 'link to all']);
  });

  it('starts each part even if another fails', async () => {
    const { taken, deps, order } = setup({
      startPocket: jest.fn(async () => {
        throw new Error('microphone denied');
      }),
      startLive: jest.fn(async () => {
        throw new Error('no signal');
      }),
    });
    await taken.start();
    expect(deps.alert).toHaveBeenCalledWith(undefined);
    expect(order).toEqual(['alert without link']);
    expect(taken.getState()).toMatchObject({
      active: true,
      alert: 'sent',
      live: 'failed',
      pocket: 'failed',
      errors: expect.arrayContaining([
        { part: 'pocket', message: 'microphone denied' },
        { part: 'live', message: 'no signal' },
      ]),
    });
  });

  it('keeps recording and sharing when the alert fails', async () => {
    const { taken } = setup({
      alert: jest.fn(async () => {
        throw new Error('no SMS');
      }),
    });
    await taken.start();
    expect(taken.getState()).toMatchObject({ alert: 'failed', live: 'on', pocket: 'on' });
  });

  it('stops only with the secret code', async () => {
    let right = false;
    const { taken, deps, order } = setup({ requireCode: jest.fn(async () => right) });
    await taken.start();
    order.length = 0;

    expect(await taken.stop()).toBe(false);
    expect(order).toEqual([]);
    expect(deps.heartbeat.stop).not.toHaveBeenCalled();
    expect(taken.getState().active).toBe(true);

    right = true;
    expect(await taken.stop()).toBe(true);
    expect(order.sort()).toEqual(['stop live', 'stop pocket']);
    expect(deps.heartbeat.stop).toHaveBeenCalledTimes(1);
    expect(taken.getState()).toEqual(IDLE);
    expect(taken.isRunning()).toBe(false);
  });

  it('stops the rest if one part fails to stop', async () => {
    const { taken, deps } = setup({
      stopPocket: jest.fn(async () => {
        throw new Error('already stopped');
      }),
    });
    await taken.start();
    expect(await taken.stop()).toBe(true);
    expect(deps.stopLive).toHaveBeenCalled();
    expect(taken.getState().active).toBe(false);
  });

  it('is still on after the app restarts, and its heartbeat resumes', async () => {
    const { taken, deps, reopen } = setup();
    await taken.start();
    const after = reopen();
    expect(after.getState()).toMatchObject({ active: true, live: 'on', pocket: 'on', alert: 'sent' });
    after.resume();
    expect(deps.heartbeat.start).toHaveBeenCalledTimes(2);
    // Nothing is still "starting" after a restart.
    const cut = setup();
    cut.deps.storage.write(JSON.stringify({ version: 1, ...IDLE, active: true, live: 'starting', pocket: 'starting', alert: 'sending' }));
    expect(cut.reopen().getState()).toMatchObject({ live: 'off', pocket: 'off', alert: null });
  });

  it('does not start twice, and restarts a part that failed', async () => {
    let fail = true;
    const { taken, deps } = setup({
      startPocket: jest.fn(async () => {
        if (fail) throw new Error('busy');
      }),
    });
    await taken.start();
    expect(await taken.start()).toBe('already');
    expect(taken.getState().pocket).toBe('failed');
    fail = false;
    await taken.retry('pocket');
    expect(deps.startPocket).toHaveBeenCalledTimes(2);
    expect(taken.getState().pocket).toBe('on');
  });
});
