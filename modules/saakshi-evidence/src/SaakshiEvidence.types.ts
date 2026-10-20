export type FileHashes = {
  size: number;
  sha256: string;
  sha1: string;
  md5: string;
  crc32: number;
};

export type AndroidKeyAttestation = {
  format: 'android-key-attestation';
  /** Base64 DER certificates, leaf first. */
  certificateChain: string[];
};

export type AppleAppAttest = {
  format: 'apple-app-attest';
  keyId: string;
  attestationObject: string;
  clientDataHash: string;
};

export type KeyAttestation = AndroidKeyAttestation | AppleAppAttest;

export type KeyStorage = 'strongbox' | 'tee' | 'secure-enclave' | 'software';

export type NativeDeviceKey = {
  /** SHA-256 of the DER SubjectPublicKeyInfo, lowercase hex. */
  keyId: string;
  /** Base64 of the DER SubjectPublicKeyInfo. */
  publicKeySpki: string;
  platform: 'android' | 'ios';
  storage: KeyStorage;
  attestation: KeyAttestation | null;
  attestationError: string | null;
};
