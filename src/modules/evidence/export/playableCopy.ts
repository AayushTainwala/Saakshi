import { FORMAT_VERSION } from '../constants';
import { canonicalize } from '../integrity/canonical';
import type { AppInfo, DeviceInfo, EvidenceRecord } from '../integrity/record';
import type { Signer } from '../integrity/seal';
import type { LockerStore } from '../locker/store';
import type { FileDigests } from '../types';

export const COPY_RECORD_TYPE = 'saakshi.evidence.copy';

/** The signed record of a playable copy (docs/spec/evidence-bundle.md, section 11). */
export type CopyRecord = {
  type: typeof COPY_RECORD_TYPE;
  version: typeof FORMAT_VERSION;
  id: string;
  session: string;
  original: { recordId: string; recordSha256: string; fileName: string; fileSha256: string };
  method: {
    name: 'remux-mpegts-to-mp4';
    reencoded: false;
    description: string;
    rotationDegrees: number | null;
  };
  file: { name: string; mediaType: 'video/mp4'; size: number; sha256: string; sha1: string; md5: string };
  madeAt: string;
  device: DeviceInfo;
  app: AppInfo;
  key: { id: string; algorithm: 'ES256' };
};

export const REMUX_DESCRIPTION =
  'Container changed from MPEG-TS to MP4 with Android MediaExtractor and MediaMuxer. Every audio and ' +
  'video sample is copied unchanged; nothing is re-encoded. The rotation noted in the original record ' +
  'is written into the MP4, which MPEG-TS cannot hold.';

export type CopyDeps = {
  store: LockerStore;
  /** Writes the MP4 copy of `input` at `output`. */
  remux: (input: string, output: string, rotationDegrees: number | null) => Promise<string>;
  hash: (uri: string) => Promise<FileDigests>;
  signer: () => Promise<Signer>;
  sha256Hex: (text: string) => Promise<string>;
  newId: () => string;
  device: () => DeviceInfo;
  app: () => AppInfo;
  now: () => Date;
};

/** `0001-video.ts` → `0001-video.copy.mp4`. */
export function copyName(mediaName: string): string {
  return `${mediaName.replace(/\.[^.]+$/, '')}.copy.mp4`;
}

/**
 * Owner decision of 22 Oct: an Android .ts video stays the original. For playing and sharing, an
 * MP4 copy is made without re-encoding, with its own signed record naming the original's SHA-256
 * and the method. The copy is never in the export bundle or the certificate, and is not part of
 * the session's chain. Made once and then reused. Returns the copy's URI.
 */
export async function makePlayableCopy(deps: CopyDeps, sessionId: string, sequence: number): Promise<string> {
  const session = deps.store.readSession(sessionId);
  if (!session) throw new Error('No such session');
  const existing = session.copies?.[String(sequence)];
  if (existing) return deps.store.copyUri(sessionId, existing.file);

  const item = session.items.find((i) => i.sequence === sequence);
  if (!item || item.status !== 'sealed' || !item.record || !item.recordSha256) {
    throw new Error('Only a sealed video can be copied');
  }
  if (item.mediaType !== 'video/mp2t') throw new Error('Only MPEG-TS videos need a copy');

  const original = JSON.parse(deps.store.readRecordText(sessionId, item.record.file)) as EvidenceRecord;
  const name = copyName(item.media);
  const output = await deps.remux(
    deps.store.mediaUri(sessionId, item.media),
    deps.store.copyUri(sessionId, name),
    original.capture.rotationDegrees ?? null,
  );
  const digests = await deps.hash(output);
  const signer = await deps.signer();
  const madeAt = deps.now().toISOString();

  const record: CopyRecord = {
    type: COPY_RECORD_TYPE,
    version: FORMAT_VERSION,
    id: deps.newId(),
    session: sessionId,
    original: {
      recordId: original.id,
      recordSha256: item.recordSha256,
      fileName: item.media,
      fileSha256: original.file.sha256,
    },
    method: {
      name: 'remux-mpegts-to-mp4',
      reencoded: false,
      description: REMUX_DESCRIPTION,
      rotationDegrees: original.capture.rotationDegrees ?? null,
    },
    file: {
      name,
      mediaType: 'video/mp4',
      size: digests.size,
      sha256: digests.sha256,
      sha1: digests.sha1,
      md5: digests.md5,
    },
    madeAt,
    device: deps.device(),
    app: deps.app(),
    key: { id: signer.keyId, algorithm: 'ES256' },
  };
  const body = canonicalize(record);
  deps.store.writeCopyRecord(sessionId, name, body, await signer.sign(body));

  const latest = deps.store.readSession(sessionId) ?? session;
  deps.store.writeSession({
    ...latest,
    copies: {
      ...latest.copies,
      [String(sequence)]: { file: name, sha256: digests.sha256, recordSha256: await deps.sha256Hex(body), madeAt },
    },
  });
  return output;
}
