import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, mkdirSync, mkdtempSync, openSync, rmSync, unlinkSync, writeFileSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { CaptureSession } from '../capture/pipeline';
import { buildManifest, type BundledRecord, bundleFileName, hashReport, README } from '../export/contents';
import { bytesEntry, crc32, writeZip } from '../export/zip';
import { mergeDeviceKey } from '../integrity/deviceKey';
import type { EvidenceRecord } from '../integrity/record';
import { createSealer } from '../integrity/seal';
import { type CheckInput, checkSession } from '../locker/check';
import type { ClosedFile, FileDigests } from '../types';
import { memoryLocker } from './memoryLocker';
import { nodeSha256Hex, testSigner } from './testSigner';

const VERIFY = join(__dirname, '../../../../tools/verify-bundle.mjs');
const app = { id: 'in.aayushtainwala.saakshi', version: '1.0.0', build: '1' };
const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');

function digestsOf(bytes: Uint8Array): FileDigests {
  const h = (a: string) => createHash(a).update(bytes).digest('hex');
  return { size: bytes.length, sha256: h('sha256'), sha1: h('sha1'), md5: h('md5'), crc32: crc32(bytes) };
}

async function makeSession() {
  const media = new Map<string, Uint8Array>([
    ['cache://p.jpg', new Uint8Array(5000).map((_, i) => i % 256)],
    ['cache://s0.mp4', new Uint8Array(70000).map((_, i) => (i * 7) % 256)],
    ['cache://s1.mp4', new Uint8Array(12345).map((_, i) => (i * 13) % 256)],
  ]);
  const locker = memoryLocker(media);
  const key = testSigner();
  let ids = 0;
  const newId = () => `00000000-0000-4000-8000-${String(ids++).padStart(12, '0')}`;
  const session = new CaptureSession({
    store: locker.store,
    now: () => new Date('2026-10-20T09:03:04.000Z'),
    newId,
    hash: async (uri) => digestsOf(media.get(uri)!),
    seal: createSealer({
      store: locker.store,
      signer: async () => key.signer,
      sha256Hex: nodeSha256Hex,
      newId,
      device: () => ({ manufacturer: 'Google', brand: 'google', model: 'Pixel 8', modelName: null, os: 'Android', osVersion: '15' }),
      app: () => app,
      timeZone: () => 'Asia/Kolkata',
    }),
  });
  const closed = (uri: string, kind: ClosedFile['kind'], segment: ClosedFile['segment']): ClosedFile => ({
    uri,
    kind,
    segment,
    startedAt: new Date('2026-10-20T09:02:03.123Z'),
    endedAt: new Date('2026-10-20T09:03:03.140Z'),
    location: { status: 'fixed', fix: { latitude: 19.076, longitude: 72.8777, accuracyMeters: 12.5, altitudeMeters: null, fixedAt: '2026-10-20T09:02:58.002Z' } },
  });
  await Promise.all([
    session.add(closed('cache://p.jpg', 'photo', null)),
    session.add(closed('cache://s0.mp4', 'video', { clip: 0, index: 0 })),
    session.add(closed('cache://s1.mp4', 'video', { clip: 0, index: 1 })),
  ]);
  const id = session.id!;
  const state = locker.store.readSession(id)!;
  const deviceKey = mergeDeviceKey(
    {
      keyId: key.keyId,
      publicKeySpki: Buffer.from(key.spki).toString('base64'),
      platform: 'android',
      storage: 'tee',
      attestation: { format: 'android-key-attestation', certificateChain: ['leaf', 'intermediate', 'root'] },
      attestationError: null,
    },
    null,
    new Date('2026-10-20T08:59:40.511Z'),
  );
  const records: BundledRecord[] = state.items.map((item) => ({
    record: JSON.parse(locker.records.get(`${id}/${item.record!.file}`)!.body) as EvidenceRecord,
    recordFile: item.record!.file,
    mediaFile: item.media,
    recordSha256: item.recordSha256!,
  }));
  return { locker, id, state, deviceKey, records };
}

/** Lays the bundle out as files: name → bytes. */
async function bundleFiles() {
  const ctx = await makeSession();
  const { locker, id, state, deviceKey, records } = ctx;
  const now = new Date('2026-10-20T10:15:00.000Z');
  const enc = (s: string) => new TextEncoder().encode(s);
  const files = new Map<string, Uint8Array>();
  files.set('manifest.json', enc(JSON.stringify(buildManifest(state, records, now, app, false), null, 2)));
  files.set('device-key.json', enc(JSON.stringify(deviceKey, null, 2)));
  for (const item of state.items) {
    files.set(`media/${item.media}`, locker.files.get(locker.store.mediaUri(id, item.media))!);
    const stored = locker.records.get(`${id}/${item.record!.file}`)!;
    files.set(`records/${item.record!.file}`, enc(stored.body));
    files.set(`records/${item.record!.file}.sig`, stored.signature);
  }
  files.set('hash-report.txt', enc(hashReport(state, records, deviceKey, now, 0)));
  files.set('README.txt', enc(README));
  return { ...ctx, files };
}

function writeFolder(files: Map<string, Uint8Array>) {
  const dir = mkdtempSync(join(tmpdir(), 'saakshi-bundle-'));
  for (const [name, bytes] of files) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), bytes);
  }
  return dir;
}

async function writeZipFile(files: Map<string, Uint8Array>) {
  const dir = mkdtempSync(join(tmpdir(), 'saakshi-bundle-zip-'));
  const path = join(dir, 'bundle.zip');
  const fd = openSync(path, 'w');
  const modified = new Date(2026, 9, 20, 15, 45);
  await writeZip({ write: async (b) => void writeSync(fd, b) }, [...files].map(([n, b]) => bytesEntry(n, b, modified)));
  closeSync(fd);
  return { dir, path };
}

function runVerifier(path: string) {
  const result = spawnSync('node', [VERIFY, path], { encoding: 'utf8' });
  return { code: result.status, out: result.stdout + result.stderr };
}

const cleanup: string[] = [];
afterAll(() => cleanup.forEach((d) => rmSync(d, { recursive: true, force: true })));

describe('evidence bundle', () => {
  it('verifies as a ZIP and as an unzipped folder', async () => {
    const { files, records } = await bundleFiles();
    const folder = writeFolder(files);
    const zip = await writeZipFile(files);
    cleanup.push(folder, zip.dir);

    for (const path of [folder, zip.path]) {
      const { code, out } = runVerifier(path);
      expect(out).toContain('OK: signatures, files and chain check out.');
      expect(out).toContain(`Chain head: ${records[2].recordSha256}`);
      expect(out).toContain('Records: 3');
      expect(code).toBe(0);
    }
  });

  it('verifies with openssl as the spec describes', async () => {
    const { files, deviceKey } = await bundleFiles();
    const folder = writeFolder(files);
    cleanup.push(folder);
    writeFileSync(join(folder, 'key.pem'), deviceKey.publicKeyPem);
    const out = execFileSync(
      'openssl',
      ['dgst', '-sha256', '-verify', 'key.pem', '-signature', 'records/0001.json.sig', 'records/0001.json'],
      { cwd: folder, encoding: 'utf8' },
    );
    expect(out.trim()).toBe('Verified OK');
    const der = execFileSync('openssl', ['pkey', '-pubin', '-in', 'key.pem', '-outform', 'DER'], { cwd: folder });
    expect(sha(der)).toBe(deviceKey.keyId);
  });

  it('catches a changed media byte', async () => {
    const { files } = await bundleFiles();
    const media = files.get('media/0001-clip0-seg0.mp4')!.slice();
    media[100] ^= 1;
    files.set('media/0001-clip0-seg0.mp4', media);
    const folder = writeFolder(files);
    cleanup.push(folder);
    const { code, out } = runVerifier(folder);
    expect(code).toBe(1);
    expect(out).toMatch(/FAIL media\/0001-clip0-seg0.mp4: SHA-256 .* differs from its record/);
  });

  it('catches a removed segment', async () => {
    const { files } = await bundleFiles();
    const folder = writeFolder(files);
    cleanup.push(folder);
    unlinkSync(join(folder, 'records/0001.json'));
    unlinkSync(join(folder, 'records/0001.json.sig'));
    const { code, out } = runVerifier(folder);
    expect(code).toBe(1);
    expect(out).toContain('records/0002.json: sequence 2, expected 1');
    expect(out).toContain('records/0002.json: does not chain to the record before it');
  });

  it('catches an edited record', async () => {
    const { files } = await bundleFiles();
    const body = new TextDecoder().decode(files.get('records/0000.json')!);
    files.set('records/0000.json', new TextEncoder().encode(body.replace('19.076', '19.077')));
    const folder = writeFolder(files);
    cleanup.push(folder);
    const { code, out } = runVerifier(folder);
    expect(code).toBe(1);
    expect(out).toContain('records/0000.json: signature does not verify');
    expect(out).toContain('records/0001.json: does not chain to the record before it');
  });

  it('writes a readable hash report and a manifest that match the records', async () => {
    const { files, records, state } = await bundleFiles();
    const report = new TextDecoder().decode(files.get('hash-report.txt')!);
    expect(report).toContain('Device:           Google Pixel 8, Android 15');
    expect(report).toContain('Key attestation:  Android Key Attestation, 3 certificates');
    expect(report).toContain('0001  media/0001-clip0-seg0.mp4');
    expect(report).toContain('Recorded:        20/10/2026 14:32:03 IST to 20/10/2026 14:33:03 IST');
    expect(report).toContain('Place:           19.07600, 72.87770 (±13 m)');
    expect(report).toContain('Size:            70,000 bytes');
    expect(report).toContain(`SHA-256:         ${records[1].record.file.sha256}`);
    expect(report).toContain(`Chain head (SHA-256 of the last record): ${records[2].recordSha256}`);
    const manifest = JSON.parse(new TextDecoder().decode(files.get('manifest.json')!));
    expect(manifest.chainHead).toBe(records[2].recordSha256);
    expect(manifest.records[1]).toEqual({
      record: 'records/0001.json',
      signature: 'records/0001.json.sig',
      media: 'media/0001-clip0-seg0.mp4',
      recordSha256: records[1].recordSha256,
      fileSha256: records[1].record.file.sha256,
    });
    expect(bundleFileName(state)).toMatch(/^saakshi-[0-9a-f-]{8}-\d{8}-\d{4}\.zip$/);
  });
});

describe('checkSession (on the phone)', () => {
  async function inputs() {
    const { locker, id, state } = await makeSession();
    return state.items.map((item): CheckInput => {
      const body = locker.records.get(`${id}/${item.record!.file}`)!.body;
      const media = locker.files.get(locker.store.mediaUri(id, item.media))!;
      return {
        sequence: item.sequence,
        body,
        bodySha256: sha(body),
        sealedRecordSha256: item.recordSha256,
        file: { size: media.length, sha256: sha(media) },
      };
    });
  }

  it('passes an untouched session', async () => {
    expect(checkSession(await inputs())).toEqual([]);
  });

  it('reports a changed or missing file', async () => {
    const list = await inputs();
    list[0].file = { ...list[0].file!, sha256: '0'.repeat(64) };
    list[2].file = null;
    expect(checkSession(list)).toEqual([
      { sequence: 0, problem: 'file-changed' },
      { sequence: 2, problem: 'file-missing' },
    ]);
  });

  it('reports a replaced record and the broken link after it', async () => {
    const list = await inputs();
    list[1].body = list[1].body.replace('"sequence":1', '"sequence":1 ');
    list[1].bodySha256 = sha(list[1].body);
    expect(checkSession(list)).toEqual([
      { sequence: 1, problem: 'record-changed' },
      { sequence: 2, problem: 'chain-broken' },
    ]);
  });
});
