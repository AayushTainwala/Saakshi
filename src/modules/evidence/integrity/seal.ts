import type { SealInput, SealResult } from '../capture/pipeline';
import type { LockerStore } from '../locker/store';
import { recordFileName } from '../locker/media';
import { canonicalize } from './canonical';
import { type AppInfo, buildRecord, type DeviceInfo } from './record';

export type Signer = {
  /** Key identifier (SHA-256 of the public key's DER SubjectPublicKeyInfo). */
  keyId: string;
  /** ES256 signature, DER, over the UTF-8 bytes of `body`. */
  sign: (body: string) => Promise<Uint8Array>;
};

export type SealerDeps = {
  store: LockerStore;
  /** Returns the device key's signer, creating the key the first time. */
  signer: () => Promise<Signer>;
  sha256Hex: (text: string) => Promise<string>;
  newId: () => string;
  device: () => DeviceInfo;
  app: () => AppInfo;
  timeZone: () => string | null;
};

/**
 * Builds the record for a file, writes it in canonical form (RFC 8785), signs exactly those bytes
 * and stores the signature beside it. The record carries the previous record's hash, so the
 * session's records form a chain (docs/spec/evidence-bundle.md, section 5).
 */
export function createSealer(deps: SealerDeps) {
  return async function seal(input: SealInput): Promise<SealResult> {
    const signer = await deps.signer();
    const { item, previous } = input;
    if (previous && (!previous.record || !previous.recordSha256 || !previous.digests)) {
      throw new Error('The previous file in this session was not sealed');
    }

    const record = buildRecord({
      id: deps.newId(),
      session: input.session.id,
      sequence: item.sequence,
      segment: item.segment,
      previous: previous
        ? {
            id: previous.record!.recordId,
            recordSha256: previous.recordSha256!,
            fileSha256: previous.digests!.sha256,
          }
        : null,
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
      timeZone: deps.timeZone(),
      location: input.file.location,
      device: deps.device(),
      app: deps.app(),
      keyId: signer.keyId,
    });

    const body = canonicalize(record);
    const signature = await signer.sign(body);
    const name = recordFileName(item.sequence);
    deps.store.writeRecord(input.session.id, name, body, signature);
    return { record: { file: name, recordId: record.id }, recordSha256: await deps.sha256Hex(body) };
  };
}
