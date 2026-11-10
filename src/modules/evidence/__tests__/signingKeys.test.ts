import { spawnSync } from 'node:child_process';
import { createHash, generateKeyPairSync, type KeyObject, sign } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { NativeDeviceKey } from '@native/saakshi-evidence';

import { CaptureSession, type PipelineDeps } from '../capture/pipeline';
import { recoverPending } from '../capture/recover';
import { planBundle } from '../export/plan';
import { crc32 } from '../export/zip';
import { attestIfNeeded, type DeviceKeyFile, deviceSigner, ensureDeviceKey, type KeyHardware, keysThatSigned, readKeyFile } from '../integrity/deviceKey';
import type { CheckpointRecord, EvidenceRecord } from '../integrity/record';
import { createCheckpointSealer, createSealer, type SealerDeps } from '../integrity/seal';
import { markInactive } from '../locker/active';
import type { CheckpointInput, ClosedFile, FileDigests } from '../types';
import { memoryLocker } from './memoryLocker';
import { nodeSha256Hex } from './testSigner';

/** Repair round A, group 3: one file per signing key, never overwritten. */

const VERIFY = join(__dirname, '../../../../tools/verify-bundle.mjs');
const app = { id: 'in.aayushtainwala.saakshi', version: '1.0.0', build: '1' };
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const location = { status: 'denied' as const, fix: null };
const dec = (bytes: Uint8Array | undefined) => new TextDecoder().decode(bytes);
const appAttest = { format: 'apple-app-attest', keyId: 'aa', attestationObject: 'obj', clientDataHash: 'cdh' } as const;

function digestsOf(bytes: Uint8Array): FileDigests {
  const h = (a: string) => createHash(a).update(bytes).digest('hex');
  return { size: bytes.length, sha256: h('sha256'), sha1: h('sha1'), md5: h('md5'), crc32: crc32(bytes) };
}

const growing = (length: number, seed: number) => new Uint8Array(length).map((_, i) => (i * seed + (i >> 7)) % 256);

/**
 * The phone's security hardware, with real ES256 keys from Node. `lose()` takes the key away, as
 * when the app's files arrive on a new phone, whose hardware has never held it.
 */
function chip(platform: NativeDeviceKey['platform'] = 'ios') {
  let current: { privateKey: KeyObject; key: NativeDeviceKey } | null = null;
  let made = 0;
  const make = () => {
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const spki = publicKey.export({ type: 'spki', format: 'der' });
    made++;
    return {
      privateKey,
      key: {
        keyId: createHash('sha256').update(spki).digest('hex'),
        publicKeySpki: Buffer.from(spki).toString('base64'),
        platform,
        storage: platform === 'ios' ? ('secure-enclave' as const) : ('tee' as const),
        attestation: null,
        attestationError: 'not attested in this test',
      },
    };
  };
  let attestFails = false;
  const hardware: KeyHardware = {
    getDeviceKey: async () => current?.key ?? null,
    createDeviceKey: async () => (current ??= make()).key,
    attestDeviceKey: async () => {
      if (attestFails) throw new Error('no internet');
      return appAttest;
    },
    signUtf8: async (message) => {
      if (!current) throw new Error('No device key');
      return Buffer.from(sign('sha256', Buffer.from(message, 'utf8'), current.privateKey)).toString('base64');
    },
  };
  return {
    hardware,
    lose: () => void (current = null),
    failAttest: (on: boolean) => void (attestFails = on),
    get keyId() {
      return current?.key.keyId ?? null;
    },
    get made() {
      return made;
    },
  };
}

function setup(platform: NativeDeviceKey['platform'] = 'ios') {
  const files = new Map<string, Uint8Array>();
  const locker = memoryLocker(files);
  const phone = chip(platform);
  let ids = 0;
  let clock = Date.parse('2026-11-05T05:00:00.000Z');
  const newId = () => `00000000-0000-4000-8000-${String(ids++).padStart(12, '0')}`;
  const sealer: SealerDeps = {
    store: locker.store,
    signer: deviceSigner(locker.store, phone.hardware),
    sha256Hex: nodeSha256Hex,
    newId,
    device: () => ({ manufacturer: 'Apple', brand: 'Apple', model: 'iPhone17,1', modelName: 'iPhone 16 Pro', os: 'iOS', osVersion: '26.1' }),
    app: () => app,
    timeZone: () => 'Asia/Kolkata',
  };
  const deps: PipelineDeps = {
    store: locker.store,
    now: () => new Date((clock += 60_000)),
    newId,
    hash: async (uri) => digestsOf(files.get(uri)!),
    seal: createSealer(sealer),
    sealCheckpoint: createCheckpointSealer(sealer),
  };
  let made = 0;
  /** A file ready to be sealed. */
  const file = (kind: ClosedFile['kind'] = 'video', more: Partial<ClosedFile> = {}): ClosedFile => {
    const n = made++;
    const uri = `file:///incoming/rec-${n}.${kind === 'photo' ? 'jpg' : 'mp4'}`;
    files.set(uri, growing(3000 + n * 100, 7 + n));
    return {
      uri,
      kind,
      segment: kind === 'photo' ? null : { clip: n, index: 0 },
      startedAt: new Date(Date.UTC(2026, 10, 5, 5, 10 + n, 0)),
      endedAt: new Date(Date.UTC(2026, 10, 5, 5, 10 + n, 45)),
      location,
      mode: kind === 'photo' ? 'camera' : 'body-cam',
      endReason: 'stopped',
      ...more,
    };
  };
  const keyFileBytes = (keyId: string) => files.get(`mem://locker/keys/${keyId}.json`);
  const recordsOf = (id: string) =>
    [...files.keys()]
      .filter((uri) => uri.startsWith(`mem://${id}/records/`) && uri.endsWith('.json'))
      .sort()
      .map((uri) => JSON.parse(dec(files.get(uri))) as EvidenceRecord | CheckpointRecord);
  return { files, locker, phone, deps, file, keyFileBytes, recordsOf };
}

const cleanup: string[] = [];
afterAll(() => cleanup.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** Exports the session as the app does, and runs tools/verify-bundle.mjs on the result. */
function exported(ctx: ReturnType<typeof setup>, id: string, change?: (files: Map<string, Uint8Array>) => void) {
  const plan = planBundle({ store: ctx.locker.store, id, now: new Date('2026-11-05T06:00:00.000Z'), app, certificate: null });
  const files = new Map<string, Uint8Array>();
  for (const entry of plan.entries) {
    files.set(entry.name, 'bytes' in entry ? entry.bytes : ctx.files.get(ctx.locker.store.mediaUri(id, entry.media.file))!);
  }
  change?.(files);
  const dir = mkdtempSync(join(tmpdir(), 'saakshi-keys-'));
  cleanup.push(dir);
  for (const [name, bytes] of files) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), bytes);
  }
  const result = spawnSync('node', [VERIFY, dir], { encoding: 'utf8' });
  return { files, code: result.status, out: result.stdout + result.stderr };
}

async function record(ctx: ReturnType<typeof setup>, count = 2) {
  const session = new CaptureSession(ctx.deps);
  for (let i = 0; i < count; i++) await session.add(ctx.file());
  await session.finish();
  return session.id!;
}

describe('one file per signing key', () => {
  it('keeps each key in its own file, named by its id', async () => {
    const ctx = setup();
    const file = await ensureDeviceKey(ctx.locker.store, ctx.phone.hardware);
    expect(file.keyId).toBe(ctx.phone.keyId);
    expect(ctx.locker.store.listKeyIds()).toEqual([file.keyId]);
    expect(JSON.parse(dec(ctx.keyFileBytes(file.keyId)))).toEqual(file);
    expect(file.replaces).toBeUndefined();
    // Nothing is left at the old single place.
    expect(ctx.files.has('mem://locker/device-key.json')).toBe(false);
    // Asked again (it is asked before every record), nothing is written again.
    const stamp = ctx.locker.modified.get(`mem://locker/keys/${file.keyId}.json`);
    await ensureDeviceKey(ctx.locker.store, ctx.phone.hardware);
    await ensureDeviceKey(ctx.locker.store, ctx.phone.hardware);
    expect(ctx.locker.modified.get(`mem://locker/keys/${file.keyId}.json`)).toBe(stamp);
    expect(ctx.phone.made).toBe(1);
  });

  it('leaves the first key\'s file untouched when the phone makes a second key', async () => {
    const ctx = setup();
    const first = await ensureDeviceKey(ctx.locker.store, ctx.phone.hardware);
    const before = ctx.keyFileBytes(first.keyId)!.slice();

    ctx.phone.lose();
    const second = await ensureDeviceKey(ctx.locker.store, ctx.phone.hardware);
    expect(second.keyId).not.toBe(first.keyId);
    expect(ctx.locker.store.listKeyIds().sort()).toEqual([first.keyId, second.keyId].sort());
    // Byte for byte the file it was.
    expect(ctx.keyFileBytes(first.keyId)).toEqual(before);
    expect(readKeyFile(ctx.locker.store, first.keyId)).toEqual(first);
    // The new key's file says which key it replaced.
    expect(second.replaces).toBe(first.keyId);
    expect(readKeyFile(ctx.locker.store, second.keyId)!.replaces).toBe(first.keyId);
  });

  it('writes an attestation into that key\'s own file and no other', async () => {
    const ctx = setup('ios');
    const first = await ensureDeviceKey(ctx.locker.store, ctx.phone.hardware);
    ctx.phone.lose();
    ctx.phone.failAttest(true);
    const second = await attestIfNeeded(ctx.locker.store, ctx.phone.hardware);
    expect(second.attestation).toBeNull();
    expect(second.attestationError).toBe('no internet');
    const firstBytes = ctx.keyFileBytes(first.keyId)!.slice();

    ctx.phone.failAttest(false);
    const attested = await attestIfNeeded(ctx.locker.store, ctx.phone.hardware);
    expect(attested).toMatchObject({ keyId: second.keyId, attestation: appAttest, attestationError: null, replaces: first.keyId, createdAt: second.createdAt });
    expect(readKeyFile(ctx.locker.store, second.keyId)).toEqual(attested);
    expect(ctx.keyFileBytes(first.keyId)).toEqual(firstBytes);
  });

  it('makes only one key when two recordings ask for the first key at the same moment', async () => {
    const ctx = setup();
    const [a, b] = await Promise.all([ensureDeviceKey(ctx.locker.store, ctx.phone.hardware), ensureDeviceKey(ctx.locker.store, ctx.phone.hardware)]);
    expect(a.keyId).toBe(b.keyId);
    expect(ctx.phone.made).toBe(1);
  });
});

describe('the first open after the update', () => {
  it('moves the old device-key.json to the key\'s own file and loses nothing', async () => {
    const ctx = setup();
    // As the app was before: a recording, and its key in the one device-key.json.
    const id = await record(ctx);
    const keyId = ctx.phone.keyId!;
    const old = ctx.keyFileBytes(keyId)!.slice();
    ctx.files.delete(`mem://locker/keys/${keyId}.json`);
    ctx.files.set('mem://locker/device-key.json', old);

    // The app opens after the update.
    ctx.locker.store.repair();
    expect(ctx.files.has('mem://locker/device-key.json')).toBe(false);
    expect(ctx.keyFileBytes(keyId)).toEqual(old);
    expect(ctx.locker.store.listKeyIds()).toEqual([keyId]);

    // The phone still holds that key: nothing changed, and nothing is said to have.
    const file = await ensureDeviceKey(ctx.locker.store, ctx.phone.hardware);
    expect(file.keyId).toBe(keyId);
    expect(file.replaces).toBeUndefined();
    expect(file.createdAt).toBe(JSON.parse(dec(old)).createdAt);
    expect(ctx.phone.made).toBe(1);
    expect(exported(ctx, id).code).toBe(0);
  });

  it('moves it even if the first thing asked for is a key, not the repair', async () => {
    const ctx = setup();
    const file = await ensureDeviceKey(ctx.locker.store, ctx.phone.hardware);
    const old = ctx.keyFileBytes(file.keyId)!.slice();
    ctx.files.delete(`mem://locker/keys/${file.keyId}.json`);
    ctx.files.set('mem://locker/device-key.json', old);
    expect(readKeyFile(ctx.locker.store, file.keyId)).toEqual(file);
    expect(ctx.files.has('mem://locker/device-key.json')).toBe(false);
  });

  it('keeps the old file\'s key when the phone no longer holds it, which the old way would have written over', async () => {
    const ctx = setup();
    const id = await record(ctx);
    const oldKeyId = ctx.phone.keyId!;
    const old = ctx.keyFileBytes(oldKeyId)!.slice();
    ctx.files.delete(`mem://locker/keys/${oldKeyId}.json`);
    ctx.files.set('mem://locker/device-key.json', old);

    // The files were moved to a new phone, and the app is updated there.
    ctx.phone.lose();
    const now = await ensureDeviceKey(ctx.locker.store, ctx.phone.hardware);
    expect(now.keyId).not.toBe(oldKeyId);
    expect(now.replaces).toBe(oldKeyId);
    expect(ctx.keyFileBytes(oldKeyId)).toEqual(old);
    // The old recording still exports with the key that signed it, and verifies.
    const bundle = exported(ctx, id);
    expect(bundle.code).toBe(0);
    expect(JSON.parse(dec(bundle.files.get('device-key.json'))).keyId).toBe(oldKeyId);
  });

  it('leaves an old file it cannot read where it is', () => {
    const ctx = setup();
    ctx.files.set('mem://locker/device-key.json', new TextEncoder().encode('{"keyId":'));
    ctx.locker.store.repair();
    expect(dec(ctx.files.get('mem://locker/device-key.json'))).toBe('{"keyId":');
    expect(ctx.locker.store.listKeyIds()).toEqual([]);
  });
});

describe('each recording is exported with the key that signed it', () => {
  it('exports an old recording after a key change with its own key, and it verifies', async () => {
    const ctx = setup();
    const oldId = await record(ctx);
    const oldKey = ctx.phone.keyId!;
    ctx.phone.lose();
    const newId = await record(ctx);
    const newKey = ctx.phone.keyId!;
    expect(newKey).not.toBe(oldKey);

    const old = exported(ctx, oldId);
    expect(old.out).toContain('OK: signatures, files, checkpoints and chain check out.');
    expect(old.code).toBe(0);
    expect(JSON.parse(dec(old.files.get('device-key.json'))).keyId).toBe(oldKey);
    expect([...old.files.keys()].filter((name) => name.startsWith('device-key'))).toEqual(['device-key.json']);
    expect(JSON.parse(dec(old.files.get('manifest.json'))).keys).toEqual([{ file: 'device-key.json', keyId: oldKey }]);

    const fresh = exported(ctx, newId);
    expect(fresh.code).toBe(0);
    expect(JSON.parse(dec(fresh.files.get('device-key.json')))).toMatchObject({ keyId: newKey, replaces: oldKey });
  });

  it('says in the first record a new key signs that the key changed, and only there', async () => {
    const ctx = setup();
    await record(ctx);
    const oldKey = ctx.phone.keyId!;
    ctx.phone.lose();
    const id = await record(ctx, 3);
    const newKey = ctx.phone.keyId!;

    expect(ctx.recordsOf(id).map((r) => r.key)).toEqual([
      { id: newKey, algorithm: 'ES256', replaces: oldKey },
      { id: newKey, algorithm: 'ES256' },
      { id: newKey, algorithm: 'ES256' },
    ]);
    const bundle = exported(ctx, id);
    expect(bundle.code).toBe(0);
    expect(bundle.out).toContain(`says its key ${newKey} replaced ${oldKey}, the phone's key before it`);
    // The next recording says nothing of it.
    const later = await record(ctx, 1);
    expect(ctx.recordsOf(later)[0].key).toEqual({ id: newKey, algorithm: 'ES256' });
  });

  it('does not say a key changed for the phone\'s first key', async () => {
    const ctx = setup();
    const id = await record(ctx);
    for (const r of ctx.recordsOf(id)) expect(r.key).toEqual({ id: ctx.phone.keyId, algorithm: 'ES256' });
  });

  it('refuses to make a bundle when the key that signed it has no file on the phone', async () => {
    const ctx = setup();
    const id = await record(ctx);
    ctx.files.delete(`mem://locker/keys/${ctx.phone.keyId}.json`);
    expect(() => keysThatSigned(ctx.locker.store, ctx.recordsOf(id))).toThrow('has no file on this phone');
    expect(() => planBundle({ store: ctx.locker.store, id, now: new Date(), app, certificate: null })).toThrow('has no file on this phone');
  });
});

describe('a recording that spans a key change', () => {
  const checkpoint = (index: number, bytes: Uint8Array, upTo: number): CheckpointInput => ({
    recording: 'rec-long',
    index,
    kind: 'video',
    segment: { clip: 0, index: 0 },
    mediaType: 'video/mp4',
    bytes: upTo,
    sha256: sha(bytes.subarray(0, upTo)),
    at: new Date(Date.UTC(2026, 10, 5, 5, 10, 10 * (index + 1))),
    startedAt: new Date('2026-11-05T05:10:00.000Z'),
    location,
    mode: 'body-cam',
  });

  /** The key goes while the session is being recorded: after two checkpoints and a file. */
  async function spanning() {
    const ctx = setup();
    const video = growing(20_000, 9);
    ctx.files.set('file:///incoming/long.mp4', video);
    const session = new CaptureSession(ctx.deps);
    await session.add(ctx.file('photo'));
    await session.addCheckpoint(checkpoint(0, video, 5_000));
    const oldKey = ctx.phone.keyId!;
    ctx.phone.lose();
    // Recording is not refused: the next records are signed with a new key.
    await session.addCheckpoint(checkpoint(1, video, 12_000));
    await session.add({
      uri: 'file:///incoming/long.mp4',
      kind: 'video',
      segment: { clip: 0, index: 0 },
      startedAt: new Date('2026-11-05T05:10:00.000Z'),
      endedAt: new Date('2026-11-05T05:10:45.000Z'),
      location,
      mode: 'body-cam',
      endReason: 'stopped',
      recording: 'rec-long',
    });
    await session.finish();
    return { ctx, id: session.id!, oldKey, newKey: ctx.phone.keyId! };
  }

  it('carries on, names each record\'s key, and says the change in the first record the new key signs', async () => {
    const { ctx, id, oldKey, newKey } = await spanning();
    expect(newKey).not.toBe(oldKey);
    const state = ctx.locker.store.readSession(id)!;
    expect(state.items.every((item) => item.status === 'sealed')).toBe(true);
    expect(state.checkpoints).toHaveLength(2);
    expect(ctx.recordsOf(id).map((r) => [r.sequence, r.key.id === oldKey ? 'old' : 'new', r.key.replaces ?? null])).toEqual([
      [0, 'old', null],
      [1, 'old', null],
      [2, 'new', oldKey],
      [3, 'new', null],
    ]);
  });

  it('exports with both keys, each in its own file, and verifies', async () => {
    const { ctx, id, oldKey, newKey } = await spanning();
    const bundle = exported(ctx, id);
    expect(bundle.out).toContain('OK: signatures, files, checkpoints and chain check out.');
    expect(bundle.code).toBe(0);
    expect(bundle.out).toContain(`The signing key changes at Signed records/0002 video 1 checkpoint 1.json: ${newKey} replaced ${oldKey}`);

    expect(JSON.parse(dec(bundle.files.get('device-key.json'))).keyId).toBe(oldKey);
    expect(JSON.parse(dec(bundle.files.get('device-key 2.json')))).toMatchObject({ keyId: newKey, replaces: oldKey });
    expect(JSON.parse(dec(bundle.files.get('manifest.json'))).keys).toEqual([
      { file: 'device-key.json', keyId: oldKey },
      { file: 'device-key 2.json', keyId: newKey },
    ]);
    // The papers a person reads say so too.
    const report = dec(bundle.files.get('Hash report.txt'));
    expect(report).toContain("Signing keys:     2. The phone's signing key was made again while this was recorded");
    expect(report).toContain(`device-key.json:  ${oldKey} (ES256, secure-enclave); records 0000 to 0001`);
    expect(report).toContain(`device-key 2.json:  ${newKey} (ES256, secure-enclave); records 0002 to 0003`);
    const readme = dec(bundle.files.get('README.txt'));
    expect(readme).toContain('device-key 2.json');
    expect(readme).toContain('Check each record with the key it names.');
    expect(readme).toContain('हर रिकॉर्ड को उसी की से जाँचें जिसका वह नाम लेता है।');
  });

  it('fails the check if a key\'s file is missing, swapped, or one too many', async () => {
    const { ctx, id } = await spanning();
    const missing = exported(ctx, id, (files) => void files.delete('device-key 2.json'));
    expect(missing.code).not.toBe(0);
    expect(missing.out).toContain('signed by a key that is not in the bundle');

    const swapped = exported(ctx, id, (files) => {
      const first = files.get('device-key.json')!;
      files.set('device-key.json', files.get('device-key 2.json')!);
      files.set('device-key 2.json', first);
    });
    expect(swapped.code).not.toBe(0);
    expect(swapped.out).toContain('from the signed records this key\'s file should be "device-key.json"');

    const extra = exported(ctx, id, (files) => {
      const other = generateKeyPairSync('ec', { namedCurve: 'P-256' }).publicKey;
      const spki = other.export({ type: 'spki', format: 'der' });
      const pem = other.export({ type: 'spki', format: 'pem' }) as string;
      const key = { keyId: createHash('sha256').update(spki).digest('hex'), publicKeySpki: Buffer.from(spki).toString('base64'), publicKeyPem: pem, platform: 'ios', storage: 'software' };
      files.set('device-key 3.json', new TextEncoder().encode(JSON.stringify(key)));
    });
    expect(extra.code).not.toBe(0);
    expect(extra.out).toContain('device-key 3.json: no record in this bundle is signed by this key');
  });

  it('seals a cut-off file with the new key after the recording\'s files reach a new phone', async () => {
    const ctx = setup('android');
    const video = growing(20_000, 9);
    ctx.files.set('mem://s/incoming/long.mp4', video);
    const session = new CaptureSession(ctx.deps);
    await session.addCheckpoint(checkpoint(0, video, 5_000));
    await session.addCheckpoint(checkpoint(1, video, 12_000));
    const id = session.id!;
    const oldKey = ctx.phone.keyId!;
    markInactive(id);
    ctx.locker.store.writePending(id, 'long.mp4.json', {
      file: 'mem://s/incoming/long.mp4',
      kind: 'video',
      segment: { clip: 0, index: 0 },
      startedAt: '2026-11-05T05:10:00.000Z',
      mode: 'body-cam',
      recording: 'rec-long',
    });

    // The recording was cut off; the app's files were then moved to a new phone.
    ctx.phone.lose();
    const [item] = await recoverPending(ctx.deps, {
      stat: (uri) => (ctx.files.has(uri) ? { size: ctx.files.get(uri)!.length, modifiedAt: Date.parse('2026-11-05T05:10:45.000Z') } : null),
      iosCameraFiles: () => [],
    });
    expect([item.sequence, item.status, item.interrupted]).toEqual([2, 'sealed', true]);
    const records = ctx.recordsOf(id);
    expect(records[2].key).toEqual({ id: ctx.phone.keyId, algorithm: 'ES256', replaces: oldKey });
    const bundle = exported(ctx, id);
    expect(bundle.code).toBe(0);
    expect([...bundle.files.keys()].filter((name) => name.startsWith('device-key'))).toEqual(['device-key.json', 'device-key 2.json']);
  });
});

describe('the key file in a bundle', () => {
  it('is the key\'s own file as kept on the phone', async () => {
    const ctx = setup('android');
    const id = await record(ctx);
    const bundle = exported(ctx, id);
    const inBundle = JSON.parse(dec(bundle.files.get('device-key.json'))) as DeviceKeyFile;
    expect(inBundle).toEqual(readKeyFile(ctx.locker.store, ctx.phone.keyId!));
    expect(inBundle.version).toBe('0.11');
  });
});
