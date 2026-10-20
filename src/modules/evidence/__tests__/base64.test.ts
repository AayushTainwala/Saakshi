import { randomBytes } from 'node:crypto';

import { base64ToBytes, bytesToBase64, spkiToPem } from '../integrity/base64';

describe('base64', () => {
  it.each([0, 1, 2, 3, 4, 5, 64, 71, 1000])('round-trips %i bytes like Buffer does', (length) => {
    const bytes = new Uint8Array(randomBytes(length));
    const encoded = bytesToBase64(bytes);
    expect(encoded).toBe(Buffer.from(bytes).toString('base64'));
    expect(base64ToBytes(encoded)).toEqual(bytes);
  });

  it('wraps a public key as PEM in 64-character lines', () => {
    const pem = spkiToPem('A'.repeat(100));
    expect(pem).toBe(`-----BEGIN PUBLIC KEY-----\n${'A'.repeat(64)}\n${'A'.repeat(36)}\n-----END PUBLIC KEY-----\n`);
  });
});
