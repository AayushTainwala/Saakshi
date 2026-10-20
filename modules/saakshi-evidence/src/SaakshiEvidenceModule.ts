import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { FileHashes, KeyAttestation, NativeDeviceKey } from './SaakshiEvidence.types';

declare class SaakshiEvidenceModule extends NativeModule {
  /** Reads a local file once and returns its size, SHA-256, SHA-1, MD5 and CRC-32. */
  hashFile(uri: string): Promise<FileHashes>;
  /** The device key, or null before it is created. On iOS `attestation` is always null here. */
  getDeviceKey(): Promise<NativeDeviceKey | null>;
  /** Creates the device key if there is none (Android attests it at creation). */
  createDeviceKey(): Promise<NativeDeviceKey>;
  /** iOS: runs App Attest over the device key (needs the internet). Android: returns the attestation chain. */
  attestDeviceKey(): Promise<KeyAttestation>;
  /** ES256 signature of the message's UTF-8 bytes, DER, in Base64. */
  signUtf8(message: string): Promise<string>;
}

/** Null where the native module isn't built in (unit tests, Expo Go). */
export default requireOptionalNativeModule<SaakshiEvidenceModule>('SaakshiEvidence');
