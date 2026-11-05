import type { BundledCheckpoint, BundledRecord } from '../export/contents';
import type { CheckpointRecord, EvidenceRecord } from '../integrity/record';
import type { CheckpointItem, EvidenceItem } from '../types';
import type { LockerStore } from './store';

export type SealedEntry = { item: EvidenceItem; body: string; bundled: BundledRecord };

/** The session's sealed files with their record text, in order. */
export function loadSealed(store: LockerStore, sessionId: string): SealedEntry[] {
  const session = store.readSession(sessionId);
  if (!session) throw new Error('No such session');
  return session.items
    .filter((item) => item.status === 'sealed' && item.record && item.recordSha256 && item.digests)
    .map((item) => {
      const body = store.readRecordText(sessionId, item.record!.file);
      return {
        item,
        body,
        bundled: {
          record: JSON.parse(body) as EvidenceRecord,
          recordFile: item.record!.file,
          mediaFile: item.media,
          recordSha256: item.recordSha256!,
        },
      };
    });
}

export type SealedCheckpoint = { item: CheckpointItem; body: string; bundled: BundledCheckpoint };

/** The session's sealed checkpoints (format 0.5) with their record text, in chain order. */
export function loadCheckpoints(store: LockerStore, sessionId: string): SealedCheckpoint[] {
  const session = store.readSession(sessionId);
  if (!session) throw new Error('No such session');
  return (session.checkpoints ?? [])
    .filter((item) => item.status === 'sealed' && item.record && item.recordSha256)
    .map((item) => {
      const body = store.readRecordText(sessionId, item.record!.file);
      return {
        item,
        body,
        bundled: {
          record: JSON.parse(body) as CheckpointRecord,
          recordFile: item.record!.file,
          recordSha256: item.recordSha256!,
        },
      };
    });
}
