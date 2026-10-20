import type { NativeDeviceKey } from '@native/saakshi-evidence';

import { mergeDeviceKey } from '../integrity/deviceKey';

const androidKey: NativeDeviceKey = {
  keyId: 'k1',
  publicKeySpki: 'QUJD',
  platform: 'android',
  storage: 'strongbox',
  attestation: { format: 'android-key-attestation', certificateChain: ['leaf', 'root'] },
  attestationError: null,
};

const iosKey: NativeDeviceKey = {
  keyId: 'k2',
  publicKeySpki: 'REVG',
  platform: 'ios',
  storage: 'secure-enclave',
  attestation: null,
  attestationError: null,
};

const appAttest = { format: 'apple-app-attest', keyId: 'aa', attestationObject: 'obj', clientDataHash: 'cdh' } as const;

describe('mergeDeviceKey', () => {
  it('builds device-key.json from the phone key', () => {
    const file = mergeDeviceKey(androidKey, null, new Date('2026-10-20T08:59:40.511Z'));
    expect(file).toEqual({
      type: 'saakshi.device-key',
      version: '0.1',
      keyId: 'k1',
      algorithm: 'ES256',
      publicKeySpki: 'QUJD',
      publicKeyPem: '-----BEGIN PUBLIC KEY-----\nQUJD\n-----END PUBLIC KEY-----\n',
      platform: 'android',
      storage: 'strongbox',
      createdAt: '2026-10-20T08:59:40.511Z',
      attestation: androidKey.attestation,
      attestationError: null,
    });
  });

  it('keeps the saved creation time and the iOS App Attest result for the same key', () => {
    const saved = { ...mergeDeviceKey(iosKey, null, new Date('2026-10-01T00:00:00Z')), attestation: appAttest };
    const file = mergeDeviceKey(iosKey, saved, new Date('2026-10-20T00:00:00Z'));
    expect(file.createdAt).toBe('2026-10-01T00:00:00.000Z');
    expect(file.attestation).toEqual(appAttest);
  });

  it('starts afresh when the key has changed', () => {
    const saved = { ...mergeDeviceKey(iosKey, null, new Date('2026-10-01T00:00:00Z')), attestation: appAttest };
    const file = mergeDeviceKey({ ...iosKey, keyId: 'k3' }, saved, new Date('2026-10-20T00:00:00Z'));
    expect(file.createdAt).toBe('2026-10-20T00:00:00.000Z');
    expect(file.attestation).toBeNull();
  });

  it('carries the reason when there is no attestation', () => {
    const file = mergeDeviceKey({ ...androidKey, attestation: null, attestationError: 'no chain' }, null, new Date());
    expect(file.attestationError).toBe('no chain');
  });
});
