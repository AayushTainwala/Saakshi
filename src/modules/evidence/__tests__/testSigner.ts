import { createHash, generateKeyPairSync, sign } from 'node:crypto';

import type { Signer } from '../integrity/seal';

/** A real ES256 key in Node's crypto, standing in for the phone's hardware key. */
export function testSigner() {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const spki = publicKey.export({ type: 'spki', format: 'der' });
  const keyId = createHash('sha256').update(spki).digest('hex');
  const signer: Signer = {
    keyId,
    sign: async (body) => new Uint8Array(sign('sha256', Buffer.from(body, 'utf8'), privateKey)),
  };
  return { signer, publicKey, spki, keyId };
}

export const nodeSha256Hex = async (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
