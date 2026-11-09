import { checkNewCode, type CodeProblem, waitAfter } from './code';
import { makeRecoveryCode, normalizeRecoveryCode, RECOVERY_ITERATIONS, RECOVERY_PREFIX } from './recovery';

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
  /** The recovery code's slow hash: PBKDF2-HMAC-SHA256 of `secret` with the salt, as hex. */
  slowHashHex: (secret: string, saltHex: string, iterations: number) => Promise<string>;
  now: () => number;
};

/** The recovery code as stored (round 2, group 1.6): a random salt and its slow hash, never the code. */
type SavedRecovery = { salt: string; hash: string; iterations: number; madeAt: number };

/** What is stored. The code itself never is: only a random salt and the SHA-256 of salt and code. */
type Saved = {
  version: 1;
  code: { salt: string; hash: string } | null;
  /** Wrong tries in a row (of the code and the recovery code together); back to 0 after a right one. */
  wrongTries: number;
  /** When the current wait ends (milliseconds since 1970, by the phone's clock), or null. */
  waitUntil: number | null;
  /** When the last wrong try was, to notice the phone's clock being set back. */
  lastWrongAt: number | null;
  /** From group 1.6, on a phone with no screen lock; absent (null) before. */
  recovery: SavedRecovery | null;
};

const EMPTY: Saved = { version: 1, code: null, wrongTries: 0, waitUntil: null, lastWrongAt: null, recovery: null };

/** What the screens show. It always follows what is stored, at once after every change. */
export type SecretCodeState = {
  loaded: boolean;
  set: boolean;
  wrongTries: number;
  waitUntil: number | null;
  /** Whether a recovery code is kept, and when it was made. */
  recovery: boolean;
  recoveryMadeAt: number | null;
};

type Failure = { ok: false; reason: 'none' } | { ok: false; reason: 'wait'; waitUntil: number } | { ok: false; reason: 'wrong'; wrongTries: number; waitUntil: number | null };

export type VerifyResult = { ok: true } | Failure;

/** A recovery code checked: as for the code, or none kept, or not in a recovery code's form. */
export type RecoveryResult = VerifyResult | { ok: false; reason: 'no-recovery' } | { ok: false; reason: 'format' };

/** With `recoveryCode` when one was made: shown once, and never kept. */
export type SetResult = { ok: true; recoveryCode?: string } | { ok: false; reason: CodeProblem | 'already-set' };
export type ChangeResult = SetResult | Failure;
export type NewRecoveryResult = { ok: true; recoveryCode: string } | Failure;

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
  private snapshot: SecretCodeState = { loaded: false, set: false, wrongTries: 0, waitUntil: null, recovery: false, recoveryMadeAt: null };
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

  /**
   * Sets the first code. With `recovery` (a phone with no screen lock; round 2, group 1.6), a
   * recovery code is made in the same step and returned, to be shown once; only its slow hash is
   * kept.
   */
  setCode(code: string, options: { recovery?: boolean } = {}): Promise<SetResult> {
    return this.serial(async () => {
      const saved = await this.current();
      if (saved.code) return { ok: false, reason: 'already-set' } as const;
      const problem = checkNewCode(code);
      if (problem) return { ok: false, reason: problem } as const;
      const digest = await this.digest(code);
      if (!options.recovery) {
        await this.save({ ...EMPTY, code: digest });
        return { ok: true } as const;
      }
      const { recoveryCode, recovery } = await this.newRecovery();
      await this.save({ ...EMPTY, code: digest, recovery });
      return { ok: true, recoveryCode } as const;
    });
  }

  /**
   * Makes a new recovery code after the current secret code (Settings, or when Saakshi asks for
   * one). The old recovery code stops working. Wrong tries count as for any try of the code.
   */
  newRecoveryCode(current: string): Promise<NewRecoveryResult> {
    return this.serial(async () => {
      const checked = await this.check(current);
      if (!checked.ok) return checked;
      const { recoveryCode, recovery } = await this.newRecovery();
      await this.save({ ...(await this.current()), recovery });
      return { ok: true, recoveryCode } as const;
    });
  }

  /**
   * Checks a recovery code. It shares the code's wrong tries and waits: a wrong recovery code
   * makes the next wait longer, and no recovery code is taken during a wait. Something that can't
   * be a recovery code (the wrong length or characters) is refused without counting: its form is
   * no secret. The right one doesn't reset anything by itself; `resetWithRecoveryCode` does that,
   * only while nothing is running.
   */
  verifyRecovery(input: string): Promise<RecoveryResult> {
    return this.serial(async () => {
      const saved = await this.current();
      if (!saved.code) return { ok: false, reason: 'none' } as const;
      if (!saved.recovery) return { ok: false, reason: 'no-recovery' } as const;
      const code = normalizeRecoveryCode(input);
      if (!code) return { ok: false, reason: 'format' } as const;
      const { salt, hash, iterations } = saved.recovery;
      return this.oneTry(async () => sameText(await this.deps.slowHashHex(`${RECOVERY_PREFIX}|${code}`, salt, iterations), hash));
    });
  }

  /** Checks a code. Wrong tries make the next wait longer. */
  verify(code: string): Promise<VerifyResult> {
    return this.serial(() => this.check(code));
  }

  /** Changes the code: the current one first, then the new one. A recovery code is kept. */
  changeCode(current: string, next: string): Promise<ChangeResult> {
    return this.serial(async () => {
      const problem = checkNewCode(next);
      if (problem) return { ok: false, reason: problem } as const;
      const checked = await this.check(current);
      if (!checked.ok) return checked;
      const { recovery } = await this.current();
      await this.save({ ...EMPTY, code: await this.digest(next), recovery });
      return { ok: true } as const;
    });
  }

  /** Removes the code, after the current one, and the recovery code with it. */
  removeCode(current: string): Promise<VerifyResult> {
    return this.serial(async () => {
      const checked = await this.check(current);
      if (!checked.ok) return checked;
      await this.save(EMPTY);
      return { ok: true } as const;
    });
  }

  /**
   * Forgets the code, the recovery code and the wrong tries. Only for a reset with the phone's own
   * passcode or the recovery code, which `resetWithPhonePasscode` and `resetWithRecoveryCode` allow
   * only while nothing is running. A recovery code works once: a new code makes a new one.
   */
  clear(): Promise<void> {
    return this.serial(() => this.save(EMPTY));
  }

  private async check(code: string): Promise<VerifyResult> {
    const stored = (await this.current()).code;
    if (!stored) return { ok: false, reason: 'none' };
    return this.oneTry(async () => sameText(await this.deps.sha256Hex(`${PREFIX}|${stored.salt}|${code}`), stored.hash));
  }

  /**
   * One try, of the code or the recovery code: refused during a wait; otherwise counted as wrong
   * and stored before `matches` runs, then taken back if it matched.
   */
  private async oneTry(matches: () => Promise<boolean>): Promise<VerifyResult> {
    let saved = await this.current();
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

    if (await matches()) {
      await this.save({ ...charged, wrongTries: 0, lastWrongAt: null, waitUntil: null });
      return { ok: true };
    }
    return { ok: false, reason: 'wrong', wrongTries, waitUntil: charged.waitUntil };
  }

  /** A new recovery code and what is kept of it. */
  private async newRecovery(): Promise<{ recoveryCode: string; recovery: SavedRecovery }> {
    const recoveryCode = makeRecoveryCode((count) => fromHex(this.deps.randomHex(count)));
    const salt = this.deps.randomHex(16);
    const hash = await this.deps.slowHashHex(`${RECOVERY_PREFIX}|${recoveryCode}`, salt, RECOVERY_ITERATIONS);
    if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error('The recovery code could not be hashed');
    return { recoveryCode, recovery: { salt, hash, iterations: RECOVERY_ITERATIONS, madeAt: this.deps.now() } };
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
    this.snapshot = {
      loaded: true,
      set: saved.code !== null,
      wrongTries: saved.wrongTries,
      waitUntil: saved.waitUntil,
      recovery: saved.recovery !== null,
      recoveryMadeAt: saved.recovery?.madeAt ?? null,
    };
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
  const recovery = value.recovery as Partial<SavedRecovery> | null | undefined;
  const validRecovery =
    validCode &&
    recovery &&
    typeof recovery.salt === 'string' &&
    typeof recovery.hash === 'string' &&
    /^[0-9a-f]{64}$/.test(recovery.hash) &&
    typeof recovery.iterations === 'number' &&
    Number.isInteger(recovery.iterations) &&
    recovery.iterations >= 1
      ? { salt: recovery.salt, hash: recovery.hash, iterations: recovery.iterations, madeAt: number(recovery.madeAt) ?? 0 }
      : null;
  return {
    version: 1,
    code: validCode,
    wrongTries: Math.max(0, Math.floor(number(value.wrongTries) ?? 0)),
    waitUntil: number(value.waitUntil),
    lastWrongAt: number(value.lastWrongAt),
    recovery: validRecovery,
  };
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/** Compares two hex strings without stopping at the first difference. */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
