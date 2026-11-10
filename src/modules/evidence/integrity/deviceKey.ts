import SaakshiEvidence, { type KeyAttestation, type NativeDeviceKey } from '@native/saakshi-evidence';

import { DEVICE_KEY_TYPE, FORMAT_VERSION } from '../constants';
import type { LockerStore } from '../locker/store';
import { base64ToBytes, spkiToPem } from './base64';
import type { Signer } from './seal';

/** A key's file, as defined in docs/spec/evidence-bundle.md, section 6. */
export type DeviceKeyFile = {
  type: typeof DEVICE_KEY_TYPE;
  /** The format version when the file was last written. */
  version: string;
  keyId: string;
  algorithm: 'ES256';
  publicKeySpki: string;
  publicKeyPem: string;
  platform: NativeDeviceKey['platform'];
  storage: NativeDeviceKey['storage'];
  createdAt: string;
  attestation: KeyAttestation | null;
  attestationError: string | null;
  /**
   * From 0.11, optional: the id of the key this phone had before, when this key was made because
   * that one was no longer in the phone's security hardware. Absent for a phone's first key.
   */
  replaces?: string;
};

/** What the phone's security hardware does for the app: holds the key, and signs with it. */
export type KeyHardware = {
  getDeviceKey: () => Promise<NativeDeviceKey | null>;
  createDeviceKey: () => Promise<NativeDeviceKey>;
  attestDeviceKey: () => Promise<KeyAttestation>;
  signUtf8: (message: string) => Promise<string>;
};

function native(): KeyHardware {
  if (!SaakshiEvidence) throw new Error('The SaakshiEvidence native module is not available in this build.');
  return SaakshiEvidence;
}

/** The file of one of this phone's keys, or null if the phone has none for that id. */
export function readKeyFile(store: LockerStore, keyId: string): DeviceKeyFile | null {
  return parseKeyFile(store.readKeyJson(keyId), keyId);
}

function parseKeyFile(json: string | null, keyId: string): DeviceKeyFile | null {
  if (!json) return null;
  try {
    const file = JSON.parse(json) as DeviceKeyFile;
    return file.keyId === keyId && typeof file.publicKeyPem === 'string' ? file : null;
  } catch {
    return null;
  }
}

/** Merges what the phone reports about its key with what the app has saved (the iOS attestation). */
export function mergeDeviceKey(key: NativeDeviceKey, saved: DeviceKeyFile | null, now: Date): DeviceKeyFile {
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
    ...(same?.replaces ? { replaces: same.replaces } : {}),
  };
}

/** The key this phone had last, before `keyId`: the newest of the other keys with a file. */
function keyBefore(store: LockerStore, keyId: string): DeviceKeyFile | null {
  let latest: DeviceKeyFile | null = null;
  for (const id of store.listKeyIds()) {
    if (id === keyId) continue;
    const file = readKeyFile(store, id);
    if (file && (!latest || file.createdAt > latest.createdAt)) latest = file;
  }
  return latest;
}

/** A new key waiting to be said in a signed record: `key.replaces` in the first record it signs. */
type KeyChange = { keyId: string; replaces: string };

function readKeyChange(store: LockerStore): KeyChange | null {
  try {
    const change = JSON.parse(store.readKeyChange() ?? 'null') as KeyChange | null;
    return change && typeof change.keyId === 'string' && typeof change.replaces === 'string' ? change : null;
  } catch {
    return null;
  }
}

// One at a time: two recordings sealing at once must not both find "no key" and make one each.
let turn: Promise<unknown> = Promise.resolve();

/**
 * Asks the phone which signing key it holds now, makes one if it holds none, and keeps that key's
 * own file up to date (repair round A, group 3). A key's file is `keys/<key id>.json`; no key's
 * file is ever written over by another's.
 *
 * If the phone's key is not the one whose file was written last, the earlier key is gone from the
 * security hardware (a new phone the app's files were moved to, say). The new key's file says which
 * key it `replaces`, the old key's file stays, and the change waits to be said in the next signed
 * record (`deviceSigner`). Nothing is refused because the key changed.
 */
export function ensureDeviceKey(store: LockerStore, hardware: KeyHardware = native(), now: () => Date = () => new Date()): Promise<DeviceKeyFile> {
  const next = turn.then(async () => {
    const key = (await hardware.getDeviceKey()) ?? (await hardware.createDeviceKey());
    const savedText = store.readKeyJson(key.keyId);
    const saved = parseKeyFile(savedText, key.keyId);
    let file = mergeDeviceKey(key, saved, now());
    if (!saved) {
      const before = keyBefore(store, key.keyId);
      if (before) {
        file = { ...file, replaces: before.keyId };
        store.writeKeyChange(JSON.stringify({ keyId: key.keyId, replaces: before.keyId } satisfies KeyChange));
      }
    }
    const text = JSON.stringify(file, null, 2);
    // Asked before every record: the file is written only when what it says has changed.
    if (savedText !== text) store.writeKeyJson(key.keyId, text);
    return file;
  });
  turn = next.catch(() => undefined);
  return next;
}

/**
 * On iPhone, binds the device key to App Attest if that hasn't happened yet. Needs the internet;
 * call it when the app opens and before exporting. Failures are recorded, not thrown. Only the
 * phone's present key can be attested, and only its own file is written.
 */
export async function attestIfNeeded(store: LockerStore, hardware: KeyHardware = native()): Promise<DeviceKeyFile> {
  const file = await ensureDeviceKey(store, hardware);
  if (file.attestation || file.platform !== 'ios') return file;
  let updated: DeviceKeyFile;
  try {
    updated = { ...file, attestation: await hardware.attestDeviceKey(), attestationError: null };
  } catch (error) {
    updated = { ...file, attestationError: error instanceof Error ? error.message : String(error) };
  }
  store.writeKeyJson(updated.keyId, JSON.stringify(updated, null, 2));
  return updated;
}

/**
 * The signer for the next record. It asks the phone for its key each time, so that a record always
 * names the key that signs it, and a key that has changed is noticed when the app next signs.
 * `replaces` is set while a new key has not yet been said in a signed record; `said()` is called
 * once a record carrying it has been written.
 */
export function deviceSigner(store: LockerStore, hardware?: KeyHardware): () => Promise<Signer> {
  return async () => {
    const chip = hardware ?? native();
    const file = await ensureDeviceKey(store, chip);
    const change = readKeyChange(store);
    const replaces = change?.keyId === file.keyId ? change.replaces : undefined;
    return {
      keyId: file.keyId,
      ...(replaces ? { replaces, said: () => store.writeKeyChange(null) } : {}),
      sign: async (body: string) => base64ToBytes(await chip.signUtf8(body)),
    };
  };
}

/**
 * The files of the keys that signed these records, in the order the records first use them: what a
 * bundle carries (docs/spec/evidence-bundle.md, section 7). Throws if a key's file is not on this
 * phone: without its public key the records it signed can't be checked.
 */
export function keysThatSigned(store: LockerStore, records: readonly { sequence: number; key: { id: string } }[]): DeviceKeyFile[] {
  const files: DeviceKeyFile[] = [];
  const seen = new Set<string>();
  for (const record of [...records].sort((a, b) => a.sequence - b.sequence)) {
    if (seen.has(record.key.id)) continue;
    seen.add(record.key.id);
    const file = readKeyFile(store, record.key.id);
    if (!file) {
      throw new Error(
        `The key that signed this recording (${record.key.id.slice(0, 16)}…) has no file on this phone, so a bundle of it could not be checked. Its files can still be shared one by one.`,
      );
    }
    files.push(file);
  }
  return files;
}
