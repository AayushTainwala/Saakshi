import { fireEvent, render, screen } from '@testing-library/react-native';

import { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import { GB, MB, SAFETY_FLOOR_BYTES } from '../limits';
import { soundBytesPerSecond, videoBytesPerSecond } from '../rates';
import { RoomLine, StorageExplainer } from '../RoomLine';
import { loadStorageSettings, saveStorageSettings } from '../settings';

/** Repair round A, group 2: what the user is told about the phone's room. */

let mockFree: number | null = 20 * GB;
jest.mock('expo-file-system', () => ({
  Paths: {
    document: 'file:///documents',
    get availableDiskSpace() {
      if (mockFree === null) throw new Error('no reading');
      return mockFree;
    },
    totalDiskSpace: 128 * 1024 ** 3,
  },
  File: class {
    exists = false;
    create() {}
    writeSync() {}
    textSync() {
      return '';
    }
  },
}));

function wrap(children: React.ReactNode) {
  return <PreferencesProvider initial={{ language: 'en', theme: 'light' }}>{children}</PreferencesProvider>;
}

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  mockFree = 20 * GB;
  saveStorageSettings({ keepFreeBytes: 5 * GB, bodyCamSoundOnly: true, explained: false });
});

describe('RoomLine', () => {
  it('says how long the free room allows, from free space, the amount kept free and the rate', async () => {
    // 3 h 20 min of 720p video above the 5 GB kept free.
    mockFree = 5 * GB + videoBytesPerSecond(720) * 12_000;
    await render(wrap(<RoomLine kind="video" bytesPerSecond={videoBytesPerSecond(720)} limitBytes={5 * GB} />));
    expect(screen.getByText('Room for about 3 h 20 min of video')).toBeTruthy();
  });

  it('says it for sound, in minutes when under an hour', async () => {
    mockFree = 5 * GB + soundBytesPerSecond('ios') * 60 * 47;
    await render(wrap(<RoomLine kind="sound" bytesPerSecond={soundBytesPerSecond('ios')} limitBytes={5 * GB} />));
    expect(screen.getByText('Room for about 47 min of sound')).toBeTruthy();
  });

  it('says so when there is none, and when the phone does not say', async () => {
    mockFree = 4 * GB;
    const view = await render(wrap(<RoomLine kind="video" bytesPerSecond={videoBytesPerSecond(720)} limitBytes={5 * GB} />));
    expect(screen.getByText('Room for about less than a minute of video')).toBeTruthy();
    await view.unmount();
    mockFree = null;
    await render(wrap(<RoomLine kind="video" bytesPerSecond={videoBytesPerSecond(720)} limitBytes={5 * GB} />));
    expect(screen.getByText(/can't read how much room this phone has free. It will not stop a recording/)).toBeTruthy();
  });
});

describe('StorageExplainer', () => {
  it('tells the user, the first time, what these recordings take and what happens as the phone fills', async () => {
    await render(wrap(<StorageExplainer firstTime quality={720} />));
    expect(screen.getByText(/made for long recordings that nobody is watching/)).toBeTruthy();
    // From the recorders' rates: about 1.4 GB an hour of 720p video; sound depends on the phone.
    expect(screen.getByText(/An hour of body-cam video takes about 1\.4 GB\. An hour of sound takes about \d+ MB\./)).toBeTruthy();
    expect(screen.getByText(/Saakshi leaves 5 GB of the phone free for everything else/)).toBeTruthy();
    expect(screen.getByText(/body-cam stops video and carries on recording sound/)).toBeTruthy();
    expect(screen.getByText(/never records into the last 300 MB/)).toBeTruthy();
    expect(screen.getByText(/“My phone is being taken” keeps recording past the amount you keep free, down to that last 300 MB/)).toBeTruthy();

    // Read once: it is put away, and stays away.
    await fireEvent.press(screen.getByRole('button', { name: 'I understand' }));
    expect(screen.queryByText(/made for long recordings/)).toBeNull();
    expect(loadStorageSettings().explained).toBe(true);
  });

  it('is always there under Settings, and follows the settings', async () => {
    saveStorageSettings({ explained: true, keepFreeBytes: 10 * GB, bodyCamSoundOnly: false });
    await render(wrap(<StorageExplainer />));
    expect(screen.getByText(/Saakshi leaves 10 GB of the phone free/)).toBeTruthy();
    expect(screen.getByText('When only that much is left, body-cam and Pocket recording stop and save the recording.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'I understand' })).toBeNull();
    expect(SAFETY_FLOOR_BYTES).toBe(300 * MB);
  });
});
