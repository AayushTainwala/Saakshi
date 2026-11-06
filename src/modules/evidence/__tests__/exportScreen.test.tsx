import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import type { ExportFolder } from '../export/folder';
import { shareKind, shareTarget } from '../export/shareTarget';
import type { EvidenceItem, SessionState } from '../types';
import { SessionDetail } from '../ui/SessionDetail';

let mockSession: SessionState;
let mockFolder: ExportFolder | null = null;
let mockPicked: ExportFolder | null = null;
const mockCalls: string[] = [];

jest.mock('../locker/useSessions', () => ({ useSession: () => mockSession }));
jest.mock('../locker/records', () => ({ recordModeOf: () => null }));
jest.mock('../locker/actions', () => ({ runCheck: jest.fn() }));
jest.mock('../witness/send', () => ({ sendWitnessMessage: jest.fn(), SmsUnavailableError: class extends Error {} }));
jest.mock('@/modules/sos', () => ({ getTrustedContacts: async () => [] }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('../ui/RecordingPlayer', () => ({ RecordingPlayer: () => null }));
jest.mock('../ui/RecordRow', () => ({ Thumbnail: () => null }));
jest.mock('../export/videoActions', () => ({
  needsCopy: (item: { mediaType: string }) => item.mediaType === 'video/mp2t',
  playVideo: jest.fn(),
  shareFile: async (_: string, item: { sequence: number }, title: string) => void mockCalls.push(`share file ${item.sequence} (${title})`),
  shareJoinedCopy: async (_: string, title: string) => void mockCalls.push(`share joined (${title})`),
}));
jest.mock('../export/bundle', () => ({
  BundleBusyError: class extends Error {},
  shareBundle: async () => void mockCalls.push('share bundle'),
}));
jest.mock('../export/folder', () => ({
  readExportFolder: () => mockFolder,
  saveExportFolder: (folder: ExportFolder) => {
    mockFolder = folder;
    mockCalls.push(`keep ${folder.name}`);
  },
  pickExportFolder: async () => {
    mockCalls.push('pick');
    return mockPicked;
  },
  exportToFolder: async (id: string, folder: ExportFolder) => {
    mockCalls.push(`export ${id} to ${folder.name}`);
    if (folder.name === 'Gone') throw new Error('No such folder');
    return { folder, fileName: folder.platform === 'ios' ? 'Saakshi 2026-11-06 10-40 IST Body-cam.zip' : null };
  },
}));

const at = (m: number) => new Date(Date.UTC(2026, 10, 6, 5, m)).toISOString();

function item(sequence: number, over: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    sequence,
    kind: 'video',
    segment: { clip: 0, index: 0 },
    media: `${sequence}.mp4`,
    mediaType: 'video/mp4',
    startedAt: at(10 + sequence),
    endedAt: at(11 + sequence),
    status: 'sealed',
    mode: 'body-cam',
    ...over,
  };
}

const session = (items: EvidenceItem[]): SessionState => ({
  version: 1,
  id: 's1',
  createdAt: at(9),
  updatedAt: at(30),
  items,
  witness: [],
  certificate: null,
});

function wrap(children: React.ReactNode) {
  return <PreferencesProvider initial={{ language: 'en', theme: 'light' }}>{children}</PreferencesProvider>;
}

let alerts: { title: string; body?: string; buttons?: AlertButton[] }[] = [];

describe('what a record shares (fix round 1, group 9)', () => {
  it('shares a body-cam record as one joined video, or its one video', () => {
    const joined = shareTarget(session([item(0), item(1, { kind: 'audio', media: '1.aac' }), item(2)]), 'body-cam');
    expect(joined).toEqual({ kind: 'joined' });
    expect(shareKind(joined)).toBe('video');
    const one = shareTarget(session([item(0), item(1, { kind: 'audio', media: '1.aac' })]), 'body-cam');
    expect(one).toMatchObject({ kind: 'file', item: { sequence: 0 } });
  });

  it('shares a bug-mode record\'s sound, and asks for each file of a camera record with several', () => {
    const sound = shareTarget(session([item(0, { kind: 'audio', media: '0.aac', mode: 'bug' })]), 'bug');
    expect(shareKind(sound)).toBe('audio');
    const photos = session([item(0, { kind: 'photo', media: '0.jpg', mode: 'camera' }), item(1, { mode: 'camera' })]);
    expect(shareTarget(photos, 'camera')).toEqual({ kind: 'each' });
    expect(shareKind(shareTarget(session([item(0, { kind: 'photo', media: '0.jpg', mode: 'camera' })]), 'camera'))).toBe('photo');
    expect(shareTarget(session([item(0, { status: 'failed' })]), 'body-cam')).toBeNull();
  });
});

describe('the record screen\'s two actions (fix round 1, group 9)', () => {
  beforeAll(() => {
    initI18n('en');
  });

  beforeEach(() => {
    mockCalls.length = 0;
    mockFolder = null;
    mockPicked = null;
    alerts = [];
    jest.spyOn(Alert, 'alert').mockImplementation((title, body, buttons) => {
      alerts.push({ title: title ?? '', body: body ?? undefined, buttons: buttons as AlertButton[] | undefined });
    });
  });

  it('shares an Android video as its MP4 copy, from the record and from its card', async () => {
    mockSession = session([item(0, { media: '0.ts', mediaType: 'video/mp2t' })]);
    await render(wrap(<SessionDetail id="s1" />));
    expect(screen.getByText(/This sends an MP4 copy that plays everywhere/)).toBeTruthy();
    const buttons = screen.getAllByRole('button', { name: 'Share video' });
    expect(buttons).toHaveLength(2);
    await fireEvent.press(buttons[0]);
    await fireEvent.press(buttons[1]);
    expect(mockCalls).toEqual(['share file 0 (Share video)', 'share file 0 (Share video)']);
  });

  it('asks for a folder the first time, then saves there with one tap', async () => {
    mockSession = session([item(0), item(1)]);
    mockPicked = { platform: 'android', uri: 'content://x/tree/primary%3ADocuments', name: 'Documents' };
    await render(wrap(<SessionDetail id="s1" />));
    expect(screen.getByText(/The first time, you choose a folder/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Change folder' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Export evidence bundle' }));
    expect(mockCalls).toEqual(['pick', 'keep Documents', 'export s1 to Documents']);
    expect(alerts.at(-1)).toMatchObject({ title: 'Bundle saved', body: 'The bundle is saved in Documents.' });
    expect(screen.getByText('Saves to: Documents')).toBeTruthy();

    mockCalls.length = 0;
    await fireEvent.press(screen.getByRole('button', { name: 'Export evidence bundle' }));
    expect(mockCalls).toEqual(['export s1 to Documents']);
  });

  it('says the file\'s name on iPhone, and does nothing if the picker is cancelled', async () => {
    mockSession = session([item(0), item(1)]);
    await render(wrap(<SessionDetail id="s1" />));
    await fireEvent.press(screen.getByRole('button', { name: 'Export evidence bundle' }));
    expect(mockCalls).toEqual(['pick']);
    expect(alerts).toEqual([]);

    mockPicked = { platform: 'ios', bookmark: 'b', name: 'Saakshi' };
    await fireEvent.press(screen.getByRole('button', { name: 'Export evidence bundle' }));
    expect(alerts.at(-1)).toMatchObject({ body: '“Saakshi 2026-11-06 10-40 IST Body-cam.zip” is saved in Saakshi.' });
  });

  it('offers another folder or the share sheet if the folder is gone', async () => {
    mockSession = session([item(0), item(1)]);
    mockFolder = { platform: 'android', uri: 'content://x/tree/gone', name: 'Gone' };
    await render(wrap(<SessionDetail id="s1" />));
    await fireEvent.press(screen.getByRole('button', { name: 'Export evidence bundle' }));
    const failed = alerts.at(-1)!;
    expect(failed.title).toBe('Couldn’t save the bundle');
    expect(failed.body).toContain('No such folder');
    await act(async () => failed.buttons!.find((b) => b.text === 'Share the bundle instead')!.onPress!());
    expect(mockCalls.at(-1)).toBe('share bundle');

    mockPicked = { platform: 'android', uri: 'content://x/tree/primary%3ADownload', name: 'Download' };
    await fireEvent.press(screen.getByRole('button', { name: 'Change folder' }));
    expect(screen.getByText('Saves to: Download')).toBeTruthy();
  });
});
