import { createHash, randomBytes } from 'node:crypto';

import { sha256HexSync } from '../integrity/sha256Sync';

const node = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

describe('sha256HexSync', () => {
  it('gives the standard test vectors (FIPS 180-4)', () => {
    expect(sha256HexSync('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256HexSync('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256HexSync('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('agrees with Node at every length around the block edges', () => {
    for (let length = 0; length <= 200; length++) {
      const text = 'x'.repeat(length);
      expect(sha256HexSync(text)).toBe(node(text));
    }
  });

  it('agrees with Node on Hindi, emoji and long random text', () => {
    for (const text of ['साक्षी: सबूत जो बचा रहे', 'पासवर्ड 🙂 ünïcödé', randomBytes(70_000).toString('base64'), randomBytes(999).toString('hex')]) {
      expect(sha256HexSync(text)).toBe(node(text));
    }
  });
});
