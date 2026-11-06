import { resetWithPhonePasscode } from '../reset';
import { clearRunningChecks, registerRunningCheck, whatIsRunning } from '../running';

function deps(overrides: Partial<Parameters<typeof resetWithPhonePasscode>[0]> = {}) {
  return {
    running: whatIsRunning,
    hasScreenLock: jest.fn(async () => true),
    authenticate: jest.fn(async () => ({ success: true })),
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
      authenticate: jest.fn(async () => {
        on = true;
        return { success: true };
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

  it('needs a phone with a screen lock, and a passed prompt', async () => {
    expect(await resetWithPhonePasscode(deps({ hasScreenLock: async () => false }))).toBe('no-passcode');
    expect(await resetWithPhonePasscode(deps({ authenticate: async () => ({ success: false }) }))).toBe('cancelled');
    expect(await resetWithPhonePasscode(deps({ authenticate: async () => ({ success: false, noPasscode: true }) }))).toBe('no-passcode');
  });
});
