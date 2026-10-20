import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { FileHashes } from './SaakshiEvidence.types';

declare class SaakshiEvidenceModule extends NativeModule {
  /** Reads a local file once and returns its size, SHA-256, SHA-1, MD5 and CRC-32. */
  hashFile(uri: string): Promise<FileHashes>;
}

/** Null where the native module isn't built in (unit tests, Expo Go). */
export default requireOptionalNativeModule<SaakshiEvidenceModule>('SaakshiEvidence');
