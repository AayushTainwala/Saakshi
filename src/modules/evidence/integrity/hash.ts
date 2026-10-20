import SaakshiEvidence from '@native/saakshi-evidence';

import type { FileDigests } from '../types';

/** Hashes a file in one streaming pass in native code (modules/saakshi-evidence). */
export async function hashFile(uri: string): Promise<FileDigests> {
  if (!SaakshiEvidence) throw new Error('The SaakshiEvidence native module is not available in this build.');
  return SaakshiEvidence.hashFile(uri);
}
