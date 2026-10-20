import { Directory, File, Paths } from 'expo-file-system';

import { createPipelineDeps } from './deps';
import { type RecoveryFiles, recoverPending } from './recover';

const deviceFiles: RecoveryFiles = {
  stat(uri) {
    const file = new File(uri);
    if (!file.exists) return null;
    const info = file.info();
    return { size: info.size ?? 0, modifiedAt: info.modificationTime ?? Date.now() };
  },
  iosCameraFiles() {
    const dir = new Directory(Paths.cache, 'Camera');
    if (!dir.exists) return [];
    return dir
      .list()
      .filter((entry): entry is File => entry instanceof File && entry.name.toLowerCase().endsWith('.mov'))
      .map((file) => {
        const info = file.info();
        return { uri: file.uri, createdAt: info.creationTime ?? info.modificationTime ?? 0 };
      });
  },
};

let running: Promise<number> | null = null;

/** Seals any recording cut off last time. Safe to call more than once; it runs once per launch. */
export function recoverInterruptedRecordings(): Promise<number> {
  running ??= recoverPending(createPipelineDeps(), deviceFiles).then((items) => items.length);
  return running;
}
