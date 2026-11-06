import type { BundledCheckpoint, BundledRecord } from '../export/contents';
import type { CheckpointRecord, EvidenceRecord } from '../integrity/record';
import type { CaptureMode, CheckpointItem, EvidenceItem } from '../types';
import { fileLocker, type LockerStore } from './store';

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

const fromRecord = new Map<string, Pick<EvidenceRecord['capture'], 'mode' | 'rotationDegrees'> | null>();

/** A file's signed record's capture facts, read once and remembered; null if it can't be read. */
function captureOf(sessionId: string, item: EvidenceItem, store: LockerStore): Pick<EvidenceRecord['capture'], 'mode' | 'rotationDegrees'> | null {
  if (!item.record) return null;
  const key = `${sessionId}/${item.record.file}`;
  if (!fromRecord.has(key)) {
    try {
      const record = JSON.parse(store.readRecordText(sessionId, item.record.file)) as EvidenceRecord;
      fromRecord.set(key, { mode: record.capture.mode, rotationDegrees: record.capture.rotationDegrees });
    } catch {
      fromRecord.set(key, null);
    }
  }
  return fromRecord.get(key) ?? null;
}

/** Degrees to turn an Android .ts video upright, from its signed record, for items saved before the bookkeeping kept it. */
export function recordRotationOf(sessionId: string, item: EvidenceItem, store: LockerStore = fileLocker): number | null {
  return captureOf(sessionId, item, store)?.rotationDegrees ?? null;
}

/**
 * What recorded a file, from its signed record (`capture.mode`), for sessions whose bookkeeping
 * predates `mode`. Read once per file and remembered; null if it can't be read.
 */
export function recordModeOf(sessionId: string, item: EvidenceItem, store: LockerStore = fileLocker): CaptureMode | null {
  return captureOf(sessionId, item, store)?.mode ?? null;
}
