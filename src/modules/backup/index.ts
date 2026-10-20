/**
 * Keeping the app's files out of the phone's own backups until the user chooses a destination
 * (spec section 2, owner's decision of 20 Oct). Owner: Stream B.
 *
 * Public API of this module. Other code imports only from `@/modules/backup`, never from files
 * inside it.
 */
import SaakshiSos from '@native/saakshi-sos';
import { Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { appStateListener, type BackupDeps, useBackupExclusionWith } from './exclusion';

export { excludeFromBackup } from './exclusion';

const deps: BackupDeps | null =
  Platform.OS === 'ios' && SaakshiSos
    ? {
        // Everything the app keeps (evidence, contacts, settings) is under Documents. Caches and
        // temporary files are never backed up.
        folders: () => [Paths.document.uri],
        setExcluded: (uri, excluded) => SaakshiSos!.setExcludedFromBackup(uri, excluded),
        onAppState: appStateListener,
      }
    : null;

/** Call once in the root layout. */
export function useBackupExclusion(): void {
  useBackupExclusionWith(deps);
}
