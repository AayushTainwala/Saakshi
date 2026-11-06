import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import i18n, { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import type { memoryCodeStore } from './memory';
import { requireSecretCode } from '../request';
import { clearRunningChecks, registerRunningCheck } from '../running';
import { SecretCodeRoute, SecretCodeScreen } from '../ui/SecretCodeScreen';
import { SecretCodeSettings } from '../ui/SecretCodeSettings';

// The stored code lives in memory instead of the phone's secure storage.
jest.mock('../instance', () => {
  const { memoryCodeStore } = jest.requireActual('./memory');
  const { useEffect, useSyncExternalStore } = jest.requireActual('react');
  const holder = { current: memoryCodeStore() };
  return {
    holder,
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
    resetWithPhonePasscode: jest.fn(async () => 'reset'),
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

const holder = (jest.requireMock('../instance') as { holder: { current: ReturnType<typeof memoryCodeStore> } }).holder;
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
    mockPush.mockClear();
    clearRunningChecks();
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
