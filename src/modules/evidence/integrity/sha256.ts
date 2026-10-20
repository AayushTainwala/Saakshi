import { CryptoDigestAlgorithm, CryptoEncoding, digestStringAsync } from 'expo-crypto';

/** SHA-256 of a string's UTF-8 bytes, lowercase hex. */
export function sha256Hex(text: string): Promise<string> {
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, text, { encoding: CryptoEncoding.HEX });
}
