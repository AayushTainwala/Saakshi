import { fireEvent, render, screen } from '@testing-library/react-native';

import { initI18n } from '@/i18n';
import { GB, loadStorageSettings, MB, saveStorageSettings } from '@/platform/storage';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import type { EvidenceItem, SessionState } from '../types';
import { recordingsBytes, StorageSettings } from '../ui/StorageSettings';

/** Repair round A, group 2: Settings → Storage. */

let mockSessions: SessionState[] = [];
jest.mock('../locker/useSessions', () => ({ useSessions: () => mockSessions }));
jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///documents', availableDiskSpace: 12 * 1024 ** 3, totalDiskSpace: 128 * 1024 ** 3 },
  File: class {
    exists = false;
    create() {}
    writeSync() {}
    textSync() {
      return '';
    }
  },
}));

const item = (sequence: number, size?: number): EvidenceItem => ({
  sequence,
  kind: 'video',
  segment: null,
  media: `${sequence}.mp4`,
  mediaType: 'video/mp4',
  startedAt: '2026-11-06T05:10:00.000Z',
  endedAt: '2026-11-06T05:11:00.000Z',
  status: size ? 'sealed' : 'failed',
  ...(size ? { digests: { size, sha256: 'a', sha1: 'b', md5: 'c', crc32: 0 } } : {}),
});
const session = (id: string, items: EvidenceItem[]): SessionState => ({ version: 1, id, createdAt: 'x', updatedAt: 'x', items, witness: [], certificate: null });

function wrap(children: React.ReactNode) {
  return <PreferencesProvider initial={{ language: 'en', theme: 'light' }}>{children}</PreferencesProvider>;
}

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  saveStorageSettings({ keepFreeBytes: 5 * GB, bodyCamSoundOnly: true, explained: true });
  mockSessions = [session('a', [item(0, 2 * GB), item(1, 300 * MB)]), session('b', [item(0, 500 * MB), item(1)])];
});

describe('Settings → Storage', () => {
  it('adds up the recorded files of every record', () => {
    expect(recordingsBytes(mockSessions)).toBe(2 * GB + 800 * MB);
    expect(recordingsBytes([])).toBe(0);
  });

  it('shows how much is free and how much Saakshi\'s recordings take', async () => {
    await render(wrap(<StorageSettings />));
    expect(screen.getByText('Free on this phone now: 12 GB')).toBeTruthy();
    expect(screen.getByText("Saakshi's recordings take about 2.8 GB.")).toBeTruthy();
    // The explanation is always here.
    expect(screen.getByText(/made for long recordings that nobody is watching/)).toBeTruthy();
  });

  it('starts at 5 GB kept free and keeps what the user chooses', async () => {
    await render(wrap(<StorageSettings />));
    expect(screen.getByRole('radio', { name: '5 GB' }).props.accessibilityState.checked).toBe(true);
    await fireEvent.press(screen.getByRole('radio', { name: '10 GB' }));
    expect(loadStorageSettings().keepFreeBytes).toBe(10 * GB);
    expect(screen.getByRole('radio', { name: '10 GB' }).props.accessibilityState.checked).toBe(true);
    expect(screen.getByText(/Saakshi leaves 10 GB of the phone free/)).toBeTruthy();
  });

  it('has body-cam carry on as sound only unless the user switches that off', async () => {
    await render(wrap(<StorageSettings />));
    expect(screen.getByRole('radio', { name: 'Stop video and keep recording sound' }).props.accessibilityState.checked).toBe(true);
    await fireEvent.press(screen.getByRole('radio', { name: 'Stop the recording' }));
    expect(loadStorageSettings().bodyCamSoundOnly).toBe(false);
  });

  it('says so when nothing is recorded', async () => {
    mockSessions = [];
    await render(wrap(<StorageSettings />));
    expect(screen.getByText('Saakshi has no recordings on this phone.')).toBeTruthy();
  });
});
