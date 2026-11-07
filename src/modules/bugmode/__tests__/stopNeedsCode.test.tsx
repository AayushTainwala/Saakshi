import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import { BugModeScreen } from '../ui/BugModeScreen';

const mockStop = jest.fn(async () => undefined);
jest.mock('../instance', () => ({
  bugMode: { stop: () => mockStop(), start: jest.fn() },
  useBugMode: () => ({ running: true, startedAt: '2026-11-06T05:10:00Z', checkpoints: 0, lastSignedAt: null, failed: 0, problem: null, lastWitnessAt: null }),
}));
jest.mock('../engines', () => ({ MicrophoneDeniedError: class extends Error {} }));
const mockRequire = jest.fn(async (_options: { reason: string }) => false);
jest.mock('@/modules/secretcode', () => ({ requireSecretCode: (options: { reason: string }) => mockRequire(options) }));
jest.mock('@/modules/sos', () => ({ canTextWithoutTap: async () => false }));
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]) };
});

describe('Pocket recording: Stop needs the secret code (round 2, group 1.3)', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('stops only after the right code', async () => {
    await render(
      <PreferencesProvider initial={{ language: 'en', theme: 'light' }}>
        <BugModeScreen />
      </PreferencesProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Stop Pocket recording' }));
    expect(mockRequire).toHaveBeenCalledWith({ reason: 'pocket-recording' });
    expect(mockStop).not.toHaveBeenCalled();

    mockRequire.mockResolvedValueOnce(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Stop Pocket recording' }));
    await waitFor(() => expect(mockStop).toHaveBeenCalledTimes(1));
  });
});
