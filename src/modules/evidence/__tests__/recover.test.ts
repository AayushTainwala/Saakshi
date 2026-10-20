import { createHash } from 'node:crypto';

import { CaptureSession, type PipelineDeps } from '../capture/pipeline';
import { recoverPending, type RecoveryFiles } from '../capture/recover';
import type { EvidenceRecord } from '../integrity/record';
import { createSealer } from '../integrity/seal';
import type { FileDigests } from '../types';
import { memoryLocker } from './memoryLocker';
import { nodeSha256Hex, testSigner } from './testSigner';

function digestsOf(bytes: Uint8Array): FileDigests {
  const h = (a: string) => createHash(a).update(bytes).digest('hex');
  return { size: bytes.length, sha256: h('sha256'), sha1: h('sha1'), md5: h('md5'), crc32: 0 };
}

function setup() {
  const files = new Map<string, Uint8Array>();
  const locker = memoryLocker(files);
  const key = testSigner();
  let ids = 0;
  const newId = () => `id-${ids++}`;
  const deps: PipelineDeps = {
    store: locker.store,
    now: () => new Date('2026-10-21T08:00:00.000Z'),
    newId,
    hash: async (uri) => digestsOf(files.get(uri)!),
    seal: createSealer({
      store: locker.store,
      signer: async () => key.signer,
      sha256Hex: nodeSha256Hex,
      newId,
      device: () => ({ manufacturer: 'x', brand: 'x', model: 'x', modelName: null, os: 'Android', osVersion: '15' }),
      app: () => ({ id: 'a', version: '1', build: '1' }),
      timeZone: () => 'Asia/Kolkata',
    }),
  };
  const modified = new Map<string, number>();
  const iosCache: { uri: string; createdAt: number }[] = [];
  const recoveryFiles: RecoveryFiles = {
    stat: (uri) => (files.has(uri) ? { size: files.get(uri)!.length, modifiedAt: modified.get(uri) ?? 0 } : null),
    iosCameraFiles: () => iosCache.filter((f) => files.has(f.uri)),
  };
  const recordOf = (sessionId: string, file: string) =>
    JSON.parse(locker.records.get(`${sessionId}/${file}`)!.body) as EvidenceRecord;
  return { files, locker, deps, modified, iosCache, recoveryFiles, recordOf };
}

/** A session that recorded one photo, then was cut off while recording a video. */
async function crashedSession(ctx: ReturnType<typeof setup>) {
  ctx.files.set('cache://photo.jpg', new Uint8Array([1, 2, 3]));
  const session = new CaptureSession(ctx.deps);
  await session.add({
    uri: 'cache://photo.jpg',
    kind: 'photo',
    segment: null,
    startedAt: new Date('2026-10-20T09:00:00Z'),
    endedAt: new Date('2026-10-20T09:00:00Z'),
    location: { status: 'denied', fix: null },
  });
  await session.finish();
  return session.id!;
}

describe('recoverPending', () => {
  it('seals a cut-off video as interrupted, chained after the files before it', async () => {
    const ctx = setup();
    const id = await crashedSession(ctx);
    const uri = 'mem://incoming/rec-1.ts';
    ctx.files.set(uri, new Uint8Array(5000).fill(7));
    ctx.modified.set(uri, Date.parse('2026-10-20T09:04:59.500Z'));
    ctx.locker.store.writePending(id, 'rec-1.ts.json', {
      file: uri,
      kind: 'video',
      segment: null,
      startedAt: '2026-10-20T09:01:00.000Z',
      mode: 'camera',
    });

    const items = await recoverPending(ctx.deps, ctx.recoveryFiles);
    expect(items.map((i) => [i.sequence, i.status, i.interrupted, i.media])).toEqual([[1, 'sealed', true, '0001-video.ts']]);

    const state = ctx.locker.store.readSession(id)!;
    const record = ctx.recordOf(id, state.items[1].record!.file);
    expect(record.interrupted).toBe(true);
    expect(record.file.mediaType).toBe('video/mp2t');
    expect(record.capture).toMatchObject({
      startedAt: '2026-10-20T09:01:00.000Z',
      endedAt: '2026-10-20T09:04:59.500Z',
      endedAtSource: 'file-modified',
      endReason: 'interrupted',
    });
    expect(record.previous?.recordSha256).toBe(state.items[0].recordSha256);
    expect(ctx.locker.store.listPending(id)).toEqual([]);
  });

  it('seals a file that closed normally but was not sealed, without marking it interrupted', async () => {
    const ctx = setup();
    const id = await crashedSession(ctx);
    ctx.files.set('mem://incoming/rec-2.ts', new Uint8Array([9]));
    ctx.locker.store.writePending(id, 'rec-2.ts.json', {
      file: 'mem://incoming/rec-2.ts',
      kind: 'video',
      segment: { clip: 0, index: 3 },
      startedAt: '2026-10-20T09:01:00.000Z',
      closedAt: '2026-10-20T09:02:00.000Z',
      endReason: 'piece-complete',
      mode: 'body-cam',
      gapBeforeMs: 120,
    });
    await recoverPending(ctx.deps, ctx.recoveryFiles);
    const state = ctx.locker.store.readSession(id)!;
    const record = ctx.recordOf(id, state.items[1].record!.file);
    expect(record.interrupted).toBe(false);
    expect(record.capture).toMatchObject({ mode: 'body-cam', endReason: 'piece-complete', endedAtSource: 'recorder', gapBeforeMs: 120 });
  });

  it('drops markers whose file is missing or empty', async () => {
    const ctx = setup();
    const id = await crashedSession(ctx);
    ctx.files.set('mem://incoming/empty.ts', new Uint8Array());
    ctx.locker.store.writePending(id, 'empty.ts.json', { file: 'mem://incoming/empty.ts', kind: 'video', segment: null, startedAt: '2026-10-20T09:01:00Z', mode: 'camera' });
    ctx.locker.store.writePending(id, 'gone.ts.json', { file: 'mem://incoming/gone.ts', kind: 'video', segment: null, startedAt: '2026-10-20T09:02:00Z', mode: 'camera' });
    expect(await recoverPending(ctx.deps, ctx.recoveryFiles)).toEqual([]);
    expect(ctx.locker.store.listPending(id)).toEqual([]);
    expect(ctx.locker.store.readSession(id)!.items).toHaveLength(1);
  });

  it('finds an iPhone recording in the camera cache by its creation time', async () => {
    const ctx = setup();
    const id = await crashedSession(ctx);
    const started = Date.parse('2026-10-20T09:01:00.000Z');
    ctx.files.set('cache://Camera/older.mov', new Uint8Array([1]));
    ctx.files.set('cache://Camera/this.mov', new Uint8Array([2, 2]));
    ctx.iosCache.push({ uri: 'cache://Camera/older.mov', createdAt: started - 60_000 }, { uri: 'cache://Camera/this.mov', createdAt: started + 300 });
    ctx.locker.store.writePending(id, 'pending-1.json', {
      file: null,
      search: 'ios-camera-cache',
      kind: 'video',
      segment: null,
      startedAt: '2026-10-20T09:01:00.000Z',
      mode: 'camera',
    });
    const [item] = await recoverPending(ctx.deps, ctx.recoveryFiles);
    expect(item.digests?.size).toBe(2);
    expect(item.media).toBe('0001-video.mov');
    expect(ctx.files.has('cache://Camera/older.mov')).toBe(true);
  });

  it('leaves a session that is still recording alone', async () => {
    const ctx = setup();
    ctx.files.set('cache://p.jpg', new Uint8Array([1]));
    const live = new CaptureSession(ctx.deps);
    await live.add({ uri: 'cache://p.jpg', kind: 'photo', segment: null, startedAt: new Date(), endedAt: new Date(), location: { status: 'denied', fix: null } });
    ctx.files.set('mem://incoming/now.ts', new Uint8Array([1]));
    ctx.locker.store.writePending(live.id!, 'now.ts.json', { file: 'mem://incoming/now.ts', kind: 'video', segment: null, startedAt: new Date().toISOString(), mode: 'camera' });
    expect(await recoverPending(ctx.deps, ctx.recoveryFiles)).toEqual([]);
    expect(ctx.locker.store.listPending(live.id!)).toHaveLength(1);
  });

  it('removes a marker as soon as its file is safely in the locker', async () => {
    const ctx = setup();
    ctx.files.set('mem://incoming/ok.ts', new Uint8Array([1]));
    const session = new CaptureSession(ctx.deps);
    const id = session.ensureSession().id;
    ctx.locker.store.writePending(id, 'ok.ts.json', { file: 'mem://incoming/ok.ts', kind: 'video', segment: null, startedAt: new Date().toISOString(), mode: 'camera' });
    await session.add({ uri: 'mem://incoming/ok.ts', kind: 'video', segment: null, startedAt: new Date(), endedAt: new Date(), location: { status: 'denied', fix: null }, pendingMarker: 'ok.ts.json' });
    expect(ctx.locker.store.listPending(id)).toEqual([]);
  });
});
