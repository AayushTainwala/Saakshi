import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { CaptureSession } from '../capture/pipeline';
import { type BundledCheckpoint, buildManifest, type BundledRecord, chainHead, hashReport, README } from '../export/contents';
import { crc32 } from '../export/zip';
import { mergeDeviceKey } from '../integrity/deviceKey';
import type { CheckpointRecord, EvidenceRecord } from '../integrity/record';
import { createCheckpointSealer, createSealer, type SealerDeps } from '../integrity/seal';
import { checkSession } from '../locker/check';
import type { CheckpointInput, ClosedFile, FileDigests } from '../types';
import { memoryLocker } from './memoryLocker';
import { nodeSha256Hex, testSigner } from './testSigner';

const VERIFY = join(__dirname, '../../../../tools/verify-bundle.mjs');
const app = { id: 'in.aayushtainwala.saakshi', version: '1.0.0', build: '1' };
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const location = { status: 'denied' as const, fix: null };

function digestsOf(bytes: Uint8Array): FileDigests {
  const h = (a: string) => createHash(a).update(bytes).digest('hex');
  return { size: bytes.length, sha256: h('sha256'), sha1: h('sha1'), md5: h('md5'), crc32: crc32(bytes) };
}

/** A file that "grows" like a recording: checkpoints are taken over its first bytes as it is written. */
function growing(length: number, seed: number) {
  return new Uint8Array(length).map((_, i) => (i * seed + (i >> 7)) % 256);
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

/**
 * A body-cam session as the app makes it: a video file with three checkpoints and a sound-only file
 * with one, interleaved in the chain, then each file's own record when it closes.
 */
async function makeSession(options: { videoLength?: number; failCheckpoint?: number } = {}) {
  const video = growing(30_080, 7);
  const sound = growing(9_000, 13);
  const videoOnDisk = options.videoLength ? video.subarray(0, options.videoLength) : video;
  const media = new Map<string, Uint8Array>([
    ['file:///s/incoming/rec-a.mp4', videoOnDisk],
    ['file:///s/incoming/rec-b.aac', sound],
  ]);
  const locker = memoryLocker(media);
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
  const session = new CaptureSession({
    store: locker.store,
    now: () => new Date('2026-11-05T05:11:00.000Z'),
    newId,
    hash: async (uri) => digestsOf(media.get(uri)!),
    seal: createSealer(sealer),
    sealCheckpoint: async (input) => {
      // As if signing failed for one checkpoint (the key was briefly unavailable).
      if (input.checkpoint.recording === 'rec-a' && input.checkpoint.index === options.failCheckpoint) throw new Error('no key');
      return createCheckpointSealer(sealer)(input);
    },
  });
  const closed = (uri: string, kind: ClosedFile['kind'], recording: string, clip: number): ClosedFile => ({
    uri,
    kind,
    segment: { clip, index: 0 },
    startedAt: new Date('2026-11-05T05:10:00.000Z'),
    endedAt: new Date('2026-11-05T05:10:45.000Z'),
    location,
    mode: 'body-cam',
    endReason: 'stopped',
    recording,
  });

  await Promise.all([
    session.addCheckpoint(checkpoint('rec-a', 0, video, 7_520)),
    session.addCheckpoint(checkpoint('rec-a', 1, video, 15_040)),
    session.addCheckpoint(checkpoint('rec-b', 0, sound, 4_000, 'audio')),
    session.addCheckpoint(checkpoint('rec-a', 2, video, 22_560)),
    session.add(closed('file:///s/incoming/rec-a.mp4', 'video', 'rec-a', 0)),
    session.add(closed('file:///s/incoming/rec-b.aac', 'audio', 'rec-b', 1)),
  ]);
  const id = session.id!;
  const state = locker.store.readSession(id)!;
  const deviceKey = mergeDeviceKey(
    {
      keyId: key.keyId,
      publicKeySpki: Buffer.from(key.spki).toString('base64'),
      platform: 'ios',
      storage: 'secure-enclave',
      attestation: null,
      attestationError: 'not attested in this test',
    },
    null,
    new Date('2026-11-05T05:00:00.000Z'),
  );
  const records: BundledRecord[] = state.items.map((item) => ({
    record: JSON.parse(locker.records.get(`${id}/${item.record!.file}`)!.body) as EvidenceRecord,
    recordFile: item.record!.file,
    mediaFile: item.media,
    recordSha256: item.recordSha256!,
  }));
  const checkpoints: BundledCheckpoint[] = state.checkpoints!.map((item) => ({
    record: JSON.parse(locker.records.get(`${id}/${item.record!.file}`)!.body) as CheckpointRecord,
    recordFile: item.record!.file,
    recordSha256: item.recordSha256!,
  }));
  return { locker, id, state, deviceKey, records, checkpoints };
}

async function bundleFolder(options: Parameters<typeof makeSession>[0] = {}, change?: (files: Map<string, Uint8Array>) => void) {
  const ctx = await makeSession(options);
  const { locker, id, state, deviceKey, records, checkpoints } = ctx;
  const now = new Date('2026-11-05T06:00:00.000Z');
  const enc = (s: string) => new TextEncoder().encode(s);
  const files = new Map<string, Uint8Array>();
  files.set('manifest.json', enc(JSON.stringify(buildManifest(state, records, now, app, false, checkpoints), null, 2)));
  files.set('device-key.json', enc(JSON.stringify(deviceKey, null, 2)));
  for (const item of state.items) files.set(`media/${item.media}`, locker.files.get(locker.store.mediaUri(id, item.media))!);
  for (const name of [...state.items.map((i) => i.record!.file), ...state.checkpoints!.map((c) => c.record!.file)]) {
    const stored = locker.records.get(`${id}/${name}`)!;
    files.set(`records/${name}`, enc(stored.body));
    files.set(`records/${name}.sig`, stored.signature);
  }
  files.set('hash-report.txt', enc(hashReport(state, records, deviceKey, now, 0, checkpoints)));
  files.set('README.txt', enc(README));
  change?.(files);
  const dir = mkdtempSync(join(tmpdir(), 'saakshi-checkpoints-'));
  cleanup.push(dir);
  for (const [name, bytes] of files) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), bytes);
  }
  return { ...ctx, dir, files };
}

function runVerifier(path: string) {
  const result = spawnSync('node', [VERIFY, path], { encoding: 'utf8' });
  return { code: result.status, out: result.stdout + result.stderr };
}

const cleanup: string[] = [];
afterAll(() => cleanup.forEach((d) => rmSync(d, { recursive: true, force: true })));

describe('checkpoints in the chain (format 0.5)', () => {
  it('seals checkpoints and files in the order they came, each chained to the one before', async () => {
    const { state, records, checkpoints } = await makeSession();
    expect(state.checkpoints!.map((c) => [c.sequence, c.recording, c.index])).toEqual([
      [0, 'rec-a', 0],
      [1, 'rec-a', 1],
      [2, 'rec-b', 0],
      [3, 'rec-a', 2],
    ]);
    expect(state.items.map((i) => [i.sequence, i.recording, i.media])).toEqual([
      [4, 'rec-a', '0004-clip0-seg0.mp4'],
      [5, 'rec-b', '0005-audio1-seg0.aac'],
    ]);
    const first = checkpoints[0].record;
    expect(first.type).toBe('saakshi.evidence.checkpoint');
    expect(first.version).toBe('0.5');
    expect(first.previous).toBeNull();
    expect(first.file).toEqual({ mediaType: 'video/mp4', size: 7_520, sha256: state.checkpoints![0].sha256 });
    expect(first.capture.checkpointAt).toBe('2026-11-05T05:10:10.000Z');
    // The video's record follows the last checkpoint (of either file) and names its recording.
    const videoRecord = records[0].record;
    expect(videoRecord.recording).toBe('rec-a');
    expect(videoRecord.previous).toEqual({
      id: checkpoints[3].record.id,
      recordSha256: checkpoints[3].recordSha256,
      fileSha256: checkpoints[3].record.file.sha256,
    });
    expect(chainHead(records, checkpoints)).toBe(records[1].recordSha256);
  });

  it('passes the on-phone check, checkpoints included', async () => {
    const { locker, id, state } = await makeSession();
    const inputs = [
      ...state.items.map((item) => ({
        sequence: item.sequence,
        body: locker.records.get(`${id}/${item.record!.file}`)!.body,
        bodySha256: item.recordSha256!,
        sealedRecordSha256: item.recordSha256,
        file: { size: item.digests!.size, sha256: item.digests!.sha256 },
      })),
      ...state.checkpoints!.map((c) => ({
        sequence: c.sequence,
        kind: 'checkpoint' as const,
        body: locker.records.get(`${id}/${c.record!.file}`)!.body,
        bodySha256: c.recordSha256!,
        sealedRecordSha256: c.recordSha256,
        file: null,
      })),
    ];
    expect(checkSession(inputs)).toEqual([]);
  });

  it('verifies: every checkpoint matches the first bytes of its file', async () => {
    const { dir, records, files } = await bundleFolder();
    const { code, out } = runVerifier(dir);
    expect(out).toContain('OK: signatures, files, checkpoints and chain check out.');
    expect(out).toContain('Records: 6 (4 of them checkpoints)');
    expect(out).toContain(`Chain head: ${records[1].recordSha256}`);
    expect(code).toBe(0);
    const report = new TextDecoder().decode(files.get('hash-report.txt'));
    expect(report).toContain('Checkpoints:     3 signed while it was being recorded (records/0000.json to records/0003.json);');
    expect(report).toContain('covers its first 22,560 bytes');
    const manifest = JSON.parse(new TextDecoder().decode(files.get('manifest.json')));
    expect(manifest.version).toBe('0.5');
    expect(manifest.checkpoints).toHaveLength(4);
    expect(manifest.checkpoints[0]).toMatchObject({ record: 'records/0000.json', recording: 'rec-a', checkpoint: 0, size: 7_520 });
  });

  it('still verifies when one checkpoint could not be signed: the next one covers its bytes', async () => {
    const { dir, state } = await bundleFolder({ failCheckpoint: 1 });
    expect(state.checkpoints!.map((c) => [c.sequence, c.recording, c.index])).toEqual([
      [0, 'rec-a', 0],
      [1, 'rec-b', 0],
      [2, 'rec-a', 2],
    ]);
    const { code, out } = runVerifier(dir);
    expect(out).toContain('OK: signatures, files, checkpoints and chain check out.');
    expect(code).toBe(0);
  });

  it('catches a byte changed inside a checkpointed stretch', async () => {
    const { dir } = await bundleFolder({}, (files) => {
      const name = 'media/0004-clip0-seg0.mp4';
      const bytes = new Uint8Array(files.get(name)!);
      bytes[100] ^= 0xff;
      files.set(name, bytes);
    });
    const { code, out } = runVerifier(dir);
    expect(code).toBe(1);
    expect(out).toMatch(/records\/0000\.json: the first 7520 bytes of media\/0004-clip0-seg0\.mp4 have SHA-256 [0-9a-f]{64}, not/);
    expect(out).toMatch(/records\/0003\.json: the first 22560 bytes/);
  });

  it('catches a file shorter than what its checkpoints signed', async () => {
    // As if the recorder had rewritten the file after the checkpoints: it is now 20,000 bytes.
    const { dir } = await bundleFolder({ videoLength: 20_000 });
    const { code, out } = runVerifier(dir);
    expect(code).toBe(1);
    expect(out).toContain('records/0003.json: covers 22560 bytes, but media/0004-clip0-seg0.mp4 has only 20000');
  });

  it('catches a missing checkpoint record', async () => {
    const { dir } = await bundleFolder({}, (files) => {
      files.delete('records/0001.json');
      files.delete('records/0001.json.sig');
    });
    const { code, out } = runVerifier(dir);
    expect(code).toBe(1);
    // The chain shows the gap; the checkpoints themselves still rise.
    expect(out).toContain('a record is missing or out of order');
    expect(out).not.toContain('comes after checkpoint');
  });

  it("catches checkpoints whose file's record is missing", async () => {
    const { dir } = await bundleFolder({}, (files) => {
      files.delete('records/0005.json');
      files.delete('records/0005.json.sig');
      files.delete('media/0005-audio1-seg0.aac');
    });
    const { code, out } = runVerifier(dir);
    expect(code).toBe(1);
    expect(out).toContain("records/0002.json: checkpoint of recording rec-b, whose file's record is not in the bundle");
  });
});
