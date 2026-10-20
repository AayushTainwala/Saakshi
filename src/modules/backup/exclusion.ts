import { useEffect } from 'react';
import { AppState } from 'react-native';

export type BackupDeps = {
  /** The folders whose contents must stay out of the phone's own backups. */
  folders: () => string[];
  setExcluded: (uri: string, excluded: boolean) => Promise<number>;
  onAppState: (listener: (state: string) => void) => { remove: () => void };
};

/**
 * Marks the app's folders as excluded from iCloud device backup, as the owner decided (spec
 * section 2: nothing is backed up until the user chooses a destination). Run at launch and each
 * time the app goes to the background, so files written meanwhile (bug-mode pieces, contacts,
 * evidence) are covered before the phone's next backup, which iOS runs while the phone is locked.
 * Android needs nothing here: `android.allowBackup` is off for the whole app.
 */
export async function excludeFromBackup(deps: Pick<BackupDeps, 'folders' | 'setExcluded'>): Promise<number> {
  let marked = 0;
  for (const folder of deps.folders()) {
    try {
      marked += await deps.setExcluded(folder, true);
    } catch {
      // Try again at the next launch or background.
    }
  }
  return marked;
}

export function useBackupExclusionWith(deps: BackupDeps | null): void {
  useEffect(() => {
    if (!deps) return;
    void excludeFromBackup(deps);
    const subscription = deps.onAppState((state) => {
      if (state === 'background') void excludeFromBackup(deps);
    });
    return () => subscription.remove();
  }, [deps]);
}

export const appStateListener: BackupDeps['onAppState'] = (listener) =>
  AppState.addEventListener('change', listener);
