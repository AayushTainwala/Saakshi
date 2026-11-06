import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { UploadPart } from '../bodycam/parts';
import { CaptureSession } from '../capture/pipeline';
import { type BundledCheckpoint, buildManifest, type BundledRecord, hashReport, README } from '../export/contents';
import { crc32 } from '../export/zip';
import { mergeDeviceKey } from '../integrity/deviceKey';
import type { CheckpointRecord, EvidenceRecord } from '../integrity/record';
import { createCheckpointSealer, createSealer, type SealerDeps } from '../integrity/seal';
import {
  type SoundCheckpoint,
  type SoundClosed,
  type SoundHandlers,
  type SoundRecorderNative,
  soundRecorder,
  startSoundRecording,
} from '../sound/recording';
import type { FileDigests } from '../types';
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

/** A stand-in for a native sound recorder: the test fires its events. */
function fakeNative() {
  let handlers: SoundHandlers | null = null;
  const native = {
    started: [] as Parameters<SoundRecorderNative['start']>[0][],
    stopResult: [] as SoundClosed[],
    failStart: false,
    listening: 0,
    listen(next: SoundHandlers) {
      handlers = next;
      native.listening++;
      return {
        remove: () => {
          handlers = null;
          native.listening--;
        },
      };
    },
    async start(options: Parameters<SoundRecorderNative['start']>[0]) {
      if (native.failStart) throw new Error('microphone busy');
      native.started.push(options);
    },
    async stop() {
      return native.stopResult;
    },
    checkpoint: (event: SoundCheckpoint) => handlers?.checkpoint(event),
    closed: (event: SoundClosed) => handlers?.closed(event),
  };
  return native;
}

function setup() {
  const first = new Uint8Array(12_000).map((_, i) => (i * 7 + (i >> 5)) % 256);
  const second = new Uint8Array(5_000).map((_, i) => (i * 13) % 256);
  const media = new Map<string, Uint8Array>();
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
    now: () => new Date('2026-11-06T05:11:00.000Z'),
    newId,
    hash: async (uri) => digestsOf(media.get(uri)!),
    seal: createSealer(sealer),
    sealCheckpoint: createCheckpointSealer(sealer),
  });
  const native = fakeNative();
  const parts: UploadPart[] = [];
  return { first, second, media, locker, key, session, native, parts };
}

const at = (seconds: number) => new Date(Date.UTC(2026, 10, 6, 5, 10, seconds)).toISOString();

function checkpointOf(recording: string, uri: string, index: number, n: number, bytes: Uint8Array, upTo: number, startedAt: number) {
  return {
    recording,
    uri,
    clip: 0,
    index,
    checkpoint: n,
    bytes: upTo,
    sha256: sha(bytes.subarray(0, upTo)),
    at: at(startedAt + 10 * (n + 1)),
    startedAt: at(startedAt),
  };
}

const cleanup: string[] = [];
afterAll(() => cleanup.forEach((d) => rmSync(d, { recursive: true, force: true })));

describe('startSoundRecording (bug mode, one continuous file with checkpoints)', () => {
  async function record() {
    const ctx = setup();
    const { first, second, media, session, native, parts, locker } = ctx;
    const handle = await startSoundRecording({
      mode: 'bug',
      native,
      location: () => location,
      onPart: (part) => parts.push(part),
      partSeconds: () => 20,
      session,
      store: locker.store,
    });
    const id = session.id!;
    const [options] = native.started;
    const a = `${options.outputDir}/bug-0-0.aac`;
    const b = `${options.outputDir}/bug-0-1.aac`;

    // The first file, written for 30 seconds with a checkpoint every 10, then cut short by a call.
    native.checkpoint(checkpointOf('rec-a', a, 0, 0, first, 4_000, 0));
    native.checkpoint(checkpointOf('rec-a', a, 0, 1, first, 8_000, 0));
    native.checkpoint(checkpointOf('rec-a', a, 0, 2, first, 11_000, 0));
    media.set(a, first);
    native.closed({
      uri: a,
      clip: 0,
      index: 0,
      startedAt: at(0),
      endedAt: at(32),
      endReason: 'audio-interrupted',
      gapBeforeMs: null,
      recording: 'rec-a',
      finalSize: first.length,
      finalSha256: sha(first),
    });
    // After the call, a second file; Stop closes it (and also says so as an event).
    native.checkpoint(checkpointOf('rec-b', b, 1, 0, second, 3_000, 50));
    media.set(b, second);
    const closedB: SoundClosed = {
      uri: b,
      clip: 0,
      index: 1,
      startedAt: at(50),
      endedAt: at(64),
      endReason: 'stopped',
      gapBeforeMs: 18_000,
      recording: 'rec-b',
      finalSize: second.length,
      finalSha256: sha(second),
    };
    native.stopResult = [closedB];
    native.closed(closedB);
    await handle.stop();
    return { ...ctx, id, options, a, b };
  }

  it('starts the recorder in the session folder, with checkpoints every 10 seconds', async () => {
    const { native, id, options } = await record();
    expect(options).toEqual({
      outputDir: `mem://${id}/incoming`,
      pendingDir: `mem://${id}/pending`,
      clip: 0,
      checkpointSeconds: 10,
    });
    expect(native.listening).toBe(0);
  });

  it('signs each checkpoint and each file into one chain, in the order they came', async () => {
    const { locker, id } = await record();
    const state = locker.store.readSession(id)!;
    expect(state.checkpoints!.map((c) => [c.sequence, c.recording, c.index, c.bytes])).toEqual([
      [0, 'rec-a', 0, 4_000],
      [1, 'rec-a', 1, 8_000],
      [2, 'rec-a', 2, 11_000],
      [4, 'rec-b', 0, 3_000],
    ]);
    // Each file once, though the second came both as an event and from Stop.
    expect(state.items.map((i) => [i.sequence, i.recording, i.endReason, i.media, i.status])).toEqual([
      [3, 'rec-a', 'audio-interrupted', '0003-audio0-seg0.aac', 'sealed'],
      [5, 'rec-b', 'stopped', '0005-audio0-seg1.aac', 'sealed'],
    ]);
    expect(state.items.every((i) => !i.writtenMismatch)).toBe(true);
    const checkpoint = JSON.parse(locker.records.get(`${id}/${state.checkpoints![0].record!.file}`)!.body) as CheckpointRecord;
    expect(checkpoint.capture.mode).toBe('bug');
    expect(checkpoint.file.mediaType).toBe('audio/aac');
    const second = JSON.parse(locker.records.get(`${id}/${state.items[1].record!.file}`)!.body) as EvidenceRecord;
    expect(second.capture).toMatchObject({ mode: 'bug', endReason: 'stopped', gapBeforeMs: 18_000 });
    expect(second.recording).toBe('rec-b');
  });

  it('cuts upload parts that end on checkpoints and join into each file', async () => {
    const { parts, first, second } = await record();
    expect(parts.map((p) => [p.recording, p.index, p.offset, p.length, p.endsAt.checkpoint, p.final])).toEqual([
      ['rec-a', 0, 0, 8_000, 1, false],
      ['rec-a', 1, 8_000, 4_000, null, true],
      ['rec-b', 0, 0, 5_000, null, true],
    ]);
    expect(parts[0].endsAt.sha256).toBe(sha(first.subarray(0, 8_000)));
    expect(parts[1].endsAt.sha256).toBe(sha(first));
    expect(parts[2].endsAt.sha256).toBe(sha(second));
  });

  it('makes a bundle that verifies, checkpoints included', async () => {
    const { locker, id, key } = await record();
    const state = locker.store.readSession(id)!;
    const records: BundledRecord[] = state.items.map((item) => ({
      record: JSON.parse(locker.records.get(`${id}/${item.record!.file}`)!.body) as EvidenceRecord,
      recordFile: item.record!.file,
      mediaFile: item.media,
      recordSha256: item.recordSha256!,
    }));
    const checkpoints: BundledCheckpoint[] = state.checkpoints!.map((c) => ({
      record: JSON.parse(locker.records.get(`${id}/${c.record!.file}`)!.body) as CheckpointRecord,
      recordFile: c.record!.file,
      recordSha256: c.recordSha256!,
    }));
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
      new Date('2026-11-06T05:00:00.000Z'),
    );
    const now = new Date('2026-11-06T06:00:00.000Z');
    const enc = (s: string) => new TextEncoder().encode(s);
    const files = new Map<string, Uint8Array>([
      ['manifest.json', enc(JSON.stringify(buildManifest(state, records, now, app, false, checkpoints), null, 2))],
      ['device-key.json', enc(JSON.stringify(deviceKey, null, 2))],
      ['hash-report.txt', enc(hashReport(state, records, deviceKey, now, 0, checkpoints))],
      ['README.txt', enc(README)],
    ]);
    for (const item of state.items) files.set(`media/${item.media}`, locker.files.get(locker.store.mediaUri(id, item.media))!);
    for (const name of [...state.items.map((i) => i.record!.file), ...state.checkpoints!.map((c) => c.record!.file)]) {
      const stored = locker.records.get(`${id}/${name}`)!;
      files.set(`records/${name}`, enc(stored.body));
      files.set(`records/${name}.sig`, stored.signature);
    }
    const dir = mkdtempSync(join(tmpdir(), 'saakshi-sound-'));
    cleanup.push(dir);
    for (const [name, bytes] of files) {
      mkdirSync(dirname(join(dir, name)), { recursive: true });
      writeFileSync(join(dir, name), bytes);
    }
    const result = spawnSync('node', [VERIFY, dir], { encoding: 'utf8' });
    expect(result.stdout + result.stderr).toContain('OK: signatures, files, checkpoints and chain check out.');
    expect(result.stdout).toContain('Records: 6 (4 of them checkpoints)');
    expect(result.status).toBe(0);
  });

  it('gives a file closed by Stop the stop reason', async () => {
    const { session, native, media, locker } = setup();
    const handle = await startSoundRecording({ mode: 'bug', native, location: () => location, session, store: locker.store, partSeconds: () => 60 });
    const uri = `${native.started[0].outputDir}/bug-0-0.aac`;
    media.set(uri, new Uint8Array([1, 2, 3]));
    native.stopResult = [
      { uri, clip: 0, index: 0, startedAt: at(0), endedAt: at(5), endReason: 'stopped', gapBeforeMs: null, recording: 'r', finalSize: 3, finalSha256: sha(new Uint8Array([1, 2, 3])) },
    ];
    await handle.stop('low-battery');
    expect(locker.store.readSession(session.id!)!.items[0].endReason).toBe('low-battery');
  });

  it('cleans up and rethrows when the microphone cannot start', async () => {
    const { session, native, locker } = setup();
    native.failStart = true;
    await expect(
      startSoundRecording({ mode: 'bug', native, location: () => location, session, store: locker.store, partSeconds: () => 60 }),
    ).rejects.toThrow('microphone busy');
    expect(native.listening).toBe(0);
    // Nothing was recorded, so no empty session is left in the Record tab.
    expect(locker.store.listSessions()).toEqual([]);
  });

  it('has no iPhone recorder where the native module is missing (tests, Android)', () => {
    expect(soundRecorder(null)).toBeNull();
  });
});
