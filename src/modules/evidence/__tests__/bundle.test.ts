import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, generateKeyPairSync } from 'node:crypto';
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
    expect(out).toContain(
      'FAIL Signed records/0001 video 1.json: manifest.json names its file "Original files/2026-10-20 14-32-03 IST video 2.mp4", but from the signed record it is "Original files/2026-10-20 14-32-03 IST video 1.mp4"',
    );
  });

  describe('a file put where a record\'s file should be (format 0.8)', () => {
    const name = 'Original files/2026-10-20 14-32-03 IST video 1.mp4';
    const doctored = (bytes: Uint8Array) => {
      const copy = bytes.slice();
      copy[100] ^= 1;
      return copy;
    };
    /** Plain stored entries and their central directory, as a hand-made ZIP's parts. */
    const rawZip = (entries: [string, Uint8Array][], base = 0) => {
      const locals: Buffer[] = [];
      const directory: Buffer[] = [];
      let offset = 0;
      for (const [entryName, data] of entries) {
        const nameBytes = Buffer.from(entryName, 'utf8');
        const crc = crc32(data) >>> 0;
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(0x0800, 6);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(data.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(nameBytes.length, 26);
        locals.push(local, nameBytes, Buffer.from(data));
        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(0x0800, 8);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(data.length, 20);
        central.writeUInt32LE(data.length, 24);
        central.writeUInt16LE(nameBytes.length, 28);
        central.writeUInt32LE(base + offset, 42);
        directory.push(central, nameBytes);
        offset += 30 + nameBytes.length + data.length;
      }
      return { locals: Buffer.concat(locals), directory: Buffer.concat(directory), count: entries.length };
    };
    const endRecord = (count: number, size: number, offset: number) => {
      const end = Buffer.alloc(22);
      end.writeUInt32LE(0x06054b50, 0);
      end.writeUInt16LE(count, 8);
      end.writeUInt16LE(count, 10);
      end.writeUInt32LE(size, 12);
      end.writeUInt32LE(offset, 16);
      return end;
    };
    const edit = (files: Map<string, Uint8Array>, change: (manifest: { records: { record: string; media: string }[] }) => void) => {
      const manifest = JSON.parse(new TextDecoder().decode(files.get('manifest.json')!));
      change(manifest);
      files.set('manifest.json', new TextEncoder().encode(JSON.stringify(manifest)));
    };
    const doctor = (files: Map<string, Uint8Array>) => {
      const changed = files.get(name)!.slice();
      changed[100] ^= 1;
      files.set(name, changed);
    };

    it('catches a doctored file at the readable name, with the genuine one hidden and named in the manifest', async () => {
      const { files } = await bundleFiles();
      const genuine = files.get(name)!;
      doctor(files);
      files.set('Original files/genuine.bin', genuine);
      edit(files, (m) => void (m.records[1].media = 'Original files/genuine.bin'));
      const folder = writeFolder(files);
      cleanup.push(folder);
      const { code, out } = runVerifier(folder);
      expect(code).toBe(1);
      // The file at the readable name is the one checked, whatever the manifest says.
      expect(out).toMatch(new RegExp(`FAIL ${name}: SHA-256 [0-9a-f]{64} differs from its record`));
      expect(out).toContain('FAIL Original files/genuine.bin: no signed record in this bundle vouches for this file');
    });

    it('catches a manifest that names a file outside the bundle, or in another folder', async () => {
      const { files } = await bundleFiles();
      const genuine = files.get(name)!;
      doctor(files);
      for (const media of ['../outside-genuine.bin', '.hidden/g.bin', 'media/0001-clip0-seg0.mp4', 'Original files/../manifest.json']) {
        const copy = new Map(files);
        edit(copy, (m) => void (m.records[1].media = media));
        const dir = writeFolder(copy);
        // The genuine file, beside the folder: a reader must not go there.
        writeFileSync(join(dir, '..', 'outside-genuine.bin'), genuine);
        cleanup.push(dir, join(dir, '..', 'outside-genuine.bin'));
        const { code, out } = runVerifier(dir);
        expect(code).toBe(1);
        expect(out).toContain(`FAIL Signed records/0001 video 1.json: manifest.json names its file ${JSON.stringify(media)}, but from the signed record it is "${name}"`);
        expect(out).toMatch(new RegExp(`FAIL ${name}: SHA-256 [0-9a-f]{64} differs from its record`));
      }
    });

    it('catches a record left out of the manifest, and one file named for two records', async () => {
      const { files } = await bundleFiles();
      const missing = new Map(files);
      edit(missing, (m) => void (m.records = m.records.filter((r) => r.record !== 'Signed records/0001 video 1.json')));
      const twice = new Map(files);
      edit(twice, (m) => void (m.records[2].media = m.records[1].media));
      const a = writeFolder(missing);
      const b = writeFolder(twice);
      cleanup.push(a, b);
      expect(runVerifier(a).out).toContain('FAIL Signed records/0001 video 1.json: manifest.json doesn\'t say which file in "Original files/" is this record\'s');
      expect(runVerifier(b).out).toContain(`FAIL Signed records/0002 video 2.json: manifest.json names its file "${name}"`);
    });

    it('catches a readable name that the signed record doesn\'t give, even with the manifest changed to match', async () => {
      const { files } = await bundleFiles();
      const renamed = 'Original files/2026-10-20 09-00-00 IST video 1.mp4';
      files.set(renamed, files.get(name)!);
      files.delete(name);
      edit(files, (m) => void (m.records[1].media = renamed));
      const folder = writeFolder(files);
      cleanup.push(folder);
      const { code, out } = runVerifier(folder);
      expect(code).toBe(1);
      expect(out).toContain(`FAIL Signed records/0001 video 1.json: manifest.json names its file "${renamed}", but from the signed record it is "${name}"`);
      expect(out).toContain(`FAIL ${renamed}: no signed record in this bundle vouches for this file`);

      // A record's own name is checked the same way.
      const { files: again } = await bundleFiles();
      again.set('Signed records/0001 video 3.json', again.get('Signed records/0001 video 1.json')!);
      again.set('Signed records/0001 video 3.json.sig', again.get('Signed records/0001 video 1.json.sig')!);
      again.delete('Signed records/0001 video 1.json');
      again.delete('Signed records/0001 video 1.json.sig');
      const dir = writeFolder(again);
      cleanup.push(dir);
      expect(runVerifier(dir).out).toContain('FAIL Signed records/0001 video 3.json: from its signed contents its name should be "Signed records/0001 video 1.json"');
    });

    it('catches a copy outside the folders, in a look-alike folder or at the top', async () => {
      for (const where of ['ORIGINAL FILES/x.mp4', '\u041eriginal files/x.mp4', 'Original files /x.mp4', 'Original\u00a0files/x.mp4', 'video 1.mp4', 'Original files/sub/x.mp4']) {
        const { files } = await bundleFiles();
        const copy = files.get(name)!.slice();
        copy[100] ^= 1;
        files.set(where, copy);
        const zip = await writeZipFile(files);
        cleanup.push(zip.dir);
        const { code, out } = runVerifier(zip.path);
        expect(code).toBe(1);
        expect(out).toContain(`FAIL ${where}: not part of a Saakshi bundle`);
      }
    });

    it('catches names a computer would treat as one, and a name in the ZIP twice', async () => {
      const { files } = await bundleFiles();
      const doctored = files.get(name)!.slice();
      doctored[100] ^= 1;
      // On a Mac or Windows PC these land on the same file.
      files.set(name.replace('video 1', 'VIDEO 1'), doctored);
      const zip = await writeZipFile(files);
      cleanup.push(zip.dir);
      expect(runVerifier(zip.path).out).toContain('a computer may treat these names as the same');

      // The writer is asked for the doctored copy first and the genuine one last.
      const { files: clean } = await bundleFiles();
      const dir = mkdtempSync(join(tmpdir(), 'saakshi-twice-'));
      const path = join(dir, 'twice.zip');
      cleanup.push(dir);
      const fd = openSync(path, 'w');
      const modified = new Date(2026, 9, 20, 15, 45);
      const entries = [...clean].map(([n, b]) => bytesEntry(n, b, modified));
      await writeZip({ write: async (b) => void writeSync(fd, b) }, [bytesEntry(name, doctored, modified), ...entries]);
      closeSync(fd);
      const { code, out } = runVerifier(path);
      expect(code).toBe(1);
      expect(out).toContain(`FAIL ${name}: in the ZIP twice`);
    });

    it('refuses ZIP tricks that would unpack a doctored copy at the readable name', async () => {
      const { files } = await bundleFiles();
      const doctored = files.get(name)!.slice();
      doctored[100] ^= 1;
      const modified = new Date(2026, 9, 20, 15, 45);
      const zipOf = async (extra: [string, Uint8Array][], patch?: (bytes: Buffer) => Buffer) => {
        const dir = mkdtempSync(join(tmpdir(), 'saakshi-trick-'));
        cleanup.push(dir);
        const path = join(dir, 'trick.zip');
        const chunks: Uint8Array[] = [];
        await writeZip({ write: async (b) => void chunks.push(b) }, [...files, ...extra].map(([n, b]) => bytesEntry(n, b, modified)));
        const bytes = Buffer.concat(chunks);
        writeFileSync(path, patch ? patch(bytes) : bytes);
        return runVerifier(path);
      };

      // "." segments, which unzip tools drop.
      for (const trick of [`./${name}`, name.replace('/', '/./')]) {
        const { code, out } = await zipOf([[trick, doctored]]);
        expect(code).toBe(1);
        expect(out).toContain(`FAIL ${JSON.stringify(trick)}: not a plain name inside the bundle`);
      }

      // A local header naming the readable name, on an entry the central directory names otherwise.
      const decoy = `__MACOSX/${'x'.repeat(Buffer.byteLength(name) - 9)}`;
      const shadow = await zipOf([[decoy, doctored]], (bytes) => {
        const at = bytes.indexOf(Buffer.from(decoy));
        Buffer.from(name).copy(bytes, at);
        return bytes;
      });
      expect(shadow.code).toBe(1);
      expect(shadow.out).toContain(`FAIL ${decoy}: its local header names it ${JSON.stringify(name)}`);

      // An entry marked as a Unix symbolic link (made by Unix, mode 0120777).
      const link = await zipOf([], (bytes) => {
        const at = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
        bytes.writeUInt8(3, at + 5);
        bytes.writeUInt32LE((0o120777 << 16) >>> 0, at + 38);
        return bytes;
      });
      expect(link.code).toBe(1);
      expect(link.out).toContain('a symbolic link, which a Saakshi bundle never holds');
    });

    it('refuses a ZIP whose end could lead unzip tools to another archive inside it', async () => {
      const { files } = await bundleFiles();
      const bad = [...files].map(([n, b]) => [n, n === name ? doctored(b) : b] as [string, Uint8Array]);
      const save = (bytes: Buffer) => {
        const dir = mkdtempSync(join(tmpdir(), 'saakshi-end-'));
        cleanup.push(dir);
        writeFileSync(join(dir, 'end.zip'), bytes);
        return runVerifier(join(dir, 'end.zip'));
      };
      const good = rawZip([...files]);

      // A second, doctored archive after the checked directory; the end record points at the first.
      const second = rawZip(bad, good.locals.length + good.directory.length);
      const after = save(Buffer.concat([good.locals, good.directory, second.locals, second.directory, endRecord(good.count, good.directory.length, good.locals.length)]));
      expect(after.code).toBe(1);
      expect(after.out).toContain('the central directory ends at byte');

      // A ZIP64 record that points at the doctored archive, which Python's zipfile would follow.
      const base = good.locals.length + good.directory.length;
      const other = rawZip(bad, base);
      const recordAt = base + other.locals.length + other.directory.length;
      const record = Buffer.alloc(56);
      record.writeUInt32LE(0x06064b50, 0);
      record.writeBigUInt64LE(44n, 4);
      record.writeBigUInt64LE(BigInt(other.count), 24);
      record.writeBigUInt64LE(BigInt(other.count), 32);
      record.writeBigUInt64LE(BigInt(other.directory.length), 40);
      record.writeBigUInt64LE(BigInt(base + other.locals.length), 48);
      const locator = Buffer.alloc(20);
      locator.writeUInt32LE(0x07064b50, 0);
      locator.writeBigUInt64LE(BigInt(recordAt), 8);
      locator.writeUInt32LE(1, 16);
      const zip64 = save(Buffer.concat([good.locals, good.directory, other.locals, other.directory, record, locator, endRecord(good.count, good.directory.length, good.locals.length)]));
      expect(zip64.code).toBe(1);
      expect(zip64.out).toContain("the ZIP64 record and the ZIP's end record disagree");

      // One more entry in the directory than the end record counts.
      const extra = rawZip([[name, doctored(files.get(name)!)]], good.locals.length + good.directory.length + 0);
      const fixed = rawZip([[name, doctored(files.get(name)!)]], good.locals.length + good.directory.length + extra.directory.length);
      const counted = save(
        Buffer.concat([good.locals, good.directory, fixed.directory, fixed.locals, endRecord(good.count, good.directory.length + fixed.directory.length, good.locals.length)]),
      );
      expect(counted.code).toBe(1);
      expect(counted.out).toContain(`bytes more than its ${good.count} entries`);

      // The app's own ZIPs, classic and ZIP64, pass.
      for (const forceZip64 of [false, true]) {
        const chunks: Uint8Array[] = [];
        await writeZip({ write: async (b) => void chunks.push(b.slice()) }, [...files].map(([n, b]) => bytesEntry(n, b, new Date(2026, 9, 20))), { forceZip64 });
        expect(save(Buffer.concat(chunks)).code).toBe(0);
      }
    });

    it('refuses the Unicode Path extra field, which some unzip tools take as the name', async () => {
      const { files } = await bundleFiles();
      const folder = writeFolder(files);
      const dir = mkdtempSync(join(tmpdir(), 'saakshi-upath-'));
      cleanup.push(folder, dir);
      const path = join(dir, 'upath.zip');
      // Python's zipfile writes the bundle again, stored, with a 0x7075 field on one extra entry.
      const script = [
        'import os, struct, sys, zipfile, zlib',
        'src, out, target = sys.argv[1], sys.argv[2], sys.argv[3].encode()',
        'with zipfile.ZipFile(out, "w", zipfile.ZIP_STORED) as z:',
        '    for root, _, names in sorted(os.walk(src)):',
        '        for n in sorted(names):',
        '            full = os.path.join(root, n)',
        '            z.write(full, os.path.relpath(full, src))',
        '    info = zipfile.ZipInfo("__MACOSX/evil.bin")',
        '    info.extra = struct.pack("<HHBI", 0x7075, 5 + len(target), 1, zlib.crc32(b"__MACOSX/evil.bin")) + target',
        '    z.writestr(info, b"doctored")',
      ].join('\n');
      const made = spawnSync('python3', ['-I', '-c', script, folder, path, name], { encoding: 'utf8' });
      expect(made.stderr).toBe('');
      const { code, out } = runVerifier(path);
      expect(code).toBe(1);
      expect(out).toContain('FAIL __MACOSX/evil.bin: has an extra field (0x7075) that some unzip tools read as another name');
    });

    it('checks a key.pem left in the bundle', async () => {
      const { files } = await bundleFiles();
      // Someone else's key, which would make a forged record print "Verified OK" by hand.
      const other = generateKeyPairSync('ec', { namedCurve: 'P-256' }).publicKey.export({ type: 'spki', format: 'pem' });
      files.set('key.pem', new TextEncoder().encode(String(other)));
      const folder = writeFolder(files);
      cleanup.push(folder);
      const { code, out } = runVerifier(folder);
      expect(code).toBe(1);
      expect(out).toContain('FAIL key.pem: not the public key in device-key.json');
    });

    it('lets the reader keep key.pem in the folder, as the README asks', async () => {
      const { files, deviceKey } = await bundleFiles();
      files.set('key.pem', new TextEncoder().encode(deviceKey.publicKeyPem));
      const folder = writeFolder(files);
      cleanup.push(folder);
      expect(runVerifier(folder).code).toBe(0);
    });

    it('catches a stray record, and ignores what a computer adds when unzipping', async () => {
      const { files } = await bundleFiles();
      const stray = new Map(files);
      stray.set('Signed records/0009 video 9.json', new TextEncoder().encode('{}'));
      const mac = new Map(files);
      mac.set('Original files/.DS_Store', new Uint8Array([1]));
      mac.set('__MACOSX/Signed records/._0001 video 1.json', new Uint8Array([1]));
      const a = writeFolder(stray);
      const b = writeFolder(mac);
      cleanup.push(a, b);
      expect(runVerifier(a).code).toBe(1);
      const ok = runVerifier(b);
      expect(ok.out).toContain('OK: signatures, files, checkpoints and chain check out.');
      expect(ok.out).toContain(`Checked ${name} against Signed records/0001 video 1.json`);
      expect(ok.out).toContain('cannot tell whether the last records were taken off the end');
    });
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
    expect(manifest).toMatchObject({ version: '0.11', session: state.id, name: '2026-10-20 14-32 IST Camera', certificate: null });
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
