import type { LockerStore } from '../locker/store';
import type { FileDigests } from '../types';

/**
 * A ZIP needs each file's CRC-32 before the file is written into it. The locker notes it when a
 * file is first hashed, but bookkeeping made again from the signed records (locker/rebuild.ts)
 * doesn't have it: the records don't hold it. This reads each such file once, checks that it is
 * still the file its record signed, and notes its CRC-32, before a bundle is planned.
 */
export async function fillMissingCrc(store: LockerStore, hash: (uri: string) => Promise<FileDigests>, id: string): Promise<void> {
  const session = store.readSession(id);
  if (!session) throw new Error('No such session');
  const found = new Map<number, number>();
  for (const item of session.items) {
    if (item.status !== 'sealed' || !item.digests || item.digests.crc32 !== null) continue;
    const now = await hash(store.mediaUri(id, item.media));
    if (now.sha256 !== item.digests.sha256 || now.size !== item.digests.size || now.crc32 === null) {
      throw new Error(`${item.media} has changed since it was signed; run Check files.`);
    }
    found.set(item.sequence, now.crc32);
  }
  if (!found.size) return;
  // Read last, so nothing written meanwhile is lost; never write back a deleted record.
  const latest = store.readSession(id);
  if (!latest) throw new Error('This record was deleted');
  store.writeSession({
    ...latest,
    items: latest.items.map((item) =>
      item.digests && item.digests.crc32 === null && found.has(item.sequence)
        ? { ...item, digests: { ...item.digests, crc32: found.get(item.sequence)! } }
        : item,
    ),
  });
}
