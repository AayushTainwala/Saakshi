import type { CaptureMode, EvidenceItem, SessionState } from '../types';

/** What a record is, for the records list (fix round 1, group 3). */
export type RecordKind = 'camera' | 'body-cam' | 'bug';

export type RecordSummary = {
  kind: RecordKind;
  photos: number;
  videos: number;
  sounds: number;
  /** When recording started: the first file's start, or the session's creation. */
  startedAt: string;
  /**
   * How long it recorded, in milliseconds. Body-cam and bug mode: from Start to Stop (first file's
   * start to last file's end). Evidence camera: the videos' lengths added up. Null for photos only,
   * or before any file has closed.
   */
  lengthMs: number | null;
  /** The file to show as the record's picture: its first photo or video. */
  thumbnail: EvidenceItem | null;
};

/**
 * The mode of a file whose bookkeeping predates `mode` (before fix round 1, group 3): the evidence
 * camera's files have no segment; body-cam's have one, and its sessions hold video or (before bug
 * mode had them, format 0.6) checkpoints; bug mode's are sound with a segment and nothing else.
 */
function guessMode(item: EvidenceItem, session: SessionState): CaptureMode {
  if (!item.segment) return 'camera';
  if (item.kind === 'video') return 'body-cam';
  const bodyCamSigns = session.items.some((i) => i.kind === 'video') || (session.checkpoints ?? []).some((c) => !c.mode);
  return bodyCamSigns ? 'body-cam' : 'bug';
}

/**
 * What the records list shows for a session. `recordMode` reads a file's signed record for its
 * mode when the bookkeeping doesn't have it (older sessions); without it, the mode is inferred.
 */
export function summarize(session: SessionState, recordMode?: (item: EvidenceItem) => CaptureMode | null): RecordSummary {
  const items = session.items;
  const modeOf = (item: EvidenceItem): CaptureMode => item.mode ?? recordMode?.(item) ?? guessMode(item, session);
  const modes = new Set<CaptureMode>(items.map(modeOf));
  for (const checkpoint of session.checkpoints ?? []) modes.add(checkpoint.mode ?? 'body-cam');
  const kind: RecordKind = modes.has('body-cam') ? 'body-cam' : modes.has('bug') ? 'bug' : 'camera';

  const count = (k: EvidenceItem['kind']) => items.filter((i) => i.kind === k).length;
  const ms = (iso: string) => Date.parse(iso);
  const startedAt = items.length
    ? items.reduce((first, i) => (ms(i.startedAt) < ms(first) ? i.startedAt : first), items[0].startedAt)
    : session.createdAt;

  let lengthMs: number | null = null;
  if (kind === 'camera') {
    const videos = items.filter((i) => i.kind === 'video');
    if (videos.length) lengthMs = videos.reduce((sum, v) => sum + Math.max(0, ms(v.endedAt) - ms(v.startedAt)), 0);
  } else if (items.length) {
    const end = Math.max(...items.map((i) => ms(i.endedAt)));
    lengthMs = Math.max(0, end - ms(startedAt));
  }

  const thumbnail = [...items].sort((a, b) => a.sequence - b.sequence).find((i) => i.kind === 'photo' || i.kind === 'video') ?? null;
  return { kind, photos: count('photo'), videos: count('video'), sounds: count('audio'), startedAt, lengthMs, thumbnail };
}

/** A length as hours, minutes and seconds, for the label builders below. */
export function splitLength(ms: number): { h: number; m: number; s: number } {
  const total = Math.round(ms / 1000);
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}
