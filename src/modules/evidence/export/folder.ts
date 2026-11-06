import SaakshiEvidence from '@native/saakshi-evidence';
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { whileBusy } from '../locker/active';
import { writeBundle, writeBundleTo } from './bundle';

/**
 * The default export folder (fix round 1, group 9): the user picks a folder once, and later bundle
 * exports are saved there with one tap. Android keeps the Storage Access Framework folder that
 * expo-file-system's picker took a persistable permission for; iPhone keeps a security-scoped
 * bookmark (ExportFolder.swift). The choice stays on this phone.
 */
export type ExportFolder =
  | { platform: 'android'; uri: string; name: string | null }
  | { platform: 'ios'; bookmark: string; name: string };

const settingsFile = () => new File(Paths.document, 'evidence', 'export-folder.json');

/** The folder bundles are saved to, or null before the user has picked one. */
export function readExportFolder(): ExportFolder | null {
  try {
    const file = settingsFile();
    if (!file.exists) return null;
    const folder = JSON.parse(file.textSync()) as ExportFolder;
    return folder.platform === Platform.OS ? folder : null;
  } catch {
    return null;
  }
}

export function saveExportFolder(folder: ExportFolder): void {
  const dir = new Directory(Paths.document, 'evidence');
  if (!dir.exists) dir.create({ intermediates: true });
  const file = settingsFile();
  if (!file.exists) file.create();
  file.writeSync(JSON.stringify(folder));
}

/**
 * A folder's name to show, from an Android tree URI, where the provider says it: "Documents/Saakshi"
 * for content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FSaakshi, or
 * "Download" for raw:/storage/emulated/0/Download. Null when the provider's id says nothing a
 * person would read (Google Drive's, for example), or for the root of the phone's storage.
 */
export function androidFolderName(treeUri: string): string | null {
  const match = /\/tree\/([^/]+)/.exec(treeUri);
  if (!match) return null;
  let id: string;
  try {
    id = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  const colon = id.indexOf(':');
  if (colon < 0) return null;
  let path = id.slice(colon + 1);
  if (/[=;]/.test(path)) return null;
  if (path.startsWith('/')) path = path.split('/').filter(Boolean).at(-1) ?? '';
  return path.replace(/\/+$/, '') || null;
}

/** What went wrong with the folder itself, as the screen says it (`export.problem.*`). */
export type FolderProblem = 'gone' | 'access' | 'write' | 'busy' | 'unavailable';

/** A problem with the export folder, not with the bundle. */
export class ExportFolderError extends Error {
  constructor(
    readonly problem: FolderProblem,
    message: string,
  ) {
    super(message);
    this.name = 'ExportFolderError';
  }
}

// The codes ExportFolder.swift and SaakshiEvidenceModule.swift reject with.
const NATIVE_PROBLEMS: Record<string, FolderProblem> = {
  ERR_FOLDER_GONE: 'gone',
  ERR_FOLDER_ACCESS: 'access',
  ERR_FOLDER_BOOKMARK: 'access',
  ERR_FOLDER_WRITE: 'write',
  ERR_PICKER_BUSY: 'busy',
  ERR_NO_SCREEN: 'unavailable',
};

function folderError(error: unknown, otherwise: FolderProblem): ExportFolderError {
  if (error instanceof ExportFolderError) return error;
  const code = (error as { code?: string } | null)?.code;
  return new ExportFolderError((code && NATIVE_PROBLEMS[code]) || otherwise, error instanceof Error ? error.message : String(error));
}

function isCancel(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  const message = error instanceof Error ? error.message : String(error);
  return code === 'ERR_PICKER_CANCELLED' || /cancel/i.test(message);
}

/** Shows the phone's folder picker. Null if the user cancels. */
export async function pickExportFolder(): Promise<ExportFolder | null> {
  if (Platform.OS === 'ios') {
    if (!SaakshiEvidence) throw new ExportFolderError('unavailable', 'The SaakshiEvidence native module is not available in this build.');
    try {
      const picked = await SaakshiEvidence.pickExportFolder();
      return picked ? { platform: 'ios', bookmark: picked.bookmark, name: picked.name } : null;
    } catch (error) {
      throw folderError(error, 'unavailable');
    }
  }
  try {
    const directory = await Directory.pickDirectoryAsync();
    return { platform: 'android', uri: directory.uri, name: androidFolderName(directory.uri) };
  } catch (error) {
    if (isCancel(error)) return null;
    throw folderError(error, 'unavailable');
  }
}

/**
 * Saves a session's bundle in the folder. Returns the folder as it should now be kept (iPhone
 * refreshes a stale bookmark) and the file's name there on iPhone. On Android it is null: the
 * folder's app gives a taken name a number, and doesn't say which. A problem with the folder
 * throws ExportFolderError; a problem making the bundle throws as it is.
 */
export async function exportToFolder(sessionId: string, folder: ExportFolder): Promise<{ folder: ExportFolder; fileName: string | null }> {
  if (folder.platform === 'ios') {
    if (!SaakshiEvidence) throw new ExportFolderError('unavailable', 'The SaakshiEvidence native module is not available in this build.');
    const native = SaakshiEvidence;
    // Made in the cache, then copied in: the record can't be deleted until the copy is done.
    return whileBusy(sessionId, async () => {
      const { uri, fileName } = await writeBundle(sessionId);
      const cached = new File(uri);
      try {
        const saved = await native.saveToExportFolder(folder.bookmark, uri, fileName).catch((error: unknown) => {
          throw folderError(error, 'write');
        });
        return { folder: { ...folder, bookmark: saved.bookmark ?? folder.bookmark, name: saved.folder || folder.name }, fileName: saved.name };
      } finally {
        if (cached.exists) cached.delete();
      }
    });
  }

  // Android: written straight into the folder, so the bundle is never in two places at once.
  const directory = new Directory(folder.uri);
  let created: File | null = null;
  try {
    await writeBundleTo(sessionId, (name) => {
      let handle: ReturnType<File['open']>;
      try {
        created = directory.createFile(name, 'application/zip');
        handle = created.open(FileMode.WriteOnly);
      } catch (error) {
        throw folderError(error, 'gone');
      }
      return {
        write: (bytes) => handle.writeBytes(bytes).catch((error: unknown) => {
          throw folderError(error, 'write');
        }),
        close: () => handle.close(),
      };
    });
    return { folder, fileName: null };
  } catch (error) {
    // Don't leave half a bundle behind.
    try {
      const partial = created as File | null;
      if (partial?.exists) partial.delete();
    } catch {
      // The folder may be gone; the error below says what happened.
    }
    throw error;
  }
}
