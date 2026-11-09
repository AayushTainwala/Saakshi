import type { ScreenLockResult } from '@native/saakshi-device';

import { memoryCodeStore } from './memory';
import { resetMethodFor, resetWithPhonePasscode, resetWithRecoveryCode } from '../reset';
import { clearRunningChecks, registerRunningCheck, whatIsRunning } from '../running';

function deps(overrides: Partial<Parameters<typeof resetWithPhonePasscode>[0]> = {}) {
  return {
    running: whatIsRunning,
    hasScreenLock: jest.fn(async () => true),
    authenticate: jest.fn(async (): Promise<ScreenLockResult> => 'passed'),
    clear: jest.fn(async () => undefined),
    ...overrides,
  };
}

describe('resetting a forgotten code with the phone passcode', () => {
  afterEach(() => clearRunningChecks());

  it('resets after the phone prompt while nothing runs', async () => {
    registerRunningCheck('body-cam', () => false);
    registerRunningCheck('live-location', () => false);
    const d = deps();
    expect(await resetWithPhonePasscode(d)).toBe('reset');
    expect(d.authenticate).toHaveBeenCalledTimes(1);
    expect(d.clear).toHaveBeenCalledTimes(1);
  });

  for (const what of ['body-cam', 'pocket-recording', 'live-location', 'phone-taken'] as const) {
    it(`offers no reset while ${what} runs, and never shows the prompt`, async () => {
      registerRunningCheck(what, () => true);
      const d = deps();
      expect(await resetWithPhonePasscode(d)).toBe('running');
      expect(d.authenticate).not.toHaveBeenCalled();
      expect(d.clear).not.toHaveBeenCalled();
    });
  }

  it('does not reset if something started while the prompt was up', async () => {
    let on = false;
    registerRunningCheck('pocket-recording', () => on);
    const d = deps({
      authenticate: jest.fn(async (): Promise<ScreenLockResult> => {
        on = true;
        return 'passed';
      }),
    });
    expect(await resetWithPhonePasscode(d)).toBe('running');
    expect(d.clear).not.toHaveBeenCalled();
  });

  it('treats a check that fails as running', async () => {
    registerRunningCheck('body-cam', () => {
      throw new Error('broken');
    });
    expect(whatIsRunning()).toEqual(['body-cam']);
    expect(await resetWithPhonePasscode(deps())).toBe('running');
  });

  it('resets only when the passcode prompt passed', async () => {
    expect(await resetWithPhonePasscode(deps({ hasScreenLock: async () => false }))).toBe('no-passcode');
    const outcomes: [ScreenLockResult, string][] = [
      ['cancelled', 'cancelled'],
      ['failed', 'failed'],
      ['no-lock', 'no-passcode'],
      ['unavailable', 'unavailable'],
    ];
    for (const [prompt, outcome] of outcomes) {
      const d = deps({ authenticate: async () => prompt });
      expect(await resetWithPhonePasscode(d)).toBe(outcome);
      expect(d.clear).not.toHaveBeenCalled();
    }
  });
});

describe('which reset a phone has (round 2, group 1.6)', () => {
  it('the passcode alone where the phone can ask for it (iPhone, Android 11 and later)', () => {
    expect(resetMethodFor({ hasScreenLock: true, canAskPasscodeOnly: true })).toBe('passcode');
  });

  it('a recovery code on a phone with no screen lock', () => {
    expect(resetMethodFor({ hasScreenLock: false, canAskPasscodeOnly: true })).toBe('recovery');
    expect(resetMethodFor({ hasScreenLock: false, canAskPasscodeOnly: false })).toBe('recovery');
  });

  it('none on Android 7 to 10 with a screen lock, never a prompt that takes a fingerprint or face', () => {
    expect(resetMethodFor({ hasScreenLock: true, canAskPasscodeOnly: false })).toBe('none');
    expect(resetMethodFor(null)).toBe('none');
  });
});

describe('resetting a forgotten code with the recovery code (round 2, group 1.6)', () => {
  afterEach(() => clearRunningChecks());

  async function withRecovery() {
    const memory = memoryCodeStore();
    const set = await memory.store.setCode('2580', { recovery: true });
    if (!set.ok || !set.recoveryCode) throw new Error('no recovery code');
    const reset = (input: string) =>
      resetWithRecoveryCode(input, { running: whatIsRunning, verify: (text) => memory.store.verifyRecovery(text), clear: () => memory.store.clear() });
    return { memory, code: set.recoveryCode, reset };
  }

  it('resets the code and spends the recovery code, while nothing runs', async () => {
    const { memory, code, reset } = await withRecovery();
    expect(await reset(code.toLowerCase())).toEqual({ outcome: 'reset' });
    expect(await memory.store.isSet()).toBe(false);
    expect(memory.store.getState().recovery).toBe(false);
  });

  for (const what of ['body-cam', 'pocket-recording', 'live-location', 'phone-taken'] as const) {
    it(`offers no reset while ${what} runs, and does not even check the code`, async () => {
      const { memory, code, reset } = await withRecovery();
      registerRunningCheck(what, () => true);
      memory.slowHash.mockClear();
      expect(await reset(code)).toEqual({ outcome: 'running' });
      expect(memory.slowHash).not.toHaveBeenCalled();
      expect(await memory.store.isSet()).toBe(true);
    });
  }

  it('does not reset if something started while the recovery code was being checked', async () => {
    const { memory, code } = await withRecovery();
    let on = false;
    registerRunningCheck('live-location', () => on);
    const result = await resetWithRecoveryCode(code, {
      running: whatIsRunning,
      verify: async (text) => {
        const checked = await memory.store.verifyRecovery(text);
        on = true;
        return checked;
      },
      clear: () => memory.store.clear(),
    });
    expect(result).toEqual({ outcome: 'running' });
    expect(await memory.store.isSet()).toBe(true);
  });

  it('refuses a wrong recovery code, and counts it towards the same waits as the code', async () => {
    const { memory, reset } = await withRecovery();
    const wrong = 'ABCD-EFGH-JKMN';
    expect(await reset(wrong)).toEqual({ outcome: 'refused', result: { ok: false, reason: 'wrong', wrongTries: 1, waitUntil: null } });
    expect(await memory.store.verify('1357')).toEqual({ ok: false, reason: 'wrong', wrongTries: 2, waitUntil: null });
    const third = await reset(wrong);
    expect(third).toEqual({ outcome: 'refused', result: { ok: false, reason: 'wrong', wrongTries: 3, waitUntil: memory.now() + 30_000 } });
    // During the wait, neither the code nor the recovery code is taken.
    expect((await reset(wrong)).outcome).toBe('refused');
    expect(await memory.store.verify('2580')).toEqual({ ok: false, reason: 'wait', waitUntil: memory.now() + 30_000 });
  });
});
