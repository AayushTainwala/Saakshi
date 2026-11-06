import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, mkdirSync, mkdtempSync, openSync, rmSync, unlinkSync, writeFileSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { CaptureSession } from '../capture/pipeline';
import { buildManifest, type BundledRecord, bundleFileName } from '../export/contents';
import { bytesEntry, crc32, writeZip } from '../export/zip';
import { mergeDeviceKey } from '../integrity/deviceKey';
import { createSealer } from '../integrity/seal';
import { type CheckInput, checkSession } from '../locker/check';
import { loadSealed } from '../locker/records';
import type { ClosedFile, FileDigests } from '../types';
import { bundleFilesOf } from './bundleFiles';
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
  const records: BundledRecord[] = loadSealed(locker.store, id).map((entry) => entry.bundled);
  return { locker, id, state, deviceKey, records };
}

/** Lays the bundle out as the app does, as files: name → bytes. */
async function bundleFiles() {
  const ctx = await makeSession();
  const { locker, id, deviceKey } = ctx;
  const { plan, files } = bundleFilesOf(locker, id, deviceKey, new Date('2026-10-20T10:15:00.000Z'), app);
  return { ...ctx, files, plan };
}

/** The same session laid out as format 0.7 and before did: media/ and records/, the app's names. */
async function oldBundleFiles() {
  const ctx = await makeSession();
  const { locker, id, state, deviceKey, records } = ctx;
  const now = new Date('2026-10-20T10:15:00.000Z');
  const enc = (s: string) => new TextEncoder().encode(s);
  const files = new Map<string, Uint8Array>();
  // 0.7's manifest named the old paths.
  const manifest = {
    ...buildManifest(state, records, now, app, false),
    version: '0.7',
    records: records.map((r) => ({ record: `records/${r.recordFile}`, signature: `records/${r.recordFile}.sig`, media: `media/${r.mediaFile}` })),
  };
  files.set('manifest.json', enc(JSON.stringify(manifest, null, 2)));
  files.set('device-key.json', enc(JSON.stringify(deviceKey, null, 2)));
  for (const item of state.items) {
    files.set(`media/${item.media}`, locker.files.get(locker.store.mediaUri(id, item.media))!);
    const stored = locker.records.get(`${id}/${item.record!.file}`)!;
    files.set(`records/${item.record!.file}`, enc(stored.body));
    files.set(`records/${item.record!.file}.sig`, stored.signature);
  }
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

    // Standard unzip tools read the names as they are (UTF-8, with spaces), and Python's zipfile too.
    const listed = spawnSync('python3', ['-I', '-c', 'import sys, zipfile; print("\\n".join(zipfile.ZipFile(sys.argv[1]).namelist()))', zip.path], { encoding: 'utf8' });
    expect(listed.status).toBe(0);
    expect(listed.stdout.trim().split('\n')).toEqual([...files.keys()]);

    for (const path of [folder, zip.path]) {
      const { code, out } = runVerifier(path);
      expect(out).toContain('OK: signatures, files, checkpoints and chain check out.');
      expect(out).toContain(`Chain head: ${records[2].recordSha256}`);
      expect(out).toContain('Records: 3');
      expect(code).toBe(0);
    }
  });

  it('names the bundle, its folders and its files for a person to read (format 0.8)', async () => {
    const { files, plan } = await bundleFiles();
    expect(plan.fileName).toBe('Saakshi 2026-10-20 14-32 IST Camera.zip');
    expect([...files.keys()]).toEqual([
      'README.txt',
      'Hash report.txt',
      'Original files/2026-10-20 14-32-03 IST photo 1.jpg',
      'Original files/2026-10-20 14-32-03 IST video 1.mp4',
      'Original files/2026-10-20 14-32-03 IST video 2.mp4',
      'Signed records/0000 photo 1.json',
      'Signed records/0000 photo 1.json.sig',
      'Signed records/0001 video 1.json',
      'Signed records/0001 video 1.json.sig',
      'Signed records/0002 video 2.json',
      'Signed records/0002 video 2.json.sig',
      'manifest.json',
      'device-key.json',
    ]);
  });

  it('still verifies a bundle laid out as before 0.8, with or without its manifest', async () => {
    const { files, records } = await oldBundleFiles();
    const folder = writeFolder(files);
    const bare = writeFolder(new Map([...files].filter(([name]) => name !== 'manifest.json')));
    cleanup.push(folder, bare);
    for (const path of [folder, bare]) {
      const { code, out } = runVerifier(path);
      expect(out).toContain('OK: signatures, files, checkpoints and chain check out.');
      expect(out).toContain(`Chain head: ${records[2].recordSha256}`);
      expect(code).toBe(0);
    }
  });

  it('verifies with openssl as the README describes', async () => {
    const { files, deviceKey } = await bundleFiles();
    const folder = writeFolder(files);
    cleanup.push(folder);
    writeFileSync(join(folder, 'key.pem'), deviceKey.publicKeyPem);
    const out = execFileSync(
      'openssl',
      ['dgst', '-sha256', '-verify', 'key.pem', '-signature', 'Signed records/0001 video 1.json.sig', 'Signed records/0001 video 1.json'],
      { cwd: folder, encoding: 'utf8' },
    );
    expect(out.trim()).toBe('Verified OK');
    const media = files.get('Original files/2026-10-20 14-32-03 IST video 1.mp4')!;
    const record = JSON.parse(new TextDecoder().decode(files.get('Signed records/0001 video 1.json')!));
    expect(sha(media)).toBe(record.file.sha256);
    const der = execFileSync('openssl', ['pkey', '-pubin', '-in', 'key.pem', '-outform', 'DER'], { cwd: folder });
    expect(sha(der)).toBe(deviceKey.keyId);
  });

  it('catches a changed media byte', async () => {
    const { files } = await bundleFiles();
    const name = 'Original files/2026-10-20 14-32-03 IST video 1.mp4';
    const media = files.get(name)!.slice();
    media[100] ^= 1;
    files.set(name, media);
    const folder = writeFolder(files);
    cleanup.push(folder);
    const { code, out } = runVerifier(folder);
    expect(code).toBe(1);
    expect(out).toMatch(/FAIL Original files\/2026-10-20 14-32-03 IST video 1\.mp4: SHA-256 .* differs from its record/);
  });

  it('catches files swapped in the manifest', async () => {
    const { files } = await bundleFiles();
    const manifest = JSON.parse(new TextDecoder().decode(files.get('manifest.json')!));
    [manifest.records[1].media, manifest.records[2].media] = [manifest.records[2].media, manifest.records[1].media];
    files.set('manifest.json', new TextEncoder().encode(JSON.stringify(manifest)));
    const folder = writeFolder(files);
    cleanup.push(folder);
    const { code, out } = runVerifier(folder);
    expect(code).toBe(1);
    expect(out).toContain('FAIL Original files/2026-10-20 14-32-03 IST video 2.mp4: size differs from its record');
  });

  it('catches a removed segment', async () => {
    const { files } = await bundleFiles();
    const folder = writeFolder(files);
    cleanup.push(folder);
    unlinkSync(join(folder, 'Signed records/0001 video 1.json'));
    unlinkSync(join(folder, 'Signed records/0001 video 1.json.sig'));
    const { code, out } = runVerifier(folder);
    expect(code).toBe(1);
    expect(out).toContain('manifest.json lists Signed records/0001 video 1.json, which is not in the bundle');
    expect(out).toContain('Signed records/0002 video 2.json: sequence 2, expected 1');
    expect(out).toContain('Signed records/0002 video 2.json: does not chain to the record before it');
  });

  it('catches an edited record', async () => {
    const { files } = await bundleFiles();
    const name = 'Signed records/0000 photo 1.json';
    const body = new TextDecoder().decode(files.get(name)!);
    files.set(name, new TextEncoder().encode(body.replace('19.076', '19.077')));
    const folder = writeFolder(files);
    cleanup.push(folder);
    const { code, out } = runVerifier(folder);
    expect(code).toBe(1);
    expect(out).toContain('Signed records/0000 photo 1.json: signature does not verify');
    expect(out).toContain('Signed records/0001 video 1.json: does not chain to the record before it');
  });

  it('writes a readable hash report and a manifest that match the records', async () => {
    const { files, records, state } = await bundleFiles();
    const report = new TextDecoder().decode(files.get('Hash report.txt')!);
    expect(report).toContain('Record:           2026-10-20 14-32 IST Camera');
    expect(report).toContain('Device:           Google Pixel 8, Android 15');
    expect(report).toContain('Key attestation:  Android Key Attestation, 3 certificates');
    expect(report).toContain('0001  Original files/2026-10-20 14-32-03 IST video 1.mp4\n      Name in record:  0001-clip0-seg0.mp4');
    expect(report).toContain('Record:          Signed records/0001 video 1.json (signature Signed records/0001 video 1.json.sig)');
    expect(report).toContain('Started:         20/10/2026 14:32:03 IST\n      Ended:           20/10/2026 14:33:03 IST');
    expect(report).toContain('Place:           19.07600, 72.87770 (±13 m)');
    expect(report).toContain('Size:            70,000 bytes');
    expect(report).toContain(`SHA-256:         ${records[1].record.file.sha256}`);
    expect(report).toContain(`Chain head (SHA-256 of the last record): ${records[2].recordSha256}`);
    const manifest = JSON.parse(new TextDecoder().decode(files.get('manifest.json')!));
    expect(manifest.chainHead).toBe(records[2].recordSha256);
    expect(manifest).toMatchObject({ version: '0.8', session: state.id, name: '2026-10-20 14-32 IST Camera', certificate: null });
    expect(manifest.records[1]).toEqual({
      record: 'Signed records/0001 video 1.json',
      signature: 'Signed records/0001 video 1.json.sig',
      media: 'Original files/2026-10-20 14-32-03 IST video 1.mp4',
      recordId: records[1].record.id,
      fileName: '0001-clip0-seg0.mp4',
      recordSha256: records[1].recordSha256,
      fileSha256: records[1].record.file.sha256,
      recording: null,
    });
    expect(manifest.checkpoints).toEqual([]);
    // Named by what the records say recorded it; the session's own bookkeeping is the fallback.
    expect(bundleFileName(state, () => 'camera')).toBe('Saakshi 2026-10-20 14-32 IST Camera.zip');
  });

  it('carries a README in English and Hindi that names this bundle\'s files', async () => {
    const { files } = await bundleFiles();
    const bytes = files.get('README.txt')!;
    // A byte-order mark and Windows line ends, for Notepad.
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('\r\n');
    expect(text).not.toMatch(/[^\r]\n/);
    expect(text).toContain('Record / रिकॉर्ड: 2026-10-20 14-32 IST Camera');
    expect(text).toContain('node verify-bundle.mjs "Saakshi 2026-10-20 14-32 IST Camera.zip"');
    expect(text).toContain('-signature "Signed records/0000 photo 1.json.sig" "Signed records/0000 photo 1.json"');
    expect(text).toContain('sha256sum "Original files/2026-10-20 14-32-03 IST photo 1.jpg"');
    expect(text).toContain('वकील या विशेषज्ञ इसकी जाँच कैसे करें');
    expect(text).toContain('section 63(4)(c) of the Bharatiya Sakshya Adhiniyam, 2023');
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
