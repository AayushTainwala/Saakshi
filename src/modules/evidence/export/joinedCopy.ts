import type { JoinSegment, JoinToMp4Request as JoinRequest, JoinToMp4Result } from '@native/saakshi-evidence';

import { FORMAT_VERSION } from '../constants';
import { canonicalize } from '../integrity/canonical';
import type { AppInfo, DeviceInfo, EvidenceRecord } from '../integrity/record';
import type { Signer } from '../integrity/seal';
import { whileBusy } from '../locker/active';
import type { LockerStore } from '../locker/store';
import type { EvidenceItem, FileDigests, SessionState } from '../types';
import { planPlayback } from '../ui/playback';

export const JOINED_COPY_TYPE = 'saakshi.evidence.joined-copy';
export const JOINED_COPY_NAME = 'joined.copy.mp4';

/**
 * What the native joiner is asked to do (SaakshiEvidence `joinToMp4`): each video file's picture at
 * its place in the recording (no picture between them), and the sound, each stretch taken once,
 * from the video files and the sound-only files. Times in seconds.
 */
export type { JoinSegment, JoinRequest };

export type JoinPart = { track: 'video' | 'audio'; source: string; atMs: number; fromMs: number; lengthMs: number };

/** The signed record of a joined copy (docs/spec/evidence-bundle.md, section 11a; format 0.7). */
export type JoinedCopyRecord = {
  type: typeof JOINED_COPY_TYPE;
  version: typeof FORMAT_VERSION;
  id: string;
  session: string;
  sources: { recordId: string; recordSha256: string; fileName: string; fileSha256: string }[];
  parts: JoinPart[];
  method: { name: 'join-mp4'; reencoded: boolean; description: string };
  file: { name: string; mediaType: 'video/mp4'; size: number; sha256: string; sha1: string; md5: string };
  madeAt: string;
  device: DeviceInfo;
  app: AppInfo;
  key: { id: string; algorithm: 'ES256' };
};

export const JOIN_DESCRIPTION =
  "The record's files joined, in the order they were recorded, into one MP4 file. Every audio and video " +
  'sample is copied unchanged; nothing is re-encoded. Where video could not record, the copy shows no new ' +
  'picture and plays the sound-only file; where nothing was recorded, it is silent. Sound that two files ' +
  'both hold is taken once. "parts" says which stretch of each file is where.';

export const JOIN_REENCODED_DESCRIPTION =
  "The record's files joined, in the order they were recorded, into one MP4 file. The phone could not " +
  'join them without re-encoding (for example, because the clips were filmed turned different ways), so ' +
  'the picture and sound in this copy were re-encoded and are not the original samples. Where video could ' +
  'not record, the copy shows no new picture and plays the sound-only file; where nothing was recorded, it ' +
  'is silent. "parts" says which stretch of each file is where.';

/** A record with more than one video file is shared as one joined copy (fix round 1, group 3). */
export function needsJoinedCopy(session: SessionState): boolean {
  return session.items.filter((i) => i.kind === 'video' && i.status === 'sealed').length > 1;
}

/** A stretch of one sealed file in the joined copy, before its URI is known. Times in seconds. */
export type PlannedSegment = { item: EvidenceItem; at: number; from: number; length: number };

/**
 * Where each file goes in the joined copy, from the files' own times: every video file's picture
 * from its start, and the sound exactly as the record's player plays it (each stretch once). Only
 * sealed files are used, so every source has a signed record.
 */
export function planJoin(items: readonly EvidenceItem[]): {
  video: PlannedSegment[];
  audio: PlannedSegment[];
  parts: JoinPart[];
  sources: EvidenceItem[];
} {
  const sealed = items.filter((i) => i.status === 'sealed' && (i.kind === 'video' || i.kind === 'audio'));
  // The sound as the record's player plays it: for an older body-cam record, whose videos have no
  // sound, from its sound files for the whole recording.
  const plan = planPlayback(sealed);
  if (!plan.parts.length) return { video: [], audio: [], parts: [], sources: [] };
  const first = Math.min(...sealed.map((i) => Date.parse(i.startedAt)));
  const video: PlannedSegment[] = sealed
    .filter((i) => i.kind === 'video')
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
    .map((item) => ({
      item,
      at: (Date.parse(item.startedAt) - first) / 1000,
      from: 0,
      length: (Date.parse(item.endedAt) - Date.parse(item.startedAt)) / 1000,
    }));
  const soundStart = Date.parse(plan.parts[0].item.startedAt) + plan.parts[0].startAt * 1000;
  const audio: PlannedSegment[] = plan.parts.map((p) => ({
    item: p.item,
    at: (soundStart - first + p.offsetMs) / 1000,
    from: p.startAt,
    length: p.lengthMs / 1000,
  }));
  const toPart = (track: JoinPart['track']) => (s: PlannedSegment): JoinPart => ({
    track,
    source: s.item.media,
    atMs: Math.round(s.at * 1000),
    fromMs: Math.round(s.from * 1000),
    lengthMs: Math.round(s.length * 1000),
  });
  const used = new Set([...video, ...audio].map((s) => s.item.sequence));
  return {
    video,
    audio,
    parts: [...video.map(toPart('video')), ...audio.map(toPart('audio'))],
    sources: sealed.filter((i) => used.has(i.sequence)).sort((a, b) => a.sequence - b.sequence),
  };
}

/** Why a record couldn't be joined, for the app to say in the user's language. */
export class JoinError extends Error {
  constructor(readonly code: 'turned' | 'one-video' | 'unsealed') {
    super(code === 'turned' ? 'The video files were recorded turned different ways' : code === 'one-video' ? 'Only one video file' : 'Not every file is sealed');
  }
}

export type JoinDeps = {
  store: LockerStore;
  join: (request: JoinRequest) => Promise<JoinToMp4Result>;
  hash: (uri: string) => Promise<FileDigests>;
  signer: () => Promise<Signer>;
  sha256Hex: (text: string) => Promise<string>;
  newId: () => string;
  device: () => DeviceInfo;
  app: () => AppInfo;
  now: () => Date;
};

/**
 * Makes (once) the joined MP4 copy of a record with more than one video file, for sharing: its own
 * signed record lists the SHA-256 of every source file and where each stretch went. It is not the
 * original, is never in the bundle or the certificate, and is not part of the chain. Made again if
 * the record has gained a file since. Returns its URI.
 */
export function makeJoinedCopy(deps: JoinDeps, sessionId: string): Promise<string> {
  // One join of a record at a time.
  const running = joining.get(sessionId);
  if (running) return running;
  const job = whileBusy(sessionId, () => join(deps, sessionId)).finally(() => joining.delete(sessionId));
  joining.set(sessionId, job);
  return job;
}

const joining = new Map<string, Promise<string>>();

async function join(deps: JoinDeps, sessionId: string): Promise<string> {
  const session = deps.store.readSession(sessionId);
  if (!session) throw new Error('No such session');
  const { video, audio, parts, sources } = planJoin(session.items);
  if (video.length < 2) throw new JoinError('one-video');
  const existing = session.joined;
  const sequences = sources.map((s) => s.sequence);
  // (The copy is remade when the record gains a file, whatever the phone could place from it.)
  if (existing && existing.sources.join(',') === sequences.join(',')) return deps.store.copyUri(sessionId, existing.file);

  const records = sources.map((item) => {
    if (!item.record || !item.recordSha256) throw new JoinError('unsealed');
    return { item, record: JSON.parse(deps.store.readRecordText(sessionId, item.record.file)) as EvidenceRecord };
  });
  const turns = new Set(records.filter((r) => r.item.kind === 'video').map((r) => r.record.capture.rotationDegrees ?? 0));
  if (turns.size > 1) throw new JoinError('turned');
  const located = (s: PlannedSegment): JoinSegment => ({ uri: deps.store.mediaUri(sessionId, s.item.media), at: s.at, from: s.from, length: s.length });
  const request: JoinRequest = {
    output: deps.store.copyUri(sessionId, JOINED_COPY_NAME),
    video: video.map(located),
    audio: audio.map(located),
    rotationDegrees: [...turns][0] || null,
  };
  const made = await deps.join(request);
  // The record names only what the phone placed (a video file recorded without sound has none).
  const placedParts = [
    ...parts.filter((p) => p.track === 'video').filter((_, i) => made.placedVideo?.[i] !== false),
    ...parts.filter((p) => p.track === 'audio').filter((_, i) => made.placedAudio?.[i] !== false),
  ];
  const usedNames = new Set(placedParts.map((p) => p.source));
  const usedRecords = records.filter(({ item }) => usedNames.has(item.media));
  const digests = await deps.hash(made.uri);
  const signer = await deps.signer();
  const madeAt = deps.now().toISOString();
  const record: JoinedCopyRecord = {
    type: JOINED_COPY_TYPE,
    version: FORMAT_VERSION,
    id: deps.newId(),
    session: sessionId,
    sources: usedRecords.map(({ item, record: r }) => ({
      recordId: r.id,
      recordSha256: item.recordSha256!,
      fileName: item.media,
      fileSha256: r.file.sha256,
    })),
    parts: placedParts,
    method: { name: 'join-mp4', reencoded: made.reencoded, description: made.reencoded ? JOIN_REENCODED_DESCRIPTION : JOIN_DESCRIPTION },
    file: { name: JOINED_COPY_NAME, mediaType: 'video/mp4', size: digests.size, sha256: digests.sha256, sha1: digests.sha1, md5: digests.md5 },
    madeAt,
    device: deps.device(),
    app: deps.app(),
    key: { id: signer.keyId, algorithm: 'ES256' },
  };
  const body = canonicalize(record);
  const signature = await signer.sign(body);
  const recordSha256 = await deps.sha256Hex(body);
  // Read the session last, so nothing written meanwhile is lost; never write back a deleted one.
  const latest = deps.store.readSession(sessionId);
  if (!latest) throw new Error('This record was deleted');
  deps.store.writeCopyRecord(sessionId, JOINED_COPY_NAME, body, signature);
  deps.store.writeSession({
    ...latest,
    joined: { file: JOINED_COPY_NAME, sha256: digests.sha256, recordSha256, madeAt, sources: sequences, reencoded: made.reencoded },
  });
  return made.uri;
}
