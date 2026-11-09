import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import { PhoneTakenStatus, PhoneTakenSwipe } from '../ui/PhoneTaken';

// The orchestrator with stand-in parts.
jest.mock('../phoneTakenInstance', () => {
  const { useSyncExternalStore } = jest.requireActual('react');
  const { PhoneTakenController } = jest.requireActual('../phoneTaken');
  let text: string | null = null;
  const parts = {
    codeIsSet: jest.fn(async () => false),
    requireCode: jest.fn(async () => true),
    startPocket: jest.fn(async () => undefined),
    stopPocket: jest.fn(async () => undefined),
    startLive: jest.fn(async () => ({ link: 'https://live/#tok', invite: 'invite' })),
    stopLive: jest.fn(async () => undefined),
    alert: jest.fn(async () => undefined),
    textLink: jest.fn(async () => undefined),
  };
  const phoneTaken = new PhoneTakenController({
    ...parts,
    storage: { read: () => text, write: (value: string) => void (text = value) },
    heartbeat: { start: jest.fn(), stop: jest.fn() },
    // Android with the device admin on (group 1.7): locked, so no reminder in these tests.
    lockScreen: jest.fn(async () => true),
    now: () => new Date('2026-11-06T05:10:00Z'),
    liveWaitMs: 10,
  });
  return { phoneTaken, parts, usePhoneTaken: () => useSyncExternalStore(phoneTaken.subscribe, phoneTaken.getState) };
});

const mockRunning = { bug: false, share: false };
jest.mock('@/modules/bugmode', () => ({ useBugMode: () => ({ running: mockRunning.bug }) }));
jest.mock('@/modules/location', () => ({ useLiveShare: () => (mockRunning.share ? { shareId: 's' } : null) }));
const mockOpenCodeScreen = jest.fn(async () => true);
jest.mock('@/modules/secretcode', () => ({ openCodeScreen: (...args: unknown[]) => mockOpenCodeScreen(...(args as [])) }));

const { phoneTaken, parts } = jest.requireMock('../phoneTakenInstance') as {
  phoneTaken: import('../phoneTaken').PhoneTakenController;
  parts: Record<string, jest.Mock>;
};

function wrap(children: React.ReactNode) {
  return <PreferencesProvider initial={{ language: 'en', theme: 'light' }}>{children}</PreferencesProvider>;
}

describe('"My phone is being taken" on the SOS page', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('explains that a secret code is needed, sets one, then starts', async () => {
    await render(
      wrap(
        <>
          <PhoneTakenSwipe />
          <PhoneTakenStatus />
        </>,
      ),
    );
    const control = screen.getByRole('button', { name: 'My phone is being taken. Records sound, shares your location, alerts your contacts' });
    // The screen-reader way: double tap, then confirm.
    await fireEvent(control, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(screen.getByText(/It can only be stopped in Saakshi with your secret code\./)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
    expect(await screen.findByText('A secret code is needed first')).toBeTruthy();
    expect(parts.startPocket).not.toHaveBeenCalled();

    parts.codeIsSet.mockResolvedValue(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Set a secret code' }));
    expect(mockOpenCodeScreen).toHaveBeenCalledWith('set', 'phone-taken');
    await waitFor(() => expect(parts.startPocket).toHaveBeenCalled());
    mockRunning.bug = true;
    mockRunning.share = true;

    // Running: the swipe gives way to what is running, in plain words.
    expect(await screen.findByText('"My phone is being taken" is on')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /My phone is being taken\./ })).toBeNull();
    await waitFor(() => expect(screen.getByText('Your SOS alert went to your trusted contacts.')).toBeTruthy());
    expect(screen.getByText('It can only be stopped in Saakshi with your secret code.')).toBeTruthy();
  });

  it('shows a part that stopped on its own, and offers to start it again', async () => {
    mockRunning.bug = false;
    mockRunning.share = true;
    await render(wrap(<PhoneTakenStatus />));
    expect(screen.getByText('Sound recording has stopped.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try recording again' }));
    expect(parts.startPocket).toHaveBeenCalledTimes(2);
  });

  it('stops only through the secret code', async () => {
    await render(wrap(<PhoneTakenStatus />));
    parts.requireCode.mockResolvedValueOnce(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Stop' }));
    expect(parts.stopPocket).not.toHaveBeenCalled();
    expect(phoneTaken.getState().active).toBe(true);

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Stop' }));
    });
    expect(parts.requireCode).toHaveBeenCalledTimes(2);
    expect(parts.stopPocket).toHaveBeenCalled();
    expect(parts.stopLive).toHaveBeenCalled();
    expect(screen.queryByText('"My phone is being taken" is on')).toBeNull();
  });
});
