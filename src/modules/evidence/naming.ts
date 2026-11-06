import type { RecordSummary } from './locker/summary';
import type { EvidenceItem, MediaKind } from './types';

/**
 * Names a person can read, for a record and its files (fix round 1, groups 7 and 9): the witness
 * message names them, and the bundle will. Times are India Standard Time. Machine identifiers
 * (session id, record ids, SHA-256) stay in the records and the manifest.
 */

const pad = (n: number) => String(n).padStart(2, '0');

function ist(iso: string): Date {
  return new Date(Date.parse(iso) + 330 * 60 * 1000);
}

/** "2026-11-05 10-40" (IST), safe in a file name. */
export function stampIST(iso: string, withSeconds = false): string {
  const d = ist(iso);
  const time = `${pad(d.getUTCHours())}-${pad(d.getUTCMinutes())}${withSeconds ? `-${pad(d.getUTCSeconds())}` : ''}`;
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${time}`;
}

/** What a record is, in English, for names: "Body-cam", "Bug mode", "Photo", "Videos", "Camera". */
export function recordKindName(summary: RecordSummary): string {
  if (summary.kind === 'body-cam') return 'Body-cam';
  if (summary.kind === 'bug') return 'Bug mode';
  if (summary.photos && summary.videos) return 'Camera';
  if (summary.videos) return summary.videos === 1 ? 'Video' : 'Videos';
  return summary.photos === 1 ? 'Photo' : 'Photos';
}

/** "2026-11-05 10-40 IST Body-cam": when the recording started, and what it is. */
export function recordName(summary: RecordSummary): string {
  return `${stampIST(summary.startedAt)} IST ${recordKindName(summary)}`;
}

const KIND_WORD: Record<MediaKind, string> = { video: 'video', audio: 'sound', photo: 'photo' };

/**
 * Each file's place among the record's files of its kind, in the order they were recorded:
 * "video 1", "sound 2". `word` gives the kind in the reader's language.
 */
export function fileLabels(
  items: readonly EvidenceItem[],
  word: (kind: MediaKind) => string = (kind) => KIND_WORD[kind],
): Map<number, string> {
  const counts: Record<MediaKind, number> = { video: 0, audio: 0, photo: 0 };
  const labels = new Map<number, string>();
  for (const item of [...items].sort((a, b) => a.sequence - b.sequence)) {
    counts[item.kind]++;
    labels.set(item.sequence, `${word(item.kind)} ${counts[item.kind]}`);
  }
  return labels;
}
