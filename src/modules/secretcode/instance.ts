import { CryptoDigestAlgorithm, digestStringAsync, getRandomBytes } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useSyncExternalStore } from 'react';

import i18n from '@/i18n';

import { resetWithPhonePasscode as reset, type ResetOutcome } from './reset';
import { whatIsRunning } from './running';
import { type SecretCodeState, SecretCodeStore } from './store';

const KEY = 'saakshi.secret-code';
// "This device only": never in iCloud Keychain or a backup. Readable once the phone has been
// unlocked after starting, so that a Stop in the background can still be checked.
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
// iPhone keeps Keychain items after the app is deleted. A code from an earlier install is
// forgotten, so that a reinstalled app doesn't start with a code nobody remembers.
const INSTALL_MARKER = 'secret-code-install.json';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function freshInstall(): Promise<boolean> {
  const marker = new File(Paths.document, INSTALL_MARKER);
  if (marker.exists) return false;
  await SecureStore.deleteItemAsync(KEY, OPTIONS);
  marker.create();
  marker.writeSync(JSON.stringify({ version: 1 }));
  return true;
}

export const secretCode = new SecretCodeStore({
  storage: {
    async read() {
      if (await freshInstall()) return null;
      return SecureStore.getItemAsync(KEY, OPTIONS);
    },
    write: (text) => SecureStore.setItemAsync(KEY, text, OPTIONS),
  },
  randomHex: (bytes) => toHex(getRandomBytes(bytes)),
  sha256Hex: (text) => digestStringAsync(CryptoDigestAlgorithm.SHA256, text),
  now: () => Date.now(),
});

/** Whether a secret code is set (for "My phone is being taken", which needs one). */
export function isSecretCodeSet(): Promise<boolean> {
  return secretCode.isSet();
}

export function useSecretCode(): SecretCodeState {
  useEffect(() => {
    secretCode.load().catch(() => undefined);
  }, []);
  return useSyncExternalStore(secretCode.subscribe, secretCode.getState);
}

/** The reset with the phone's own passcode, with the real prompt. */
export function resetWithPhonePasscode(): Promise<ResetOutcome> {
  return reset({
    running: whatIsRunning,
    hasScreenLock: async () => (await LocalAuthentication.getEnrolledLevelAsync()) !== LocalAuthentication.SecurityLevel.NONE,
    authenticate: async () => {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: i18n.t('secretcode:reset.prompt'),
        cancelLabel: i18n.t('secretcode:cancel'),
        disableDeviceFallback: false,
      });
      return { success: result.success, noPasscode: !result.success && result.error === 'passcode_not_set' };
    },
    clear: () => secretCode.clear(),
  });
}
