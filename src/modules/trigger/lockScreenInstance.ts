import SaakshiSos from '@native/saakshi-sos';
import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

import { type LockAdminApi, LockSetting, type LockSettingState } from './lockScreen';

const native = Platform.OS === 'android' ? SaakshiSos : null;

const api: LockAdminApi | null = native
  ? {
      supported: () => native.lockAdminSupported(),
      active: () => native.lockAdminActive(),
      request: (explanation) => native.lockAdminRequest(explanation),
      remove: () => native.lockAdminRemove(),
      lockNow: () => native.lockNow(),
    }
  : null;

/** The setting with the phone's real device admin (Android); unsupported on iPhone. */
export const lockSetting = new LockSetting(api);

// Switched off in Android's settings: shown as off when Saakshi comes back to the screen.
AppState.addEventListener('change', (state) => {
  if (state === 'active') lockSetting.appActive();
});

export function useLockSetting(): LockSettingState {
  return useSyncExternalStore(lockSetting.subscribe, lockSetting.getState);
}
