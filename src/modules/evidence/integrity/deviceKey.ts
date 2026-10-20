import SaakshiEvidence, { type KeyAttestation, type NativeDeviceKey } from '@native/saakshi-evidence';

import { DEVICE_KEY_TYPE, FORMAT_VERSION } from '../constants';
import type { LockerStore } from '../locker/store';
import { base64ToBytes, spkiToPem } from './base64';
import type { Signer } from './seal';

/** device-key.json, as defined in docs/spec/evidence-bundle.md, section 6. */
export type DeviceKeyFile = {
  type: typeof DEVICE_KEY_TYPE;
  version: typeof FORMAT_VERSION;
  keyId: string;
  algorithm: 'ES256';
  publicKeySpki: string;
  publicKeyPem: string;
  platform: NativeDeviceKey['platform'];
  storage: NativeDeviceKey['storage'];
  createdAt: string;
  attestation: KeyAttestation | null;
  attestationError: string | null;
};

function native() {
  if (!SaakshiEvidence) throw new Error('The SaakshiEvidence native module is not available in this build.');
  return SaakshiEvidence;
}

export function readDeviceKeyFile(store: LockerStore): DeviceKeyFile | null {
  const json = store.readDeviceKeyJson();
  if (!json) return null;
  try {
    return JSON.parse(json) as DeviceKeyFile;
  } catch {
    return null;
  }
}

/** Merges what the phone reports about its key with what the app has saved (the iOS attestation). */
export function mergeDeviceKey(
  key: NativeDeviceKey,
  saved: DeviceKeyFile | null,
  now: Date,
): DeviceKeyFile {
  const same = saved?.keyId === key.keyId ? saved : null;
  const attestation = key.attestation ?? same?.attestation ?? null;
  return {
    type: DEVICE_KEY_TYPE,
    version: FORMAT_VERSION,
    keyId: key.keyId,
    algorithm: 'ES256',
    publicKeySpki: key.publicKeySpki,
    publicKeyPem: spkiToPem(key.publicKeySpki),
    platform: key.platform,
    storage: key.storage,
    createdAt: same?.createdAt ?? now.toISOString(),
    attestation,
    attestationError: attestation ? null : (key.attestationError ?? same?.attestationError ?? null),
  };
}

/** Creates the device key if needed and keeps device-key.json up to date. */
export async function ensureDeviceKey(store: LockerStore): Promise<DeviceKeyFile> {
  const module = native();
  const key = (await module.getDeviceKey()) ?? (await module.createDeviceKey());
  const file = mergeDeviceKey(key, readDeviceKeyFile(store), new Date());
  store.writeDeviceKeyJson(JSON.stringify(file, null, 2));
  return file;
}

/**
 * On iPhone, binds the device key to App Attest if that hasn't happened yet. Needs the internet;
 * call it when the app opens and before exporting. Failures are recorded, not thrown.
 */
export async function attestIfNeeded(store: LockerStore): Promise<DeviceKeyFile> {
  const file = await ensureDeviceKey(store);
  if (file.attestation || file.platform !== 'ios') return file;
  let updated: DeviceKeyFile;
  try {
    updated = { ...file, attestation: await native().attestDeviceKey(), attestationError: null };
  } catch (error) {
    updated = { ...file, attestationError: error instanceof Error ? error.message : String(error) };
  }
  store.writeDeviceKeyJson(JSON.stringify(updated, null, 2));
  return updated;
}

export function deviceSigner(store: LockerStore): () => Promise<Signer> {
  let signer: Promise<Signer> | null = null;
  return () => {
    signer ??= ensureDeviceKey(store).then((file) => ({
      keyId: file.keyId,
      sign: async (body: string) => base64ToBytes(await native().signUtf8(body)),
    }));
    // A failed attempt (for example, a Keystore error) is retried on the next file.
    signer.catch(() => {
      signer = null;
    });
    return signer;
  };
}
