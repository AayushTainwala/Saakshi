import SaakshiEvidence from '@native/saakshi-evidence';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * The file operations the locker needs, by file:// URI, so that the same locker logic
 * (store.ts, rebuild.ts) runs on the phone and, over files held in memory, in the tests.
 */
export interface LockerFiles {
  /** The locker's own folder (`evidence/` in the app's documents), without a slash at the end. */
  rootUri: string;
  /** A session's folder, without a slash at the end. */
  sessionUri(id: string): string;
  /** The ids of the session folders there are. */
  sessionIds(): string[];
  folderExists(uri: string): boolean;
  /** Creates the folder and any above it. */
  makeFolder(uri: string): void;
  /** What is directly inside a folder; nothing if there is no such folder. */
  list(uri: string): { name: string; folder: boolean }[];
  /** A file's size and last-write time (ms since 1970), or null if there is no such file. */
  stat(uri: string): { size: number; modifiedAt: number } | null;
  readText(uri: string): string;
  readBytes(uri: string): Uint8Array;
  /** Writes a file that is written once and never again (a record, a signature). */
  write(uri: string, data: string | Uint8Array): void;
  /**
   * Replaces a file that is rewritten (the bookkeeping, a marker, a key file): the text goes into
   * a new file beside it, which takes the old one's place in one step. At every moment a reader
   * finds the old file or the new one, whole (repair round A, group 1).
   */
  replaceText(uri: string, text: string): void;
  /** Adds text to the end of a file, creating it if needed. */
  appendText(uri: string, text: string): void;
  move(fromUri: string, toUri: string): void;
  /** Removes a file, or a folder with everything in it. Nothing happens if it isn't there. */
  remove(uri: string): void;
  /** Called after a session is deleted, for what is kept outside the locker (its last export). */
  sessionDeleted?(id: string): void;
}

/** The ending of the file `replaceText` writes beside its target (AtomicFile in modules/saakshi-evidence). */
export const TEMPORARY_SUFFIX = '.tmp';

const trim = (uri: string) => uri.replace(/\/+$/, '');

export const join = (folderUri: string, ...names: string[]) => [trim(folderUri), ...names].join('/');

function parentOf(uri: string): string {
  const cut = trim(uri);
  return cut.slice(0, cut.lastIndexOf('/'));
}

function ensureFolder(uri: string): void {
  const folder = new Directory(uri);
  if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
}

const root = () => trim(new Directory(Paths.document, 'evidence').uri);

/** The locker's files on the phone: expo-file-system, and the native one-step replace. */
export const deviceFiles: LockerFiles = {
  get rootUri() {
    return root();
  },
  sessionUri: (id) => join(root(), 'sessions', id),
  sessionIds() {
    const folder = new Directory(join(root(), 'sessions'));
    if (!folder.exists) return [];
    return folder
      .list()
      .filter((entry) => entry instanceof Directory)
      .map((entry) => entry.name);
  },
  folderExists: (uri) => new Directory(uri).exists,
  makeFolder: ensureFolder,
  list(uri) {
    const folder = new Directory(uri);
    if (!folder.exists) return [];
    return folder.list().map((entry) => ({ name: entry.name, folder: entry instanceof Directory }));
  },
  stat(uri) {
    const file = new File(uri);
    if (!file.exists) return null;
    const info = file.info();
    return { size: info.size ?? 0, modifiedAt: info.modificationTime ?? 0 };
  },
  readText: (uri) => new File(uri).textSync(),
  readBytes: (uri) => new File(uri).bytesSync(),
  write(uri, data) {
    ensureFolder(parentOf(uri));
    const file = new File(uri);
    if (!file.exists) file.create();
    file.writeSync(data);
  },
  replaceText(uri, text) {
    ensureFolder(parentOf(uri));
    if (typeof SaakshiEvidence?.writeTextAtomic === 'function') {
      SaakshiEvidence.writeTextAtomic(uri, text);
      return;
    }
    // Without the native module (Expo Go, the web) there is no one-step swap: the file library's
    // write empties the file first and its move removes the target first (expo-file-system
    // 58.0.10, read on 10 Nov 2026). Write beside, then move over: a cut-off between the two
    // steps of the move leaves the new file complete under its temporary name.
    const temporary = new File(uri + TEMPORARY_SUFFIX);
    if (!temporary.exists) temporary.create();
    temporary.writeSync(text);
    const target = new File(uri);
    if (target.exists) target.delete();
    temporary.moveSync(target);
  },
  appendText(uri, text) {
    ensureFolder(parentOf(uri));
    const file = new File(uri);
    if (!file.exists) file.create();
    file.writeSync(text, { append: true });
  },
  move(fromUri, toUri) {
    ensureFolder(parentOf(toUri));
    new File(fromUri).moveSync(new File(toUri));
  },
  remove(uri) {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
      return;
    }
    const folder = new Directory(uri);
    if (folder.exists) folder.delete();
  },
  sessionDeleted(id) {
    // Its last export, if one is still in the cache (export/bundle.ts, exportCacheFor).
    const exports = new Directory(Paths.cache, 'exports', id);
    if (exports.exists) exports.delete();
  },
};
