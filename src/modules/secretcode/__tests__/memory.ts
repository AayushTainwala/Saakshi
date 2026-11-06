import { createHash, randomBytes } from 'node:crypto';

import { SecretCodeStore } from '../store';

/** A secret-code store over memory, with a clock the test moves. Not a test file itself. */
export function memoryCodeStore(start = Date.parse('2026-11-06T10:00:00Z')) {
  let text: string | null = null;
  let time = start;
  let failRead = false;
  const storage = {
    read: async () => {
      if (failRead) throw new Error('Keychain not available');
      return text;
    },
    write: async (value: string) => {
      text = value;
    },
  };
  const deps = {
    storage,
    randomHex: (bytes: number) => randomBytes(bytes).toString('hex'),
    sha256Hex: async (value: string) => createHash('sha256').update(value).digest('hex'),
    now: () => time,
  };
  return {
    store: new SecretCodeStore(deps),
    /** A new store over the same storage: the app closed and opened again, or the phone restarted. */
    reopen: () => new SecretCodeStore(deps),
    saved: () => text,
    advance: (ms: number) => void (time += ms),
    setTime: (ms: number) => void (time = ms),
    now: () => time,
    breakReads: () => void (failRead = true),
  };
}
