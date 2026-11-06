import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import { LiveLocationCard } from '../ui/LiveLocationCard';

const mockStopLive = jest.fn(async () => undefined);
jest.mock('../alert/live', () => ({
  liveInviteNow: async () => 'invite',
  startLiveLocation: jest.fn(),
  stopLiveLocation: () => mockStopLive(),
}));
jest.mock('@/modules/location', () => ({
  LocationDeniedError: class extends Error {},
  useLiveLength: () => 4,
  useLiveShare: () => ({ expiresAt: '2026-11-06T09:10:00Z', lastSentAt: null, pending: [], link: 'https://live/#t' }),
}));
const mockRequire = jest.fn(async (_options: { reason: string }) => false);
jest.mock('@/modules/secretcode', () => ({ requireSecretCode: (options: { reason: string }) => mockRequire(options) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const ROOT = join(__dirname, '../../../..');

describe('Stop needs the secret code everywhere (round 2, group 1.3; SPEC 5.3)', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('live location stops only after the right code', async () => {
    await render(
      <PreferencesProvider initial={{ language: 'en', theme: 'light' }}>
        <LiveLocationCard />
      </PreferencesProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Stop sharing' }));
    expect(mockRequire).toHaveBeenCalledWith({ reason: 'live-location' });
    expect(mockStopLive).not.toHaveBeenCalled();
    mockRequire.mockResolvedValueOnce(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Stop sharing' }));
    await waitFor(() => expect(mockStopLive).toHaveBeenCalledTimes(1));
  });

  it('body-cam\'s Stop asks for the code, and its Android notification has no Stop button', () => {
    const screenSource = readFileSync(join(ROOT, 'src/modules/evidence/bodycam/BodyCamScreen.tsx'), 'utf8');
    expect(screenSource).toContain("requireSecretCode({ reason: 'body-cam' })");
    expect(screenSource).toContain('onPress={() => void stopWithCode()}');
    expect(screenSource).not.toContain('onBodyCamStopped');
    const service = readFileSync(
      join(ROOT, 'modules/saakshi-evidence/android/src/main/java/expo/modules/saakshievidence/BodyCamService.kt'),
      'utf8',
    );
    expect(service).not.toMatch(/addAction|EXTRA_STOP_LABEL|fromNotification/);
    // Pocket recording's notification had none to begin with; neither does the Live Activity.
    const pocket = readFileSync(join(ROOT, 'modules/saakshi-sos/android/src/main/java/expo/modules/saakshisos/BugModeService.kt'), 'utf8');
    expect(pocket).not.toMatch(/addAction/);
    const activity = readFileSync(join(ROOT, 'targets/widget/BugModeLiveActivity.swift'), 'utf8');
    expect(activity).not.toMatch(/Button\(|AppIntent/);
  });
});
