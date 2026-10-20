import type { BundledRecord } from '../export/contents';
import type { EvidenceRecord } from '../integrity/record';
import type { EvidenceItem } from '../types';
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
