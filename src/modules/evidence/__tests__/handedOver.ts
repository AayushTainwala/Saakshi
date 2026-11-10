import { createHash } from 'node:crypto';

import { CaptureSession } from '../capture/pipeline';
import { crc32 } from '../export/zip';
import { mergeDeviceKey } from '../integrity/deviceKey';
import { createCheckpointSealer, createSealer, type SealerDeps } from '../integrity/seal';
import { loadCheckpoints, loadSealed } from '../locker/records';
import type { CaptureMode, CheckpointInput, ClosedFile, FileDigests, StartedFrom } from '../types';
import { memoryLocker } from './memoryLocker';
import { nodeSha256Hex, testSigner } from './testSigner';

/** For the format 0.9 tests: a Pocket recording handed over at 5%, sealed and signed. Not a test file. */
export const app = { id: 'in.aayushtainwala.saakshi', version: '1.0.0', build: '1' };
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const location = { status: 'denied' as const, fix: null };

function digestsOf(bytes: Uint8Array): FileDigests {
  const h = (a: string) => createHash(a).update(bytes).digest('hex');
  return { size: bytes.length, sha256: h('sha256'), sha1: h('sha1'), md5: h('md5'), crc32: crc32(bytes) };
}

const growing = (length: number, seed: number) => new Uint8Array(length).map((_, i) => (i * seed + (i >> 7)) % 256);

export type Options = {
  mode?: CaptureMode;
  startedFrom?: StartedFrom;
  /** What the phone says the battery is; 'throws' for a reading that fails. */
  battery?: number | null | 'throws';
  interruptedLast?: boolean;
  /** Why the first and the second file ended, instead of "low-battery" and "stopped". */
  reasons?: [NonNullable<ClosedFile['endReason']>, NonNullable<ClosedFile['endReason']>];
};

/**
 * A Pocket recording handed over at 5%: the first file closes as "low-battery" and the next file
 * of the same clip (segment index 1) carries on until Stop. Each file has a checkpoint.
 */
export async function handedOver(options: Options = {}) {
  const mode = options.mode ?? 'bug';
  const first = growing(8_000, 7);
  const second = growing(6_000, 11);
  const media = new Map<string, Uint8Array>([
    ['file:///s/incoming/bug-0-0.aac', first],
    ['file:///s/incoming/bug-0-1.aac', second],
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
    battery: async () => {
      if (options.battery === 'throws') throw new Error('no reading');
      return options.battery === undefined ? 5 : options.battery;
    },
  };
  const session = new CaptureSession({
    store: locker.store,
    now: () => new Date('2026-11-06T05:20:00.000Z'),
    newId,
    hash: async (uri) => digestsOf(media.get(uri)!),
    seal: createSealer(sealer),
    sealCheckpoint: createCheckpointSealer(sealer),
  });
  const kind = mode === 'body-cam' ? 'audio' : 'audio';
  const checkpoint = (recording: string, index: number, bytes: Uint8Array): CheckpointInput => ({
    recording,
    index: 0,
    kind,
    segment: { clip: 0, index },
    mediaType: 'audio/aac',
    bytes: 4_000,
    sha256: sha(bytes.subarray(0, 4_000)),
    at: new Date(Date.UTC(2026, 10, 6, 5, 10 + index * 5, 10)),
    startedAt: new Date(Date.UTC(2026, 10, 6, 5, 10 + index * 5, 0)),
    location,
    mode,
    ...(options.startedFrom ? { startedFrom: options.startedFrom } : {}),
  });
  const closed = (uri: string, recording: string, index: number, endReason: ClosedFile['endReason'], interrupted = false): ClosedFile => ({
    uri,
    kind,
    segment: { clip: 0, index },
    startedAt: new Date(Date.UTC(2026, 10, 6, 5, 10 + index * 5, 0)),
    endedAt: new Date(Date.UTC(2026, 10, 6, 5, 15 + index * 5, 0)),
    location,
    mode,
    endReason,
    interrupted,
    gapBeforeMs: index === 0 ? null : 0,
    recording,
    ...(options.startedFrom ? { startedFrom: options.startedFrom } : {}),
  });

  await session.addCheckpoint(checkpoint('rec-1', 0, first));
  await session.add(closed('file:///s/incoming/bug-0-0.aac', 'rec-1', 0, options.reasons?.[0] ?? 'low-battery'));
  await session.addCheckpoint(checkpoint('rec-2', 1, second));
  await session.add(closed('file:///s/incoming/bug-0-1.aac', 'rec-2', 1, options.interruptedLast ? 'interrupted' : (options.reasons?.[1] ?? 'stopped'), options.interruptedLast));
  const id = session.id!;
  const deviceKey = mergeDeviceKey(
    { keyId: key.keyId, publicKeySpki: Buffer.from(key.spki).toString('base64'), platform: 'ios', storage: 'secure-enclave', attestation: null, attestationError: 'test' },
    null,
    new Date('2026-11-06T05:00:00.000Z'),
  );
  const records = loadSealed(locker.store, id).map((entry) => entry.bundled.record);
  const checkpoints = loadCheckpoints(locker.store, id).map((entry) => entry.bundled.record);
  return { locker, id, key, deviceKey, records, checkpoints };
}

