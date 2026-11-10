import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { CaptureSession, lastLink, type PipelineDeps } from '../capture/pipeline';
import { recoverPending, type RecoveryFiles } from '../capture/recover';
import { fillMissingCrc } from '../export/crc';
import { crc32 } from '../export/zip';
import { mergeDeviceKey } from '../integrity/deviceKey';
import { createCheckpointSealer, createSealer, type SealerDeps } from '../integrity/seal';
import { markInactive } from '../locker/active';
import { checkSession, type CheckInput } from '../locker/check';
import type { CheckpointInput, ClosedFile, FileDigests, SessionState } from '../types';
import { bundleFilesOf } from './bundleFiles';
import { memoryLocker } from './memoryLocker';
import { nodeSha256Hex, testSigner } from './testSigner';

/** Repair round A, group 1: the locker's bookkeeping can't be lost. */

const VERIFY = join(__dirname, '../../../../tools/verify-bundle.mjs');
const app = { id: 'in.aayushtainwala.saakshi', version: '1.0.0', build: '1' };
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const location = { status: 'denied' as const, fix: null };
const enc = (text: string) => new TextEncoder().encode(text);

function digestsOf(bytes: Uint8Array): FileDigests {
  const h = (a: string) => createHash(a).update(bytes).digest('hex');
  return { size: bytes.length, sha256: h('sha256'), sha1: h('sha1'), md5: h('md5'), crc32: crc32(bytes) };
}

const growing = (length: number, seed: number) => new Uint8Array(length).map((_, i) => (i * seed + (i >> 7)) % 256);
const video = growing(30_080, 7);
const sound = growing(9_000, 13);

function setup() {
  const files = new Map<string, Uint8Array>();
  const locker = memoryLocker(files);
  const key = testSigner();
  let ids = 0;
  const newId = () => `00000000-0000-4000-8000-${String(ids++).padStart(12, '0')}`;
  const sealer: SealerDeps = {
    store: locker.store,
    signer: async () => key.signer,
    sha256Hex: nodeSha256Hex,
    newId,
    device: () => ({ manufacturer: 'Apple', brand: 'Apple', model: 'iPhone17,1', modelName: 'iPhone 16 Pro', os: 'iOS', osVersion: '26.1' }),
    app: () => app,
    timeZone: () => 'Asia/Kolkata',
  };
  const deps: PipelineDeps = {
    store: locker.store,
    now: () => new Date('2026-11-05T05:11:00.000Z'),
    newId,
    hash: async (uri) => digestsOf(files.get(uri)!),
    seal: createSealer(sealer),
    sealCheckpoint: createCheckpointSealer(sealer),
  };
  const deviceKey = mergeDeviceKey(
    { keyId: key.keyId, publicKeySpki: Buffer.from(key.spki).toString('base64'), platform: 'ios', storage: 'secure-enclave', attestation: null, attestationError: 'not attested in this test' },
    null,
    new Date('2026-11-05T05:00:00.000Z'),
  );
  return { files, locker, deps, deviceKey };
}

function checkpoint(recording: string, index: number, bytes: Uint8Array, upTo: number, kind: 'video' | 'audio' = 'video'): CheckpointInput {
  return {
    recording,
    index,
    kind,
    segment: { clip: kind === 'video' ? 0 : 1, index: 0 },
    mediaType: kind === 'video' ? 'video/mp4' : 'audio/aac',
    bytes: upTo,
    sha256: sha(bytes.subarray(0, upTo)),
    at: new Date(Date.UTC(2026, 10, 5, 5, 10, 10 * (index + 1))),
    startedAt: new Date('2026-11-05T05:10:00.000Z'),
    location,
    mode: 'body-cam',
  };
}

const closed = (uri: string, kind: ClosedFile['kind'], recording: string, clip: number, more: Partial<ClosedFile> = {}): ClosedFile => ({
  uri,
  kind,
  segment: { clip, index: 0 },
  startedAt: new Date('2026-11-05T05:10:00.000Z'),
  endedAt: new Date('2026-11-05T05:10:45.000Z'),
  location,
  mode: 'body-cam',
  endReason: 'stopped',
  recording,
  ...more,
});

/** A body-cam session: a video with three checkpoints, then a sound-only file with one. */
async function bodycamSession(ctx: ReturnType<typeof setup>) {
  ctx.files.set('file:///incoming/rec-a.mp4', video);
  ctx.files.set('file:///incoming/rec-b.aac', sound);
  const session = new CaptureSession(ctx.deps);
  await session.addCheckpoint(checkpoint('rec-a', 0, video, 7_520));
  await session.addCheckpoint(checkpoint('rec-a', 1, video, 15_040));
  await session.addCheckpoint(checkpoint('rec-a', 2, video, 22_560));
  await session.add(closed('file:///incoming/rec-a.mp4', 'video', 'rec-a', 0));
  await session.addCheckpoint(checkpoint('rec-b', 0, sound, 4_000, 'audio'));
  await session.add(closed('file:///incoming/rec-b.aac', 'audio', 'rec-b', 1));
  await session.finish();
  return session.id!;
}

const cleanup: string[] = [];
afterAll(() => cleanup.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** Exports the session as the app does and runs tools/verify-bundle.mjs on the result. */
async function verified(ctx: ReturnType<typeof setup>, id: string) {
  await fillMissingCrc(ctx.locker.store, ctx.deps.hash!, id);
  const { files } = bundleFilesOf(ctx.locker, id, ctx.deviceKey, new Date('2026-11-05T06:00:00.000Z'), app);
  const dir = mkdtempSync(join(tmpdir(), 'saakshi-index-'));
  cleanup.push(dir);
  for (const [name, bytes] of files) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), bytes);
  }
  const result = spawnSync('node', [VERIFY, dir], { encoding: 'utf8' });
  return { code: result.status, out: result.stdout + result.stderr, names: [...files.keys()] };
}

/** The on-phone check (locker/check.ts) over a session's records and files as they are now. */
function phoneCheck(ctx: ReturnType<typeof setup>, state: SessionState) {
  const body = (file: string) => ctx.locker.records.get(`${state.id}/${file}`)!.body;
  const inputs: CheckInput[] = [
    ...state.items
      .filter((item) => item.status === 'sealed')
      .map((item) => {
        const media = ctx.files.get(ctx.locker.store.mediaUri(state.id, item.media));
        return {
          sequence: item.sequence,
          body: body(item.record!.file),
          bodySha256: sha(enc(body(item.record!.file))),
          sealedRecordSha256: item.recordSha256,
          file: media ? { size: media.length, sha256: sha(media) } : null,
        };
      }),
    ...(state.checkpoints ?? []).map((c) => ({
      sequence: c.sequence,
      kind: 'checkpoint' as const,
      body: body(c.record!.file),
      bodySha256: sha(enc(body(c.record!.file))),
      sealedRecordSha256: c.recordSha256,
      file: null,
    })),
  ];
  return checkSession(inputs);
}

const indexUri = (id: string) => `mem://${id}/session.json`;

describe('session.json is written beside and swapped in', () => {
  it('keeps the old file readable when a write is interrupted before the swap', async () => {
    const ctx = setup();
    const id = await bodycamSession(ctx);
    const before = ctx.locker.store.readSession(id)!;
    const text = ctx.locker.indexText(id);

    ctx.locker.failNextReplace();
    expect(() => ctx.locker.store.writeSession({ ...before, certificate: { file: 'certificate-part-a.pdf', createdAt: 'x' } })).toThrow('write interrupted');

    // The half-written file is beside the old one, which is untouched and still what is read.
    expect(ctx.files.has(`${indexUri(id)}.tmp`)).toBe(true);
    expect(ctx.locker.indexText(id)).toBe(text);
    expect(ctx.locker.store.readSession(id)).toEqual(before);
    expect(ctx.locker.store.readSession(id)!.rebuilt).toBeUndefined();

    // The leftover goes when the app next opens.
    expect(ctx.locker.store.repair().leftovers).toBe(1);
    expect(ctx.files.has(`${indexUri(id)}.tmp`)).toBe(false);
    expect(ctx.locker.store.readSession(id)).toEqual(before);
  });

  it('does the same for a recovery marker', () => {
    const ctx = setup();
    const { id } = ctx.locker.store.createSession('s1', '2026-11-05T05:00:00.000Z');
    const marker = { file: null, kind: 'video' as const, segment: null, startedAt: '2026-11-05T05:10:00.000Z', mode: 'camera' as const };
    ctx.locker.store.writePending(id, 'a.json', marker);
    ctx.locker.failNextReplace();
    expect(() => ctx.locker.store.writePending(id, 'a.json', { ...marker, closedAt: '2026-11-05T05:11:00.000Z' })).toThrow();
    expect(ctx.locker.store.listPending(id)).toEqual([{ name: 'a.json', marker }]);
    expect(ctx.locker.store.repair().leftovers).toBe(1);
    expect(ctx.locker.store.listPending(id)).toEqual([{ name: 'a.json', marker }]);
  });

  it('does the same for the device-key file', () => {
    const ctx = setup();
    ctx.locker.store.writeDeviceKeyJson('{"keyId":"one"}');
    ctx.locker.failNextReplace();
    expect(() => ctx.locker.store.writeDeviceKeyJson('{"keyId":"two"}')).toThrow();
    expect(ctx.locker.store.readDeviceKeyJson()).toBe('{"keyId":"one"}');
  });
});

describe('a checkpoint adds a line; the whole file is not rewritten', () => {
  it('leaves session.json alone for a checkpoint and rewrites it when a file closes', async () => {
    const ctx = setup();
    ctx.files.set('file:///incoming/rec-a.mp4', video);
    const session = new CaptureSession(ctx.deps);
    const id = session.ensureSession().id;
    const created = ctx.locker.indexText(id);

    await session.addCheckpoint(checkpoint('rec-a', 0, video, 7_520));
    await session.addCheckpoint(checkpoint('rec-a', 1, video, 15_040));
    expect(ctx.locker.indexText(id)).toBe(created);
    expect(ctx.locker.logText(id)!.split('\n').filter(Boolean)).toHaveLength(2);
    // Reading joins the two.
    expect(ctx.locker.store.readSession(id)!.checkpoints!.map((c) => [c.sequence, c.index, c.status])).toEqual([
      [0, 0, 'sealed'],
      [1, 1, 'sealed'],
    ]);

    await session.add(closed('file:///incoming/rec-a.mp4', 'video', 'rec-a', 0));
    await session.finish();
    const index = JSON.parse(ctx.locker.indexText(id)!);
    expect(index.items).toHaveLength(1);
    // What the log holds stays in the log: session.json doesn't grow with the recording's length.
    expect(index.checkpoints).toBeUndefined();
    expect(ctx.locker.logText(id)!.split('\n').filter(Boolean)).toHaveLength(2);
    expect(ctx.locker.store.readSession(id)!.checkpoints).toHaveLength(2);
  });

  it('ignores a half-written last line, and a line cut short before others', async () => {
    const ctx = setup();
    const id = await bodycamSession(ctx);
    const whole = ctx.locker.store.readSession(id)!;
    const lines = ctx.locker.logText(id)!.split('\n').filter(Boolean);
    expect(lines).toHaveLength(4);

    // The last line cut off mid-write.
    ctx.files.set(`mem://${id}/session.log`, enc(`\n${lines[0]}\n\n${lines[1]}\n\n${lines[2]}\n\n${lines[3].slice(0, 40)}`));
    expect(ctx.locker.store.readSession(id)!.checkpoints!.map((c) => c.sequence)).toEqual([0, 1, 2]);

    // A line cut off, and the recording carried on: the lines after it are still read.
    ctx.files.set(`mem://${id}/session.log`, enc(`\n${lines[0]}\n\n${lines[1].slice(0, 25)}`));
    ctx.locker.store.appendCheckpoint(id, whole.checkpoints![2]);
    expect(ctx.locker.store.readSession(id)!.checkpoints!.map((c) => c.sequence)).toEqual([0, 2]);

    // When the app next opens, the checkpoints whose lines were lost are listed again from their
    // signed records, and the session is whole.
    expect(ctx.locker.store.repair().caughtUp).toEqual([id]);
    const repaired = ctx.locker.store.readSession(id)!;
    expect(repaired.checkpoints).toEqual(whole.checkpoints);
    expect(repaired.rebuilt).toBeUndefined();
    expect((await verified(ctx, id)).code).toBe(0);
  });

  it('reads a session saved before this repair, with its checkpoints inside session.json, and keeps them', async () => {
    const ctx = setup();
    const id = await bodycamSession(ctx);
    const whole = ctx.locker.store.readSession(id)!;
    // As the app wrote it before: everything in session.json, and no log.
    ctx.files.set(indexUri(id), enc(JSON.stringify(whole)));
    ctx.files.delete(`mem://${id}/session.log`);
    expect(ctx.locker.store.readSession(id)).toEqual(whole);

    ctx.locker.store.writeSession({ ...whole, lastCheck: { at: '2026-11-05T07:00:00.000Z', ok: true, problems: [] } });
    expect(ctx.locker.store.readSession(id)!.checkpoints).toEqual(whole.checkpoints);
    expect(ctx.locker.store.repair()).toEqual({ rebuilt: [], damaged: [], caughtUp: [], leftovers: 0 });
  });

  it('keeps a witness message in the log, where a recording in progress cannot write over it', async () => {
    const ctx = setup();
    ctx.files.set('file:///incoming/rec-a.mp4', video);
    const session = new CaptureSession(ctx.deps);
    await session.addCheckpoint(checkpoint('rec-a', 0, video, 7_520));
    const id = session.id!;
    const entry = { sentAt: '2026-11-05T05:10:20.000Z', chainHead: 'abc', recipients: 2, result: 'sent' as const };
    ctx.locker.store.appendWitness(id, entry);
    // The recording's own copy of the bookkeeping has never heard of the message.
    await session.add(closed('file:///incoming/rec-a.mp4', 'video', 'rec-a', 0));
    await session.finish();
    expect(ctx.locker.store.readSession(id)!.witness).toEqual([entry]);
    expect(JSON.parse(ctx.locker.indexText(id)!).witness).toEqual([]);
  });
});

describe('unreadable bookkeeping is made again from the signed records', () => {
  const broken: [string, (text: string) => Uint8Array | null][] = [
    ['missing', () => null],
    ['empty', () => new Uint8Array()],
    ['truncated', (text) => enc(text.slice(0, Math.floor(text.length / 2)))],
    ['garbage', () => new Uint8Array([0xff, 0xfe, 0x00, 0x7b, 0x22, 0x9c])],
    ['some other JSON', () => enc('{"version":1,"id":"someone-else","items":[],"witness":[],"createdAt":"x"}')],
  ];

  it.each(broken)('rebuilds a session whose session.json is %s', async (_, damage) => {
    const ctx = setup();
    const id = await bodycamSession(ctx);
    const whole = ctx.locker.store.readSession(id)!;
    const bytes = damage(ctx.locker.indexText(id)!);
    if (bytes) ctx.files.set(indexUri(id), bytes);
    else ctx.files.delete(indexUri(id));

    // It is still listed, and says that it was rebuilt.
    const [listed] = ctx.locker.store.listSessions();
    expect(listed.id).toBe(id);
    expect(listed.rebuilt).toEqual({ at: '2026-11-10T06:00:00.000Z' });
    expect(listed.damaged).toBeUndefined();

    // Everything a signed record holds is back; the CRC-32s are not in the records.
    expect(listed.items).toEqual(whole.items.map((item) => ({ ...item, digests: { ...item.digests!, crc32: null } })));
    expect(listed.checkpoints).toEqual(whole.checkpoints);
    expect(lastLink(listed)).toEqual(lastLink(whole));
    expect(listed.createdAt).toBe('2026-11-05T05:10:00.000Z');

    // The rebuilt bookkeeping was saved, so it is made once.
    expect(JSON.parse(ctx.locker.indexText(id)!).rebuilt).toEqual({ at: '2026-11-10T06:00:00.000Z' });
    expect(ctx.locker.store.readSession(id)).toEqual(listed);
  });

  it('gives a rebuilt session that passes the on-phone check, exports, and passes tools/verify-bundle.mjs', async () => {
    const ctx = setup();
    const id = await bodycamSession(ctx);
    const before = await verified(ctx, id);
    expect(before.code).toBe(0);

    ctx.files.set(indexUri(id), new Uint8Array());
    const rebuilt = ctx.locker.store.readSession(id)!;
    expect(rebuilt.rebuilt).toBeDefined();
    expect(phoneCheck(ctx, rebuilt)).toEqual([]);

    const after = await verified(ctx, id);
    expect(after.out).toContain('OK');
    expect(after.code).toBe(0);
    // The same bundle as before the index was lost, file for file.
    expect(after.names).toEqual(before.names);
    // The CRC-32s were worked out again from the files, and kept.
    expect(ctx.locker.store.readSession(id)!.items.map((item) => item.digests!.crc32)).toEqual([crc32(video), crc32(sound)]);
  });

  it('refuses to export a rebuilt file that is no longer the file its record signed', async () => {
    const ctx = setup();
    const id = await bodycamSession(ctx);
    ctx.files.delete(indexUri(id));
    const rebuilt = ctx.locker.store.readSession(id)!;
    ctx.files.set(ctx.locker.store.mediaUri(id, rebuilt.items[0].media), growing(30_080, 9));
    await expect(fillMissingCrc(ctx.locker.store, ctx.deps.hash!, id)).rejects.toThrow('has changed since it was signed');
  });

  it('brings back the certificate and the witness messages in the log, and says what it cannot', async () => {
    const ctx = setup();
    const id = await bodycamSession(ctx);
    const entry = { sentAt: '2026-11-05T05:20:00.000Z', chainHead: 'abc', recipients: 1, result: 'unknown' as const };
    ctx.locker.store.appendWitness(id, entry);
    ctx.files.set(`mem://${id}/certificate-part-a.pdf`, enc('%PDF'));
    ctx.locker.modified.set(`mem://${id}/certificate-part-a.pdf`, Date.parse('2026-11-05T08:00:00.000Z'));
    const whole = ctx.locker.store.readSession(id)!;
    ctx.locker.store.writeSession({
      ...whole,
      certificate: { file: 'certificate-part-a.pdf', createdAt: '2026-11-05T07:59:58.000Z' },
      lastCheck: { at: '2026-11-05T07:00:00.000Z', ok: true, problems: [] },
      copies: { '3': { file: 'x.copy.mp4', sha256: 'a', recordSha256: 'b', madeAt: 'c' } },
    });

    ctx.files.set(indexUri(id), enc('{"version":1,"id":"'));
    const rebuilt = ctx.locker.store.readSession(id)!;
    expect(rebuilt.witness).toEqual([entry]);
    // The certificate is found by its file; its time is the file's last write.
    expect(rebuilt.certificate).toEqual({ file: 'certificate-part-a.pdf', createdAt: '2026-11-05T08:00:00.000Z' });
    // Not in any signed record or file: these start again.
    expect(rebuilt.lastCheck).toBeUndefined();
    expect(rebuilt.copies).toBeUndefined();
  });

  it('lists a file in media/ that has no signed record, marked so', async () => {
    const ctx = setup();
    const id = await bodycamSession(ctx);
    // A third file was hashed and moved in, and the app died before its record was signed.
    ctx.files.set(`mem://${id}/media/0006-clip2-seg0.mp4`, growing(500, 3));
    ctx.locker.modified.set(`mem://${id}/media/0006-clip2-seg0.mp4`, Date.parse('2026-11-05T05:12:00.000Z'));
    // And its record was half-made: the body is there, the signature is not.
    ctx.files.set(`mem://${id}/records/0006.json`, enc(ctx.locker.records.get(`${id}/0005.json`)!.body.replace('"sequence":5', '"sequence":6')));
    ctx.files.delete(indexUri(id));

    const rebuilt = ctx.locker.store.readSession(id)!;
    expect(rebuilt.items.map((item) => [item.sequence, item.status, item.noRecord ?? false])).toEqual([
      [3, 'sealed', false],
      [5, 'sealed', false],
      [6, 'saved', true],
    ]);
    expect(rebuilt.items[2]).toEqual({
      sequence: 6,
      kind: 'video',
      segment: { clip: 2, index: 0 },
      media: '0006-clip2-seg0.mp4',
      mediaType: 'video/mp4',
      startedAt: '2026-11-05T05:12:00.000Z',
      endedAt: '2026-11-05T05:12:00.000Z',
      status: 'saved',
      noRecord: true,
    });
    // The signed files still export and verify; the unsigned one is not in the bundle.
    const result = await verified(ctx, id);
    expect(result.code).toBe(0);
    expect(result.names.filter((name) => name.startsWith('Original files/'))).toHaveLength(2);
  });

  it('lists a session with nothing to rebuild from as damaged, with its files, and never saves that', async () => {
    const ctx = setup();
    const id = await bodycamSession(ctx);
    const other = await bodycamSession(ctx);
    for (const key of [...ctx.files.keys()]) if (key.startsWith(`mem://${id}/records/`)) ctx.files.set(key, new Uint8Array([1, 2, 3]));
    ctx.files.set(indexUri(id), new Uint8Array());
    ctx.files.set(`mem://${id}/incoming/rec-c.mp4`, growing(100, 5));
    ctx.locker.modified.set(`mem://${id}/incoming/rec-c.mp4`, Date.parse('2026-11-11T00:00:00.000Z'));

    const sessions = ctx.locker.store.listSessions();
    expect(sessions.map((s) => s.id).sort()).toEqual([id, other].sort());
    const damaged = sessions.find((s) => s.id === id)!;
    expect(damaged.items).toEqual([]);
    expect(damaged.damaged!.files.map((f) => [f.folder, f.name, f.size])).toEqual([
      ['media', '0003-clip0-seg0.mp4', 30_080],
      ['media', '0005-audio1-seg0.aac', 9_000],
      ['incoming', 'rec-c.mp4', 100],
    ]);
    expect(ctx.locker.store.sessionFileUri(id, 'media/0003-clip0-seg0.mp4')).toBe(`mem://${id}/media/0003-clip0-seg0.mp4`);

    // Nothing was written: the session's folder is as it was, and the locker tries again each time.
    expect(ctx.locker.indexText(id)).toBe('');
    expect(() => ctx.locker.store.writeSession(damaged)).toThrow('damaged');
    expect(ctx.locker.store.repair().damaged).toEqual([id]);
    expect(ctx.locker.indexText(id)).toBe('');
    // Even an empty folder is listed.
    ctx.locker.memory.makeFolder('mem://empty');
    expect(ctx.locker.store.listSessions().find((s) => s.id === 'empty')!.damaged).toEqual({ files: [] });
    // A session that was deleted is still gone.
    expect(ctx.locker.store.readSession('never-there')).toBeNull();
  });

  it('leaves a damaged session alone when recovering cut-off recordings', async () => {
    const ctx = setup();
    const { id } = ctx.locker.store.createSession('s1', '2026-11-05T05:00:00.000Z');
    markInactive(id);
    ctx.files.set(indexUri(id), new Uint8Array());
    ctx.files.set(`mem://${id}/incoming/rec.ts`, growing(100, 5));
    ctx.locker.store.writePending(id, 'rec.ts.json', { file: `mem://${id}/incoming/rec.ts`, kind: 'video', segment: null, startedAt: '2026-11-05T05:10:00.000Z', mode: 'camera' });
    const recovered = await recoverPending(ctx.deps, { stat: (uri) => (ctx.files.has(uri) ? { size: ctx.files.get(uri)!.length, modifiedAt: 0 } : null), iosCameraFiles: () => [] });
    expect(recovered).toEqual([]);
    expect(ctx.files.has(`mem://${id}/incoming/rec.ts`)).toBe(true);
    expect(ctx.locker.store.listPending(id)).toHaveLength(1);
  });
});

describe('a recording and its bookkeeping', () => {
  it('carries on and seals when session.json is lost while recording', async () => {
    const ctx = setup();
    ctx.files.set('file:///incoming/rec-a.mp4', video);
    ctx.files.set('file:///incoming/rec-b.aac', sound);
    const session = new CaptureSession(ctx.deps);
    await session.addCheckpoint(checkpoint('rec-a', 0, video, 7_520));
    const id = session.id!;

    // The index is lost in the middle of the recording.
    ctx.files.set(indexUri(id), enc('{"vers'));
    await session.addCheckpoint(checkpoint('rec-a', 1, video, 15_040));
    await session.addCheckpoint(checkpoint('rec-a', 2, video, 22_560));
    await session.add(closed('file:///incoming/rec-a.mp4', 'video', 'rec-a', 0));
    await session.addCheckpoint(checkpoint('rec-b', 0, sound, 4_000, 'audio'));
    await session.add(closed('file:///incoming/rec-b.aac', 'audio', 'rec-b', 1));
    await session.finish();

    const state = ctx.locker.store.readSession(id)!;
    // The recording's own copy put the whole of it back when the next file closed.
    expect(state.rebuilt).toBeUndefined();
    expect(state.items.map((item) => [item.sequence, item.status])).toEqual([
      [3, 'sealed'],
      [5, 'sealed'],
    ]);
    expect(state.checkpoints!.map((c) => c.sequence)).toEqual([0, 1, 2, 4]);
    expect(phoneCheck(ctx, state)).toEqual([]);
    expect((await verified(ctx, id)).code).toBe(0);
  });

  it('seals a cut-off file after a checkpoint signed just before the cut, without taking its number', async () => {
    const ctx = setup();
    ctx.files.set(`mem://s/incoming/rec-a.mp4`, video);
    const session = new CaptureSession(ctx.deps);
    await session.addCheckpoint(checkpoint('rec-a', 0, video, 7_520));
    await session.addCheckpoint(checkpoint('rec-a', 1, video, 15_040));
    const id = session.id!;
    const head = lastLink(ctx.locker.store.readSession(id)!)!;
    // The app was killed after the second checkpoint's record was written and before the
    // bookkeeping was told: the log has only the first line.
    ctx.files.set(`mem://${id}/session.log`, enc(ctx.locker.logText(id)!.split('\n').filter(Boolean)[0] + '\n'));
    markInactive(id);
    ctx.locker.store.writePending(id, 'rec-a.mp4.json', {
      file: 'mem://s/incoming/rec-a.mp4',
      kind: 'video',
      segment: { clip: 0, index: 0 },
      startedAt: '2026-11-05T05:10:00.000Z',
      mode: 'body-cam',
      recording: 'rec-a',
    });
    const recoveryFiles: RecoveryFiles = { stat: (uri) => (ctx.files.has(uri) ? { size: ctx.files.get(uri)!.length, modifiedAt: Date.parse('2026-11-05T05:10:45.000Z') } : null), iosCameraFiles: () => [] };

    const [item] = await recoverPending(ctx.deps, recoveryFiles);
    // It is record 2, after both checkpoints, and names the second as the record before it.
    expect(item.sequence).toBe(2);
    expect(item.interrupted).toBe(true);
    expect(JSON.parse(ctx.locker.records.get(`${id}/0002.json`)!.body).previous).toEqual(head);
    const state = ctx.locker.store.readSession(id)!;
    expect(state.checkpoints!.map((c) => c.sequence)).toEqual([0, 1]);
    expect(phoneCheck(ctx, state)).toEqual([]);
    expect((await verified(ctx, id)).code).toBe(0);
  });

  it('seals a cut-off recording whose bookkeeping was lost too', async () => {
    const ctx = setup();
    ctx.files.set(`mem://s/incoming/rec-a.mp4`, video);
    const session = new CaptureSession(ctx.deps);
    await session.addCheckpoint(checkpoint('rec-a', 0, video, 7_520));
    await session.addCheckpoint(checkpoint('rec-a', 1, video, 15_040));
    const id = session.id!;
    markInactive(id);
    // The phone went off: session.json is empty, as the old way of writing could leave it.
    ctx.files.set(indexUri(id), new Uint8Array());
    ctx.locker.store.writePending(id, 'rec-a.mp4.json', {
      file: 'mem://s/incoming/rec-a.mp4',
      kind: 'video',
      segment: { clip: 0, index: 0 },
      startedAt: '2026-11-05T05:10:00.000Z',
      mode: 'body-cam',
      recording: 'rec-a',
    });
    const recoveryFiles: RecoveryFiles = { stat: (uri) => (ctx.files.has(uri) ? { size: ctx.files.get(uri)!.length, modifiedAt: Date.parse('2026-11-05T05:10:45.000Z') } : null), iosCameraFiles: () => [] };

    const [item] = await recoverPending(ctx.deps, recoveryFiles);
    expect([item.sequence, item.status, item.interrupted]).toEqual([2, 'sealed', true]);
    const state = ctx.locker.store.readSession(id)!;
    expect(state.rebuilt).toBeDefined();
    expect(state.checkpoints!.map((c) => c.sequence)).toEqual([0, 1]);
    expect(phoneCheck(ctx, state)).toEqual([]);
    expect((await verified(ctx, id)).code).toBe(0);
  });
});
