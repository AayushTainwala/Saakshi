import { File, Paths } from 'expo-file-system';

/**
 * Round 2 removed the 3-digit code pad and confiscation mode (SPEC 5.1, 5.4). Their setting, a
 * file holding the old code in plain text and what it did, is deleted, so the old code doesn't stay
 * on the phone. Contacts and every other setting are kept. Safe to run on every start.
 */
export const OLD_TRIGGER_FILE = 'sos-trigger.json';

export type OldFiles = { exists(name: string): boolean; remove(name: string): void };

const documents: OldFiles = {
  exists: (name) => new File(Paths.document, name).exists,
  remove: (name) => new File(Paths.document, name).delete(),
};

/** Deletes the old code pad's setting if it is there. Returns true if it was. */
export function removeOldCodePadSetting(files: OldFiles = documents): boolean {
  try {
    if (!files.exists(OLD_TRIGGER_FILE)) return false;
    files.remove(OLD_TRIGGER_FILE);
    return true;
  } catch {
    return false;
  }
}
