import { CaptureSession, type PipelineDeps } from '../capture/pipeline';
import { mediaFileName, mediaTypeFor } from '../locker/media';
import type { ClosedFile, FileDigests } from '../types';
import { memoryLocker } from './memoryLocker';

const at = (s: number) => new Date(Date.UTC(2026, 9, 20, 9, 0, s));
const noLocation = { status: 'denied', fix: null } as const;

function closed(uri: string, kind: ClosedFile['kind'], segment: ClosedFile['segment'] = null): ClosedFile {
  return { uri, kind, segment, startedAt: at(0), endedAt: at(1), location: noLocation };
}

function fakeDigests(bytes: Uint8Array): FileDigests {
  return { size: bytes.length, sha256: 'a'.repeat(64), sha1: 'b'.repeat(40), md5: 'c'.repeat(32), crc32: 0 };
}

function setup(overrides: Partial<PipelineDeps> = {}) {
  const locker = memoryLocker(
    new Map([
      ['cache://photo.jpg', new Uint8Array([1])],
      ['cache://a.mp4', new Uint8Array([2, 2])],
      ['cache://b.mov', new Uint8Array([3, 3, 3])],
    ]),
  );
  let ids = 0;
  const deps: PipelineDeps = {
    store: locker.store,
    now: () => at(10),
    newId: () => `id-${ids++}`,
    ...overrides,
  };
  return { locker, session: new CaptureSession(deps) };
}

describe('CaptureSession', () => {
  it('saves files into one session, numbered in the order they closed', async () => {
    const { locker, session } = setup();
    const clip = session.nextClip();
    await Promise.all([
      session.add(closed('cache://photo.jpg', 'photo')),
      session.add(closed('cache://a.mp4', 'video', { clip, index: 0 })),
      session.add(closed('cache://b.mov', 'video', { clip, index: 1 })),
    ]);

    const state = locker.store.readSession(session.id!)!;
    expect(state.items.map((i) => [i.sequence, i.media, i.mediaType, i.status])).toEqual([
      [0, '0000-photo.jpg', 'image/jpeg', 'saved'],
      [1, '0001-clip0-seg0.mp4', 'video/mp4', 'saved'],
      [2, '0002-clip0-seg1.mov', 'video/quicktime', 'saved'],
    ]);
    expect(locker.files.has('cache://a.mp4')).toBe(false);
    expect(locker.files.get(`mem://${session.id}/media/0001-clip0-seg0.mp4`)).toEqual(new Uint8Array([2, 2]));
  });

  it('hashes before moving, and processes one file at a time even when hashing takes varying time', async () => {
    const events: string[] = [];
    const delays: Record<string, number> = { 'cache://photo.jpg': 30, 'cache://a.mp4': 0 };
    const { locker, session } = setup({
      hash: async (uri) => {
        events.push(`hash-start ${uri}`);
        await new Promise((r) => setTimeout(r, delays[uri] ?? 0));
        events.push(`hash-end ${uri}`);
        return fakeDigests(new Uint8Array([0]));
      },
    });
    const original = locker.store.moveMedia;
    locker.store.moveMedia = (id, uri, name) => {
      events.push(`move ${uri}`);
      return original(id, uri, name);
    };

    await Promise.all([session.add(closed('cache://photo.jpg', 'photo')), session.add(closed('cache://a.mp4', 'video', { clip: 0, index: 0 }))]);
    expect(events).toEqual([
      'hash-start cache://photo.jpg',
      'hash-end cache://photo.jpg',
      'move cache://photo.jpg',
      'hash-start cache://a.mp4',
      'hash-end cache://a.mp4',
      'move cache://a.mp4',
    ]);
    expect(locker.store.readSession(session.id!)!.items.every((i) => i.status === 'hashed')).toBe(true);
  });

  it('marks a file failed without stopping the files after it', async () => {
    const { locker, session } = setup({
      hash: async (uri) => {
        if (uri === 'cache://a.mp4') throw new Error('disk error');
        return fakeDigests(new Uint8Array([0]));
      },
    });
    const results = await Promise.all([
      session.add(closed('cache://a.mp4', 'video', { clip: 0, index: 0 })),
      session.add(closed('cache://b.mov', 'video', { clip: 0, index: 1 })),
    ]);
    expect(results.map((r) => r.status)).toEqual(['failed', 'hashed']);
    expect(results[0].error).toBe('disk error');
    expect(locker.store.readSession(session.id!)!.items).toHaveLength(2);
    expect(session.pending).toBe(0);
  });
});

describe('media names', () => {
  it('names photos, video segments and audio segments', () => {
    expect(mediaFileName(0, 'photo', null, 'jpg')).toBe('0000-photo.jpg');
    expect(mediaFileName(3, 'video', { clip: 1, index: 2 }, 'mp4')).toBe('0003-clip1-seg2.mp4');
    expect(mediaFileName(4, 'audio', { clip: 0, index: 0 }, '')).toBe('0004-audio0-seg0.m4a');
    expect(mediaTypeFor('m4a', 'audio')).toBe('audio/mp4');
    expect(mediaTypeFor('', 'audio')).toBe('audio/mp4');
  });
});
