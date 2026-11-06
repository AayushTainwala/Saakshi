import { Directory, File } from 'expo-file-system';
import { getThumbnailAsync } from 'expo-video-thumbnails';
import { useEffect, useState } from 'react';

import type { EvidenceItem } from '../types';
import { fileLocker } from './store';

const making = new Map<string, Promise<string | null>>();

/**
 * A picture for a photo or video in the records list (fix round 1, group 3). A photo is shown from
 * the original itself. A video's picture is taken once from its first second and kept in the
 * session's `thumbs/` folder: it is not evidence, is never in a bundle, and goes when the record is
 * deleted. Null when there is none (sound, or the phone couldn't read a frame).
 */
export function thumbnailFor(sessionId: string, item: EvidenceItem): Promise<string | null> {
  if (item.kind === 'photo') return Promise.resolve(fileLocker.mediaUri(sessionId, item.media));
  if (item.kind !== 'video' || (item.status !== 'sealed' && item.status !== 'hashed')) return Promise.resolve(null);
  const key = `${sessionId}/${item.media}`;
  const known = making.get(key);
  if (known) return known;
  const job = (async () => {
    const target = new File(fileLocker.sessionFileUri(sessionId, `thumbs/${item.media}.jpg`));
    if (target.exists) return target.uri;
    try {
      const made = await getThumbnailAsync(fileLocker.mediaUri(sessionId, item.media), { time: 1000, quality: 0.6 });
      const folder = new Directory(fileLocker.sessionFileUri(sessionId, 'thumbs'));
      if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
      new File(made.uri).moveSync(target);
      return target.uri;
    } catch {
      return null;
    } finally {
      making.delete(key);
    }
  })();
  making.set(key, job);
  return job;
}

export function useThumbnail(sessionId: string, item: EvidenceItem | null): string | null {
  const [found, setFound] = useState<{ key: string; uri: string | null } | null>(null);
  // The picture depends only on which file it is and whether it is in the locker yet.
  const key = item ? `${sessionId}/${item.media}/${item.status}` : null;
  useEffect(() => {
    if (!item || !key) return;
    let live = true;
    void thumbnailFor(sessionId, item).then((uri) => live && setFound({ key, uri }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for the item
  }, [key]);
  return found && found.key === key ? found.uri : null;
}
