import SaakshiDevice from '@native/saakshi-device';
import { CryptoDigestAlgorithm, digestStringAsync, getRandomBytes } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import i18n from '@/i18n';

import {
  type RecoveryResetResult,
  resetMethodFor,
  type ResetMethod,
  resetWithPhonePasscode as reset,
  resetWithRecoveryCode as recoveryReset,
  type ResetOutcome,
} from './reset';
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
  // PBKDF2-HMAC-SHA256 in native code (modules/saakshi-device), 32 bytes.
  slowHashHex: async (secret, salt, iterations) => {
    if (!SaakshiDevice) throw new Error('The SaakshiDevice native module is not available in this build.');
    return SaakshiDevice.pbkdf2Sha256(secret, salt, iterations, 32);
  },
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

/** What this phone has: a screen lock, and a prompt for it alone. Null if it can't be asked. */
function phoneLock(): { hasScreenLock: boolean; canAskPasscodeOnly: boolean } | null {
  try {
    if (!SaakshiDevice) return null;
    return { hasScreenLock: SaakshiDevice.hasScreenLock(), canAskPasscodeOnly: SaakshiDevice.canAskPasscodeOnly() };
  } catch {
    return null;
  }
}

/** How a forgotten code is reset on this phone now (round 2, group 1.6). */
export function currentResetMethod(): ResetMethod {
  return resetMethodFor(phoneLock());
}

/**
 * How a forgotten code is reset on this phone, read again whenever Saakshi comes back on screen
 * (the screen lock may have been turned on or off in the phone's Settings meanwhile).
 */
export function useResetMethod(): ResetMethod {
  const [method, setMethod] = useState<ResetMethod>(currentResetMethod);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setMethod(currentResetMethod());
    });
    return () => subscription.remove();
  }, []);
  return method;
}

/** The reset with the phone's own passcode, and only the passcode, with the real prompt. */
export function resetWithPhonePasscode(): Promise<ResetOutcome> {
  return reset({
    running: whatIsRunning,
    hasScreenLock: async () => phoneLock()?.hasScreenLock ?? false,
    authenticate: async () => {
      if (!SaakshiDevice) return 'unavailable';
      return SaakshiDevice.confirmScreenLock(i18n.t('secretcode:reset.prompt'), i18n.t('secretcode:reset.promptDetail'));
    },
    clear: () => secretCode.clear(),
  });
}

/** The reset with the recovery code, on a phone with no screen lock. */
export function resetWithRecoveryCode(input: string): Promise<RecoveryResetResult> {
  return recoveryReset(input, {
    running: whatIsRunning,
    verify: (text) => secretCode.verifyRecovery(text),
    clear: () => secretCode.clear(),
  });
}
