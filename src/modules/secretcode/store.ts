import { checkNewCode, type CodeProblem, waitAfter } from './code';

/**
 * Where the code is kept: the phone's secure storage (iOS Keychain; on Android, values encrypted
 * with a key in the Android Keystore), never the preferences file and never a log. Tests use memory.
 */
export type SecretStorage = {
  read(): Promise<string | null>;
  write(text: string): Promise<void>;
};

export type SecretCodeDeps = {
  storage: SecretStorage;
  randomHex: (bytes: number) => string;
  sha256Hex: (text: string) => Promise<string>;
  now: () => number;
};

/** What is stored. The code itself never is: only a random salt and the SHA-256 of salt and code. */
type Saved = {
  version: 1;
  code: { salt: string; hash: string } | null;
  /** Wrong tries in a row; back to 0 after the right code. */
  wrongTries: number;
  /** When the current wait ends (milliseconds since 1970, by the phone's clock), or null. */
  waitUntil: number | null;
  /** When the last wrong try was, to notice the phone's clock being set back. */
  lastWrongAt: number | null;
};

const EMPTY: Saved = { version: 1, code: null, wrongTries: 0, waitUntil: null, lastWrongAt: null };

/** What the screens show. It always follows what is stored, at once after every change. */
export type SecretCodeState = {
  loaded: boolean;
  set: boolean;
  wrongTries: number;
  waitUntil: number | null;
};

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'none' }
  | { ok: false; reason: 'wait'; waitUntil: number }
  | { ok: false; reason: 'wrong'; wrongTries: number; waitUntil: number | null };

export type SetResult = { ok: true } | { ok: false; reason: CodeProblem | 'already-set' };
export type ChangeResult = SetResult | Exclude<VerifyResult, { ok: true }>;

const PREFIX = 'saakshi.secret-code.v1';

/**
 * The one secret code (SPEC 5.3). Set, changed and removed in Settings; asked for before anything
 * that was turned on is turned off.
 *
 * A wrong try is counted before the code is compared and written to storage at once, so closing
 * the app in the middle of a try doesn't undo it. The count and the end of the wait survive closing
 * the app and restarting the phone. If the phone's clock is set back past the last wrong try, the
 * wait starts again from the new time.
 *
 * With only 10,000 four-digit codes, no hash would stop someone who could read the stored hash from
 * trying them all; the hash keeps the code itself out of storage, and the secure storage and the
 * waits are what protect it.
 */
export class SecretCodeStore {
  private saved: Saved | null = null;
  private snapshot: SecretCodeState = { loaded: false, set: false, wrongTries: 0, waitUntil: null };
  private listeners = new Set<() => void>();
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly deps: SecretCodeDeps) {}

  getState = (): SecretCodeState => this.snapshot;

  /** The clock the waits are counted on (the phone's). */
  now = (): number => this.deps.now();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Reads the stored state once (later calls return at once). */
  load(): Promise<SecretCodeState> {
    return this.serial(async () => {
      await this.current();
      return this.snapshot;
    });
  }

  isSet(): Promise<boolean> {
    return this.load().then((state) => state.set);
  }

  /** Sets the first code. */
  setCode(code: string): Promise<SetResult> {
    return this.serial(async () => {
      const saved = await this.current();
      if (saved.code) return { ok: false, reason: 'already-set' } as const;
      const problem = checkNewCode(code);
      if (problem) return { ok: false, reason: problem } as const;
      await this.save({ ...EMPTY, code: await this.digest(code) });
      return { ok: true } as const;
    });
  }

  /** Checks a code. Wrong tries make the next wait longer. */
  verify(code: string): Promise<VerifyResult> {
    return this.serial(() => this.check(code));
  }

  /** Changes the code: the current one first, then the new one. */
  changeCode(current: string, next: string): Promise<ChangeResult> {
    return this.serial(async () => {
      const problem = checkNewCode(next);
      if (problem) return { ok: false, reason: problem } as const;
      const checked = await this.check(current);
      if (!checked.ok) return checked;
      await this.save({ ...EMPTY, code: await this.digest(next) });
      return { ok: true } as const;
    });
  }

  /** Removes the code, after the current one. */
  removeCode(current: string): Promise<VerifyResult> {
    return this.serial(async () => {
      const checked = await this.check(current);
      if (!checked.ok) return checked;
      await this.save(EMPTY);
      return { ok: true } as const;
    });
  }

  /**
   * Forgets the code and the wrong tries. Only for a reset with the phone's own passcode, which
   * `resetWithPhonePasscode` allows only while nothing is running.
   */
  clear(): Promise<void> {
    return this.serial(() => this.save(EMPTY));
  }

  private async check(code: string): Promise<VerifyResult> {
    let saved = await this.current();
    const stored = saved.code;
    if (!stored) return { ok: false, reason: 'none' };
    const now = this.deps.now();

    // The phone's clock was set back past the last wrong try: the wait starts again from now.
    if (saved.lastWrongAt !== null && now < saved.lastWrongAt) {
      const wait = waitAfter(saved.wrongTries);
      saved = { ...saved, lastWrongAt: now, waitUntil: wait > 0 ? now + wait : null };
      await this.save(saved);
    }
    if (saved.waitUntil !== null && now < saved.waitUntil) return { ok: false, reason: 'wait', waitUntil: saved.waitUntil };

    // Counted before comparing, and stored at once.
    const wrongTries = saved.wrongTries + 1;
    const wait = waitAfter(wrongTries);
    const charged: Saved = { ...saved, wrongTries, lastWrongAt: now, waitUntil: wait > 0 ? now + wait : null };
    await this.save(charged);

    const hash = await this.deps.sha256Hex(`${PREFIX}|${stored.salt}|${code}`);
    if (sameText(hash, stored.hash)) {
      await this.save({ ...charged, wrongTries: 0, lastWrongAt: null, waitUntil: null });
      return { ok: true };
    }
    return { ok: false, reason: 'wrong', wrongTries, waitUntil: charged.waitUntil };
  }

  private async digest(code: string): Promise<{ salt: string; hash: string }> {
    const salt = this.deps.randomHex(16);
    return { salt, hash: await this.deps.sha256Hex(`${PREFIX}|${salt}|${code}`) };
  }

  /**
   * The stored state. If the secure storage can't be read, this fails, and so does whatever asked:
   * treating it as "no code" would let a new code be set over the real one, and a Stop go through.
   */
  private async current(): Promise<Saved> {
    if (!this.saved) {
      const text = await this.deps.storage.read();
      let saved = EMPTY;
      try {
        if (text) saved = sanitize(JSON.parse(text));
      } catch {
        // Unreadable contents (not an unreadable store): nothing usable was kept.
        saved = EMPTY;
      }
      this.saved = saved;
      this.publish();
    }
    return this.saved;
  }

  private async save(saved: Saved): Promise<void> {
    await this.deps.storage.write(JSON.stringify(saved));
    this.saved = saved;
    this.publish();
  }

  private publish(): void {
    const saved = this.saved ?? EMPTY;
    this.snapshot = { loaded: true, set: saved.code !== null, wrongTries: saved.wrongTries, waitUntil: saved.waitUntil };
    for (const listener of this.listeners) listener();
  }

  private serial<T>(work: () => Promise<T>): Promise<T> {
    const result = this.queue.then(work);
    this.queue = result.catch(() => undefined);
    return result;
  }
}

function sanitize(raw: unknown): Saved {
  const value = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const code = value.code as { salt?: unknown; hash?: unknown } | null | undefined;
  const validCode =
    code && typeof code.salt === 'string' && typeof code.hash === 'string' && /^[0-9a-f]{64}$/.test(code.hash)
      ? { salt: code.salt, hash: code.hash }
      : null;
  const number = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : null);
  return {
    version: 1,
    code: validCode,
    wrongTries: Math.max(0, Math.floor(number(value.wrongTries) ?? 0)),
    waitUntil: number(value.waitUntil),
    lastWrongAt: number(value.lastWrongAt),
  };
}

/** Compares two hex strings without stopping at the first difference. */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
