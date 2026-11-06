import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import { markActive, markInactive } from '../locker/active';
import type { EvidenceItem, SessionState } from '../types';
import { RecordingPlayer } from '../ui/RecordingPlayer';
import { RecordRow } from '../ui/RecordRow';

/** A stand-in for expo-video's player: it logs what it is told, and the test fires its events. */
type FakePlayer = {
  log: string[];
  currentTime: number;
  timeUpdateEventInterval: number;
  listeners: Map<string, Set<(payload?: unknown) => void>>;
  replaceAsync: (source: { uri: string }) => Promise<void>;
  play: () => void;
  pause: () => void;
  fire: (name: string, payload?: unknown) => void;
};

let lastPlayer: FakePlayer | null = null;

jest.mock('expo-video', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    useVideoPlayer: (source: { uri: string } | null, setup?: (p: unknown) => void) => {
      const { useState } = jest.requireActual('react');
      const [player] = useState(() => {
        const p: FakePlayer = {
          log: source ? [`source ${source.uri}`] : [],
          currentTime: 0,
          timeUpdateEventInterval: 0,
          listeners: new Map(),
          async replaceAsync(next) {
            p.log.push(`source ${next.uri}`);
            p.currentTime = 0;
          },
          play: () => void p.log.push(`play at ${p.currentTime}`),
          pause: () => void p.log.push('pause'),
          fire: (name, payload) => p.listeners.get(name)?.forEach((l) => l(payload)),
        };
        setup?.(p);
        return p;
      });
      lastPlayer = player;
      return player;
    },
    VideoView: (props: object) => createElement(View, props),
  };
});

jest.mock('expo', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    ...jest.requireActual('expo'),
    useEventListener: (player: FakePlayer, name: string, listener: (payload?: unknown) => void) => {
      useEffect(() => {
        if (!player.listeners.has(name)) player.listeners.set(name, new Set());
        player.listeners.get(name)!.add(listener);
        return () => void player.listeners.get(name)!.delete(listener);
      }, [player, name, listener]);
    },
  };
});

jest.mock('expo-video-thumbnails', () => ({ getThumbnailAsync: jest.fn(async () => ({ uri: 'file:///cache/t.jpg', width: 1, height: 1 })) }));
jest.mock('expo-image', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { Image: (props: object) => createElement(View, { ...props, testID: 'thumbnail' }) };
});
jest.mock('../locker/store', () => {
  const listeners = new Set<() => void>();
  let version = 0;
  return {
    fileLocker: {
      mediaUri: (session: string, name: string) => `file:///locker/${session}/media/${name}`,
      sessionFileUri: (session: string, name: string) => `file:///locker/${session}/${name}`,
      readRecordText: () => {
        throw new Error('no record');
      },
    },
    lockerVersion: () => version,
    subscribeToLocker: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notifyLockerChanged: () => {
      version++;
      listeners.forEach((l) => l());
    },
  };
});

const at = (m: number, s = 0, msec = 0) => new Date(Date.UTC(2026, 10, 6, 5, m, s, msec)).toISOString();

function item(sequence: number, over: Partial<EvidenceItem>): EvidenceItem {
  return {
    sequence,
    kind: 'video',
    segment: { clip: 0, index: 0 },
    media: `${sequence}.mp4`,
    mediaType: 'video/mp4',
    startedAt: at(10),
    endedAt: at(12),
    status: 'sealed',
    mode: 'body-cam',
    ...over,
  };
}

const bodyCam = [
  item(3, { startedAt: at(10), endedAt: at(12) }),
  item(5, { kind: 'audio', media: '5.aac', mediaType: 'audio/aac', startedAt: at(11, 59, 500), endedAt: at(14, 0, 500) }),
  item(9, { startedAt: at(14), endedAt: at(20) }),
];

function wrap(children: React.ReactNode) {
  return <PreferencesProvider initial={{ language: 'en', theme: 'light' }}>{children}</PreferencesProvider>;
}

describe('the records list and the player (fix round 1, group 3)', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('shows a record as what it is, with its start and length', async () => {
    const session: SessionState = {
      version: 1,
      id: 's1',
      createdAt: at(9),
      updatedAt: at(20),
      items: bodyCam,
      witness: [],
      certificate: null,
    };
    await render(wrap(<RecordRow session={session} pressed={false} />));
    expect(screen.getByText('Body-cam, 10 min 0 s')).toBeTruthy();
    expect(screen.getByText('Started 06/11/2026 10:40 IST')).toBeTruthy();
  });

  it('names an evidence-camera record by what it holds', async () => {
    const session: SessionState = {
      version: 1,
      id: 's2',
      createdAt: at(9),
      updatedAt: at(20),
      items: [
        item(0, { kind: 'photo', segment: null, media: '0.jpg', mode: 'camera' }),
        item(1, { kind: 'photo', segment: null, media: '1.jpg', mode: 'camera' }),
        item(2, { segment: null, mode: 'camera', startedAt: at(10), endedAt: at(10, 35) }),
      ],
      witness: [],
      certificate: null,
    };
    await render(wrap(<RecordRow session={session} pressed={false} />));
    expect(screen.getByText('Video and 2 photos, 35 s')).toBeTruthy();
    expect(await screen.findByTestId('thumbnail')).toBeTruthy();
  });

  it('plays every file end to end, starting each where the last stopped', async () => {
    await render(wrap(<RecordingPlayer sessionId="s1" items={bodyCam} />));
    expect(screen.getByText('0:00 of 10:00 · File 1 of 3')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Play' }));
    const player = lastPlayer!;
    expect(player.log).toEqual(['source file:///locker/s1/media/3.mp4', 'play at 0']);

    await act(async () => player.fire('playToEnd'));
    expect(player.log.slice(2)).toEqual(['source file:///locker/s1/media/5.aac', 'play at 0.5']);
    expect(screen.getByText('Sound only: video could not record here, for example while you were away from Saakshi.')).toBeTruthy();
    await act(async () => player.fire('timeUpdate', { currentTime: 10.5 }));
    expect(screen.getByText('2:10 of 10:00 · File 2 of 3')).toBeTruthy();

    await act(async () => player.fire('playToEnd'));
    expect(player.log.slice(4)).toEqual(['source file:///locker/s1/media/9.mp4', 'play at 0.5']);
    await act(async () => player.fire('playToEnd'));
    expect(screen.getByRole('button', { name: 'Play again from the start' })).toBeTruthy();
    expect(screen.getByText('10:00 of 10:00 · File 3 of 3')).toBeTruthy();
  });

  it('plays nothing while Saakshi is recording', async () => {
    markActive('recording-now');
    try {
      await render(wrap(<RecordingPlayer sessionId="s1" items={bodyCam} />));
      expect(screen.getByText('Playing is off while Saakshi is recording, so the recording doesn’t pick it up.')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Play' })).toBeNull();
    } finally {
      await act(async () => markInactive('recording-now'));
    }
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
  });

  it('waits, ready, if a recording starts while a file is being got ready', async () => {
    await render(wrap(<RecordingPlayer sessionId="s1" items={bodyCam} />));
    const player = lastPlayer!;
    let release: () => void = () => undefined;
    player.replaceAsync = async (next) => {
      player.log.push(`source ${next.uri}`);
      await new Promise<void>((resolve) => (release = resolve));
    };
    await fireEvent.press(screen.getByRole('button', { name: 'Play' }));
    markActive('bug-mode');
    try {
      await act(async () => release());
      // Loaded, but nothing played.
      expect(player.log[0]).toBe('source file:///locker/s1/media/3.mp4');
      expect(player.log.filter((line) => line.startsWith('play'))).toEqual([]);
      expect(screen.getByText('Playing is off while Saakshi is recording, so the recording doesn’t pick it up.')).toBeTruthy();
    } finally {
      await act(async () => markInactive('bug-mode'));
    }
    // Ready to carry on from where it was.
    await fireEvent.press(screen.getByRole('button', { name: 'Play' }));
    expect(player.log.at(-1)).toBe('play at 0');
  });

  it('starts one sound file at once when asked', async () => {
    const sound = item(4, { kind: 'audio', media: '4.aac', mediaType: 'audio/aac', mode: 'bug' });
    await render(wrap(<RecordingPlayer sessionId="s3" items={[sound]} autoPlay showParts={false} />));
    expect(lastPlayer!.log).toEqual(['source file:///locker/s3/media/4.aac', 'play at 0']);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
  });
});
