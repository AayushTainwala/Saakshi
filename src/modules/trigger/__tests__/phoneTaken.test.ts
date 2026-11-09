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
    // iPhone, or Android with the device admin off: the screen can't be locked by Saakshi.
    lockScreen: jest.fn(async () => false),
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

describe('"My phone is being taken" locks the screen, or asks for it (round 2, group 1.7)', () => {
  /** Android with the device admin switched on: the lock succeeds. */
  const lockOn = (order: string[]) =>
    jest.fn(async () => {
      order.push('lock');
      return true;
    });

  it('locks the screen once, after every part has started', async () => {
    const order: string[] = [];
    const lockScreen = lockOn(order);
    const { taken } = setup({
      startPocket: jest.fn(async () => void order.push('pocket')),
      startLive: jest.fn(async () => {
        order.push('live');
        return { link: 'https://live/#tok', invite: 'invite' };
      }),
      alert: jest.fn(async () => void order.push('alert')),
      textLink: jest.fn(async () => void order.push('link')),
      lockScreen,
    });
    await taken.start();
    expect(lockScreen).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['pocket', 'live', 'alert', 'link', 'lock']);
    // Locked by Saakshi: no reminder.
    expect(taken.getState().lockReminder).toBe(false);
  });

  it('waits for a slow recording, a slow link and the alert before it locks', async () => {
    const order: string[] = [];
    const pocket = gate<void>();
    const link = gate<{ link: string; invite: string }>();
    const lockScreen = lockOn(order);
    const { taken } = setup({
      startPocket: jest.fn(() => pocket.promise.then(() => void order.push('pocket'))),
      startLive: jest.fn(() => link.promise.then((value) => (order.push('live'), value))),
      alert: jest.fn(async () => void order.push('alert')),
      textLink: jest.fn(async () => void order.push('link')),
      lockScreen,
    });
    const starting = taken.start();
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(order).toEqual(['alert']);
    expect(lockScreen).not.toHaveBeenCalled();
    link.open({ link: 'https://live/#late', invite: 'late' });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(lockScreen).not.toHaveBeenCalled();
    pocket.open();
    await starting;
    expect(order).toEqual(['alert', 'live', 'link', 'pocket', 'lock']);
    expect(lockScreen).toHaveBeenCalledTimes(1);
  });

  it('still locks when a part failed, once the others have started', async () => {
    const order: string[] = [];
    const lockScreen = lockOn(order);
    const { taken } = setup({
      startPocket: jest.fn(async () => {
        throw new Error('microphone denied');
      }),
      lockScreen,
    });
    await taken.start();
    expect(lockScreen).toHaveBeenCalledTimes(1);
    expect(taken.getState()).toMatchObject({ pocket: 'failed', lockReminder: false });
  });

  it('never locks when it does not start', async () => {
    const lockScreen = jest.fn(async () => true);
    const noCode = setup({ codeIsSet: jest.fn(async () => false), lockScreen });
    expect(await noCode.taken.start()).toBe('no-code');
    expect(lockScreen).not.toHaveBeenCalled();

    const twice = setup({ lockScreen });
    await twice.taken.start();
    expect(await twice.taken.start()).toBe('already');
    await twice.taken.retry('live');
    await twice.taken.retry('pocket');
    expect(lockScreen).toHaveBeenCalledTimes(1);
  });

  it('asks the user to lock the phone where Saakshi can\'t (iPhone; Android without the admin)', async () => {
    const { taken, deps } = setup();
    await taken.start();
    expect(deps.lockScreen).toHaveBeenCalledTimes(1);
    expect(taken.getState().lockReminder).toBe(true);
  });

  it('asks, too, if locking fails', async () => {
    const { taken } = setup({
      lockScreen: jest.fn(async () => {
        throw new Error('admin switched off');
      }),
    });
    await taken.start();
    expect(taken.getState().lockReminder).toBe(true);
  });

  it('shows no reminder until everything has started', async () => {
    const pocket = gate<void>();
    const { taken } = setup({ startPocket: jest.fn(() => pocket.promise) });
    const starting = taken.start();
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(taken.getState()).toMatchObject({ alert: 'sent', live: 'on', pocket: 'starting', lockReminder: false });
    pocket.open();
    await starting;
    expect(taken.getState().lockReminder).toBe(true);
  });

  it('keeps the reminder until the app goes to the background, and not across a restart', async () => {
    const { taken, reopen } = setup();
    await taken.start();
    expect(taken.getState().lockReminder).toBe(true);
    expect(reopen().getState()).toMatchObject({ active: true, lockReminder: false });
    taken.appInBackground();
    expect(taken.getState()).toMatchObject({ active: true, lockReminder: false });
  });

  it('does not keep the phone unlocked while location hangs: locks after the wait, and location carries on', async () => {
    const order: string[] = [];
    const lockScreen = lockOn(order);
    const stalled = gate<{ link: string; invite: string }>();
    const { taken } = setup({
      startLive: jest.fn(() => stalled.promise),
      alert: jest.fn(async () => void order.push('alert')),
      textLink: jest.fn(async () => void order.push('link')),
      lockScreen,
      lockWaitMs: 50,
    });
    const starting = taken.start();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(order).toEqual(['alert', 'lock']);
    expect(taken.getState().live).toBe('starting');
    stalled.open({ link: 'https://live/#late', invite: 'late' });
    expect(await starting).toBe('started');
    expect(order).toEqual(['alert', 'lock', 'link']);
    expect(taken.getState().live).toBe('on');
    expect(lockScreen).toHaveBeenCalledTimes(1);
  });

  it('carries on recording and sharing once the screen is locked: nothing is stopped', async () => {
    const order: string[] = [];
    const { taken, deps } = setup({ lockScreen: lockOn(order) });
    await taken.start();
    // The screen locks: the app goes to the background.
    taken.appInBackground();
    expect(order).toEqual(['lock']);
    expect(deps.stopPocket).not.toHaveBeenCalled();
    expect(deps.stopLive).not.toHaveBeenCalled();
    expect(deps.heartbeat.stop).not.toHaveBeenCalled();
    expect(taken.getState()).toMatchObject({ active: true, pocket: 'on', live: 'on', alert: 'sent' });
  });

  it('clears the reminder when it is stopped with the code', async () => {
    const { taken } = setup();
    await taken.start();
    expect(await taken.stop()).toBe(true);
    expect(taken.getState()).toEqual(IDLE);
  });
});
