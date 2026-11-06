import type { EvidenceItem } from '../types';

/** One file in a record's end-to-end playback (fix round 1, group 3). */
export type PlaybackPart = {
  item: EvidenceItem;
  /** Seconds into this file where playback starts, to skip sound the file before already played. */
  startAt: number;
  /** Where this part begins in the whole recording, in milliseconds from its start. */
  offsetMs: number;
  /** How long this part plays, in milliseconds. */
  lengthMs: number;
  /** Milliseconds of nothing recorded before this part (for example, during a phone call). */
  gapBeforeMs: number;
};

export type PlaybackPlan = {
  parts: PlaybackPart[];
  /** From the first file's start to the last file's end, gaps included. */
  totalMs: number;
  /**
   * An older body-cam record (before fix round 1, group 1): its video files have no sound, and the
   * sound was recorded alongside them in separate files. The plan then plays the sound files.
   */
  soundAlongside: boolean;
};

/** Sound and video files overlapping by more than this ran alongside each other. */
const ALONGSIDE_MS = 1500;

/**
 * True for a record whose sound files ran at the same time as its video files (older body-cam
 * records), not only during the gaps between them (iPhone hand-overs overlap by about half a second).
 */
export function soundRanAlongside(items: readonly EvidenceItem[]): boolean {
  const videos = items.filter((i) => i.kind === 'video');
  return items
    .filter((i) => i.kind === 'audio')
    .some((a) =>
      videos.some((v) => Math.min(ms(a.endedAt), ms(v.endedAt)) - Math.max(ms(a.startedAt), ms(v.startedAt)) > ALONGSIDE_MS),
    );
}

const ms = (iso: string) => Date.parse(iso);

/**
 * The files of a body-cam or bug-mode record, in the order they were recorded, to be played end to
 * end with their sound. On iPhone a sound-only file starts about half a second before the video it
 * takes over from ended, and the next video starts about half a second before it ends; each part
 * starts where the one before stopped, so nothing is heard twice. A file that adds nothing (wholly
 * inside the ones before) is left out. Photos are not played.
 */
export function planPlayback(items: readonly EvidenceItem[]): PlaybackPlan {
  const inLocker = items.filter((i) => (i.kind === 'video' || i.kind === 'audio') && (i.status === 'sealed' || i.status === 'hashed'));
  const soundAlongside = soundRanAlongside(inLocker);
  const playable = inLocker
    .filter((i) => !soundAlongside || i.kind === 'audio')
    .sort((a, b) => ms(a.startedAt) - ms(b.startedAt) || a.sequence - b.sequence);
  if (!playable.length) return { parts: [], totalMs: 0, soundAlongside };

  const first = ms(playable[0].startedAt);
  const parts: PlaybackPart[] = [];
  let playedTo = first;
  for (const item of playable) {
    const start = ms(item.startedAt);
    const end = ms(item.endedAt);
    if (end <= playedTo) continue;
    const from = Math.max(start, playedTo);
    parts.push({
      item,
      startAt: (from - start) / 1000,
      offsetMs: from - first,
      lengthMs: end - from,
      gapBeforeMs: Math.max(0, start - playedTo),
    });
    playedTo = end;
  }
  return { parts, totalMs: playedTo - first, soundAlongside };
}

/** Which part holds a moment of the whole recording, and how far into that part it is. */
export function partAt(plan: PlaybackPlan, positionMs: number): { index: number; intoMs: number } {
  for (let i = plan.parts.length - 1; i >= 0; i--) {
    const part = plan.parts[i];
    if (positionMs >= part.offsetMs) return { index: i, intoMs: Math.min(positionMs - part.offsetMs, part.lengthMs) };
  }
  return { index: 0, intoMs: 0 };
}
