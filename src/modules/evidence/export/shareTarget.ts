import type { RecordKind } from '../locker/summary';
import type { EvidenceItem, MediaKind, SessionState } from '../types';
import { needsJoinedCopy } from './joinedCopy';

/**
 * What a record's "Share video" (or photo, or sound) button shares (fix round 1, group 9):
 * - `joined`: a body-cam record's video files, joined into one MP4 copy;
 * - `file`: its one file, or a body-cam record's one video: on iPhone the original, on Android an
 *   MPEG-TS video's MP4 copy;
 * - `each`: an evidence-camera record with several photos or videos, each shared from its own card;
 * - null: nothing is sealed yet.
 */
export type ShareTarget = { kind: 'joined' } | { kind: 'file'; item: EvidenceItem } | { kind: 'each' } | null;

export function shareTarget(session: SessionState, kind: RecordKind): ShareTarget {
  const sealed = session.items.filter((item) => item.status === 'sealed');
  if (!sealed.length) return null;
  if (kind !== 'camera' && needsJoinedCopy(session)) return { kind: 'joined' };
  const videos = sealed.filter((item) => item.kind === 'video');
  if (kind !== 'camera' && videos.length === 1) return { kind: 'file', item: videos[0] };
  if (sealed.length === 1) return { kind: 'file', item: sealed[0] };
  return { kind: 'each' };
}

/** Which word the button uses: what it shares. */
export function shareKind(target: ShareTarget): MediaKind | null {
  if (!target || target.kind === 'each') return null;
  return target.kind === 'joined' ? 'video' : target.item.kind;
}
