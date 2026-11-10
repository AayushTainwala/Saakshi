import type { CheckpointSealInput, SealInput, SealResult } from '../capture/pipeline';
import type { LockerStore } from '../locker/store';
import { recordFileName } from '../locker/media';
import { canonicalize } from './canonical';
import { type AppInfo, buildCheckpointRecord, buildRecord, type DeviceInfo } from './record';

export type Signer = {
  /** Key identifier (SHA-256 of the public key's DER SubjectPublicKeyInfo). */
  keyId: string;
  /** ES256 signature, DER, over the UTF-8 bytes of `body`. */
  sign: (body: string) => Promise<Uint8Array>;
  /**
   * From 0.11: this key is new, made because the phone's earlier key (this id) was gone, and no
   * signed record has said so yet. The next record says it (`key.replaces`).
   */
  replaces?: string;
  /** Called once a record saying `replaces` has been written. */
  said?: () => void;
};

/**
 * What a record says about a change of key (`key.replaces`, format 0.11): the key of the record
 * before it in the chain, if that differs from the key signing now; otherwise the phone's earlier
 * key, if this key is new and that has not been said yet.
 */
function replacedKey(signer: Signer, previousKeyId: string | null | undefined): string | undefined {
  if (previousKeyId && previousKeyId !== signer.keyId) return previousKeyId;
  return signer.replaces;
}

export type SealerDeps = {
  store: LockerStore;
  /** Returns the device key's signer, creating the key the first time. */
  signer: () => Promise<Signer>;
  sha256Hex: (text: string) => Promise<string>;
  newId: () => string;
  device: () => DeviceInfo;
  app: () => AppInfo;
  timeZone: () => string | null;
  /** The battery level now, 0-100, or null (format 0.9). Not read for a file sealed after a cut-off. */
  battery?: () => Promise<number | null>;
};

async function batteryNow(deps: SealerDeps): Promise<number | null> {
  try {
    return (await deps.battery?.()) ?? null;
  } catch {
    return null;
  }
}

/**
 * Builds the record for a file, writes it in canonical form (RFC 8785), signs exactly those bytes
 * and stores the signature beside it. The record carries the previous record's hash, so the
 * session's records form a chain (docs/spec/evidence-bundle.md, section 5).
 */
export function createSealer(deps: SealerDeps) {
  return async function seal(input: SealInput): Promise<SealResult> {
    const signer = await deps.signer();
    const { item, previous } = input;
    // The level when the file closed; for a file cut off and sealed now, nobody knows it.
    const batteryPercent = input.file.interrupted ? null : await batteryNow(deps);

    const record = buildRecord({
      id: deps.newId(),
      session: input.session.id,
      sequence: item.sequence,
      segment: item.segment,
      recording: input.file.recording ?? null,
      previous,
      fileName: item.media,
      mediaType: item.mediaType,
      digests: input.digests,
      startedAt: input.file.startedAt,
      endedAt: input.file.endedAt,
      hashedAt: input.hashedAt,
      mode: input.file.mode,
      endReason: input.file.endReason,
      interrupted: input.file.interrupted,
      gapBeforeMs: input.file.gapBeforeMs,
      rotationDegrees: input.file.rotationDegrees,
      batteryPercent,
      startedFrom: input.file.startedFrom,
      timeZone: deps.timeZone(),
      location: input.file.location,
      device: deps.device(),
      app: deps.app(),
      keyId: signer.keyId,
      keyReplaces: replacedKey(signer, input.previousKeyId),
    });

    return write(deps, input.session.id, item.sequence, record.id, canonicalize(record), signer, record.key.replaces);
  };
}

/**
 * The same for a checkpoint of a file still being written (format 0.5): a signed record of its
 * length so far and the SHA-256 of those bytes, chained like any other record.
 */
export function createCheckpointSealer(deps: SealerDeps) {
  return async function sealCheckpoint(input: CheckpointSealInput): Promise<SealResult> {
    const signer = await deps.signer();
    const { checkpoint } = input;
    const batteryPercent = await batteryNow(deps);
    const record = buildCheckpointRecord({
      id: deps.newId(),
      session: input.session.id,
      sequence: input.sequence,
      recording: checkpoint.recording,
      checkpoint: checkpoint.index,
      segment: checkpoint.segment,
      previous: input.previous,
      mediaType: checkpoint.mediaType,
      size: checkpoint.bytes,
      sha256: checkpoint.sha256,
      mode: checkpoint.mode,
      startedAt: checkpoint.startedAt,
      checkpointAt: checkpoint.at,
      batteryPercent,
      startedFrom: checkpoint.startedFrom,
      timeZone: deps.timeZone(),
      location: checkpoint.location,
      device: deps.device(),
      app: deps.app(),
      keyId: signer.keyId,
      keyReplaces: replacedKey(signer, input.previousKeyId),
    });
    return write(deps, input.session.id, input.sequence, record.id, canonicalize(record), signer, record.key.replaces);
  };
}

async function write(
  deps: SealerDeps,
  sessionId: string,
  sequence: number,
  recordId: string,
  body: string,
  signer: Signer,
  replaces: string | undefined,
): Promise<SealResult> {
  const signature = await signer.sign(body);
  const name = recordFileName(sequence);
  deps.store.writeRecord(sessionId, name, body, signature);
  // The phone's new key has now been said in a signed record.
  if (replaces && replaces === signer.replaces) signer.said?.();
  return { record: { file: name, recordId }, recordSha256: await deps.sha256Hex(body), keyId: signer.keyId };
}
