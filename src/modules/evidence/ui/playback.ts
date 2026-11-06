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
};

const ms = (iso: string) => Date.parse(iso);

/**
 * The files of a body-cam or bug-mode record, in the order they were recorded, to be played end to
 * end with their sound. On iPhone a sound-only file starts about half a second before the video it
 * takes over from ended, and the next video starts about half a second before it ends; each part
 * starts where the one before stopped, so nothing is heard twice. A file that adds nothing (wholly
 * inside the ones before) is left out. Photos are not played.
 */
export function planPlayback(items: readonly EvidenceItem[]): PlaybackPlan {
  const playable = items
    .filter((i) => (i.kind === 'video' || i.kind === 'audio') && (i.status === 'sealed' || i.status === 'hashed'))
    .sort((a, b) => ms(a.startedAt) - ms(b.startedAt) || a.sequence - b.sequence);
  if (!playable.length) return { parts: [], totalMs: 0 };

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
  return { parts, totalMs: playedTo - first };
}

/** Which part holds a moment of the whole recording, and how far into that part it is. */
export function partAt(plan: PlaybackPlan, positionMs: number): { index: number; intoMs: number } {
  for (let i = plan.parts.length - 1; i >= 0; i--) {
    const part = plan.parts[i];
    if (positionMs >= part.offsetMs) return { index: i, intoMs: Math.min(positionMs - part.offsetMs, part.lengthMs) };
  }
  return { index: 0, intoMs: 0 };
}
