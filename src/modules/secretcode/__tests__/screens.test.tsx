import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import i18n, { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import type { memoryCodeStore } from './memory';
import type { ResetMethod } from '../reset';
import { requireSecretCode } from '../request';
import { clearRunningChecks, registerRunningCheck } from '../running';
import { RecoveryCodeReminder, resetRecoveryReminder } from '../ui/RecoveryCodeReminder';
import { SecretCodeRoute, SecretCodeScreen } from '../ui/SecretCodeScreen';
import { SecretCodeSettings } from '../ui/SecretCodeSettings';

// The stored code lives in memory instead of the phone's secure storage, and the phone's screen
// lock is whatever the test says (`method`).
jest.mock('../instance', () => {
  const { memoryCodeStore } = jest.requireActual('./memory');
  const { useEffect, useSyncExternalStore } = jest.requireActual('react');
  const { resetWithRecoveryCode } = jest.requireActual('../reset');
  const { whatIsRunning } = jest.requireActual('../running');
  const holder = { current: memoryCodeStore() };
  const method = { current: 'passcode' };
  return {
    holder,
    method,
    get secretCode() {
      return holder.current.store;
    },
    isSecretCodeSet: () => holder.current.store.isSet(),
    useSecretCode: () => {
      const store = holder.current.store;
      useEffect(() => {
        store.load();
      }, [store]);
      return useSyncExternalStore(store.subscribe, store.getState);
    },
    useResetMethod: () => method.current,
    currentResetMethod: () => method.current,
    resetWithPhonePasscode: jest.fn(async () => 'reset'),
    resetWithRecoveryCode: (input: string) =>
      resetWithRecoveryCode(input, {
        running: whatIsRunning,
        verify: (text: string) => holder.current.store.verifyRecovery(text),
        clear: () => holder.current.store.clear(),
      }),
  };
});

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});

const instance = jest.requireMock('../instance') as {
  holder: { current: ReturnType<typeof memoryCodeStore> };
  method: { current: ResetMethod };
  resetWithPhonePasscode: jest.Mock;
};
const holder = instance.holder;
const store = () => holder.current.store;

async function type(digits: string) {
  for (const digit of digits) await fireEvent.press(screen.getByRole('button', { name: digit }));
}

function wrap(children: React.ReactNode, language: 'en' | 'hi' = 'en') {
  return <PreferencesProvider initial={{ language, theme: 'light' }}>{children}</PreferencesProvider>;
}

describe('the secret code screens', () => {
  beforeAll(() => {
    initI18n('en');
  });

  beforeEach(() => {
    const { memoryCodeStore } = jest.requireActual('./memory');
    holder.current = memoryCodeStore();
    instance.method.current = 'passcode';
    instance.resetWithPhonePasscode.mockClear();
    mockPush.mockClear();
    clearRunningChecks();
    resetRecoveryReminder();
  });

  it('shows in Settings what is stored, at once after Set and after Remove', async () => {
    const done = jest.fn();
    await render(
      wrap(
        <>
          <SecretCodeSettings />
          <SecretCodeScreen mode="set" onDone={done} />
        </>,
      ),
    );
    expect(await screen.findByText('No secret code is set yet.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Set a secret code' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/secret-code', params: { mode: 'set', request: expect.any(String) } });

    await type('2580');
    expect(await screen.findByText('Enter the same four digits again')).toBeTruthy();
    await type('2580');
    await waitFor(() => expect(done).toHaveBeenCalledWith(true));
    expect(screen.getByText('A secret code is set.')).toBeTruthy();
    expect(screen.queryByText('No secret code is set yet.')).toBeNull();
  });

  it('removes the code with the current one, and Settings says so at once', async () => {
    await store().setCode('2580');
    const done = jest.fn();
    await render(
      wrap(
        <>
          <SecretCodeSettings />
          <SecretCodeScreen mode="remove" onDone={done} />
        </>,
      ),
    );
    expect(await screen.findByText('A secret code is set.')).toBeTruthy();
    await type('1357');
    expect(await screen.findByText("That's not the code.")).toBeTruthy();
    expect(screen.getByText('A secret code is set.')).toBeTruthy();

    await type('2580');
    await waitFor(() => expect(done).toHaveBeenCalledWith(true));
    expect(screen.getByText('No secret code is set yet.')).toBeTruthy();
    expect(screen.queryByText('A secret code is set.')).toBeNull();
  });

  it('changes the code: the current one, then the new one twice', async () => {
    await store().setCode('2580');
    const done = jest.fn();
    await render(wrap(<SecretCodeScreen mode="change" onDone={done} />));
    expect(await screen.findByText('Enter your secret code')).toBeTruthy();
    await type('2580');
    expect(await screen.findByText('Choose four digits')).toBeTruthy();
    await type('4096');
    await type('4096');
    await waitFor(() => expect(done).toHaveBeenCalledWith(true));
    expect(await store().verify('4096')).toEqual({ ok: true });
  });

  it('refuses a guessable code with a plain reason, and two codes that differ', async () => {
    const done = jest.fn();
    await render(wrap(<SecretCodeScreen mode="set" onDone={done} />));
    await screen.findByText('Choose four digits');
    await type('1111');
    expect(await screen.findByText("Choose a code that isn't one digit four times, like 1111.")).toBeTruthy();
    await type('6789');
    expect(await screen.findByText("Choose a code that isn't a straight run, like 1234 or 4321.")).toBeTruthy();
    await type('2580');
    await type('2581');
    expect(await screen.findByText("The two codes weren't the same. Choose the code again.")).toBeTruthy();
    expect(done).not.toHaveBeenCalled();
    expect(await store().isSet()).toBe(false);
  });

  it('says how long to wait, in plain words, and turns the keys off meanwhile', async () => {
    await store().setCode('2580');
    await render(wrap(<SecretCodeScreen mode="confirm" reason="body-cam" onDone={jest.fn()} />));
    expect(await screen.findByText('Enter your secret code to stop body-cam')).toBeTruthy();
    await type('0001');
    await type('0001');
    await type('0001');
    expect(await screen.findByText('Too many wrong tries. Try again in 30 seconds.')).toBeTruthy();
    expect(screen.getByRole('button', { name: '2' }).props.accessibilityState.disabled).toBe(true);
  });

  it('asks for a code to be set first when a Stop comes and none is set', async () => {
    const done = jest.fn();
    await render(wrap(<SecretCodeScreen mode="confirm" reason="pocket-recording" onDone={done} />));
    expect(await screen.findByText('Set a secret code first')).toBeTruthy();
    await type('2580');
    await type('2580');
    await waitFor(() => expect(done).toHaveBeenCalledWith(true));
    expect(await store().isSet()).toBe(true);
  });

  it('offers the reset with the phone passcode only while nothing runs', async () => {
    await store().setCode('2580');
    let running = false;
    registerRunningCheck('live-location', () => running);
    const first = await render(wrap(<SecretCodeScreen mode="change" onDone={jest.fn()} />));
    expect(await screen.findByRole('button', { name: 'Forgot the code?' })).toBeTruthy();
    await first.unmount();

    running = true;
    await render(wrap(<SecretCodeScreen mode="confirm" reason="live-location" onDone={jest.fn()} />));
    await screen.findByText('Enter your secret code to stop sharing your location');
    expect(screen.queryByRole('button', { name: 'Forgot the code?' })).toBeNull();
  });

  it('after a reset, asks for a new code', async () => {
    await store().setCode('2580');
    await render(wrap(<SecretCodeScreen mode="change" onDone={jest.fn()} />));
    await fireEvent.press(await screen.findByRole('button', { name: 'Forgot the code?' }));
    expect(await screen.findByText('The code was reset. Choose a new one.')).toBeTruthy();
    expect(screen.getByText('Choose four digits')).toBeTruthy();
  });

  it('answers requireSecretCode: true for the right code, false for backing out', async () => {
    await store().setCode('2580');
    const answer = requireSecretCode({ reason: 'phone-taken' });
    const request = (mockPush.mock.calls.at(-1)?.[0] as { params: { request: string; reason: string } }).params;
    expect(request.reason).toBe('phone-taken');
    const close = jest.fn();
    await render(wrap(<SecretCodeRoute mode="confirm" reason="phone-taken" request={request.request} close={close} />));
    await screen.findByText('Enter your secret code to stop "My phone is being taken"');
    await type('2580');
    await expect(answer).resolves.toBe(true);
    expect(close).toHaveBeenCalled();

    const backedOut = requireSecretCode({ reason: 'body-cam' });
    const second = (mockPush.mock.calls.at(-1)?.[0] as { params: { request: string } }).params.request;
    const view = await render(wrap(<SecretCodeRoute mode="confirm" reason="body-cam" request={second} close={jest.fn()} />));
    await screen.findByText('Enter your secret code to stop body-cam');
    await act(async () => view.unmount());
    await expect(backedOut).resolves.toBe(false);
  });

  it('says a forgotten code is reset with the passcode only, never a face or fingerprint (round 2, group 1.6)', async () => {
    await store().setCode('2580');
    await render(wrap(<SecretCodeScreen mode="change" onDone={jest.fn()} />));
    await screen.findByRole('button', { name: 'Forgot the code?' });
    expect(
      screen.getByText("A forgotten code can be reset with this phone's own passcode (not a face or fingerprint), but only while nothing is running in Saakshi."),
    ).toBeTruthy();
    expect(screen.queryByText(/face or fingerprint unlock, if that is set up/)).toBeNull();
  });

  it('on Android 7 to 10, says the code can not be reset rather than use a prompt that takes a fingerprint', async () => {
    instance.method.current = 'none';
    await store().setCode('2580');
    await render(wrap(<SecretCodeScreen mode="change" onDone={jest.fn()} />));
    await fireEvent.press(await screen.findByRole('button', { name: 'Forgot the code?' }));
    expect(await screen.findByText(/On this version of Android, Saakshi can't ask for the screen lock alone/)).toBeTruthy();
    expect(instance.resetWithPhonePasscode).not.toHaveBeenCalled();
    expect(await store().isSet()).toBe(true);
  });

  describe('a phone with no screen lock: the recovery code', () => {
    beforeEach(() => {
      instance.method.current = 'recovery';
    });

    /** The code on the screen, as shown: "7KQM-4WXH-9RTD". */
    const shownCode = () => screen.getByText(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/).props.children as string;

    it('is shown once after the code is set, then the screen is done', async () => {
      const done = jest.fn();
      await render(wrap(<SecretCodeScreen mode="set" onDone={done} />));
      expect(await screen.findByText(/Saakshi will also give you a recovery code to write down/)).toBeTruthy();
      await type('2580');
      await type('2580');
      expect(await screen.findByText('Your recovery code')).toBeTruthy();
      const code = shownCode();
      expect(screen.getByText(/Write it down on paper and keep it somewhere safe, away from this phone/)).toBeTruthy();
      expect(done).not.toHaveBeenCalled();
      await fireEvent.press(screen.getByRole('button', { name: 'I have written it down' }));
      expect(done).toHaveBeenCalledWith(true);
      expect(await store().verifyRecovery(code)).toEqual({ ok: true });
    });

    it('is not shown when the code is set to start "My phone is being taken"', async () => {
      const done = jest.fn();
      await render(wrap(<SecretCodeScreen mode="set" reason="phone-taken" onDone={done} />));
      await type('2580');
      await type('2580');
      await waitFor(() => expect(done).toHaveBeenCalledWith(true));
      expect(screen.queryByText('Your recovery code')).toBeNull();
      expect(store().getState()).toMatchObject({ set: true, recovery: false });
    });

    it('resets a forgotten code, and setting a new one gives a new recovery code', async () => {
      const set = (await store().setCode('2580', { recovery: true })) as { recoveryCode: string };
      await render(wrap(<SecretCodeScreen mode="change" onDone={jest.fn()} />));
      expect(await screen.findByText(/a forgotten code can be reset with the recovery code you wrote down/)).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: 'Forgot the code?' }));
      expect(await screen.findByText('Reset with your recovery code')).toBeTruthy();

      await fireEvent.changeText(screen.getByLabelText('Recovery code'), 'ABCD-EFGH-JKMN');
      await fireEvent.press(screen.getByRole('button', { name: 'Reset the secret code' }));
      expect(await screen.findByText("That's not the recovery code.")).toBeTruthy();
      await fireEvent.changeText(screen.getByLabelText('Recovery code'), 'ABC');
      await fireEvent.press(screen.getByRole('button', { name: 'Reset the secret code' }));
      expect(await screen.findByText(/A recovery code is 12 letters and numbers/)).toBeTruthy();

      await fireEvent.changeText(screen.getByLabelText('Recovery code'), set.recoveryCode.toLowerCase());
      await fireEvent.press(screen.getByRole('button', { name: 'Reset the secret code' }));
      expect(await screen.findByText('The code was reset. Choose a new one.')).toBeTruthy();
      expect(await store().isSet()).toBe(false);

      await type('4096');
      await type('4096');
      expect(await screen.findByText('Your recovery code')).toBeTruthy();
      expect(shownCode().replace(/-/g, '')).not.toBe(set.recoveryCode);
    });

    it('offers no reset while something runs', async () => {
      await store().setCode('2580', { recovery: true });
      registerRunningCheck('phone-taken', () => true);
      await render(wrap(<SecretCodeScreen mode="confirm" reason="phone-taken" onDone={jest.fn()} />));
      await screen.findByText('Enter your secret code to stop "My phone is being taken"');
      expect(screen.queryByRole('button', { name: 'Forgot the code?' })).toBeNull();
    });

    it('says so when none was made', async () => {
      await store().setCode('2580');
      await render(wrap(<SecretCodeScreen mode="change" onDone={jest.fn()} />));
      await fireEvent.press(await screen.findByRole('button', { name: 'Forgot the code?' }));
      expect(await screen.findByText(/no recovery code was made, so the code can't be reset/)).toBeTruthy();
    });

    it('is made anew in Settings after the secret code, and Settings says when', async () => {
      await store().setCode('2580');
      await render(
        wrap(
          <>
            <SecretCodeSettings />
            <SecretCodeScreen mode="recovery" onDone={jest.fn()} />
          </>,
        ),
      );
      expect(await screen.findByText(/No recovery code yet/)).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: 'Make a recovery code' }));
      expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/secret-code', params: { mode: 'recovery', request: expect.any(String) } });

      await type('1357');
      expect(await screen.findByText("That's not the code.")).toBeTruthy();
      await type('2580');
      expect(await screen.findByText('Your recovery code')).toBeTruthy();
      // 6 Nov 2026, 10:00 UTC is 15:30 IST, the same day.
      expect(await screen.findByText('Recovery code made on 06/11/2026.')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Make a new recovery code' })).toBeTruthy();
    });

    it('is asked for when Saakshi opens, if none is kept; "Not now" waits for the next open', async () => {
      await store().setCode('2580');
      const view = await render(wrap(<RecoveryCodeReminder />));
      expect(await screen.findByText(/only a recovery code can reset it/)).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: 'Make it now' }));
      expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/secret-code', params: { mode: 'recovery', request: expect.any(String) } });
      await fireEvent.press(screen.getByRole('button', { name: 'Not now' }));
      expect(screen.queryByText('Make a recovery code')).toBeNull();
      await view.unmount();
      // Still "Not now" until Saakshi opens again.
      const again = await render(wrap(<RecoveryCodeReminder />));
      expect(screen.queryByRole('button', { name: 'Make it now' })).toBeNull();
      await again.unmount();
      resetRecoveryReminder();
      await render(wrap(<RecoveryCodeReminder />));
      expect(await screen.findByRole('button', { name: 'Make it now' })).toBeTruthy();
    });

    it('is not asked for once one is kept, while something runs, or on a phone with a screen lock', async () => {
      await store().setCode('2580', { recovery: true });
      const kept = await render(wrap(<RecoveryCodeReminder />));
      await waitFor(() => expect(store().getState().loaded).toBe(true));
      expect(screen.queryByRole('button', { name: 'Make it now' })).toBeNull();
      await kept.unmount();

      holder.current = jest.requireActual('./memory').memoryCodeStore();
      await store().setCode('2580');
      registerRunningCheck('live-location', () => true);
      const running = await render(wrap(<RecoveryCodeReminder />));
      await waitFor(() => expect(store().getState().loaded).toBe(true));
      expect(screen.queryByRole('button', { name: 'Make it now' })).toBeNull();
      await running.unmount();

      clearRunningChecks();
      instance.method.current = 'passcode';
      await render(wrap(<RecoveryCodeReminder />));
      expect(screen.queryByRole('button', { name: 'Make it now' })).toBeNull();
    });
  });

  it('works in Hindi', async () => {
    await act(() => i18n.changeLanguage('hi'));
    try {
      await render(wrap(<SecretCodeSettings />, 'hi'));
      expect(await screen.findByText('अभी कोई सीक्रेट कोड सेट नहीं है।')).toBeTruthy();
    } finally {
      await act(() => i18n.changeLanguage('en'));
    }
  });
});
