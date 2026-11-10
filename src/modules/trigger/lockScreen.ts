/**
 * "Lock the phone when 'My phone is being taken' starts" (SPEC 5.4; round 2, group 1.7).
 *
 * Android only: Android's device-admin permission with the force-lock policy only (the native
 * module's LockAdminReceiver). The user switches it on in Settings, after Saakshi's explanation and
 * Android's own "Activate device admin app?" screen, and switches it off in the same place in one
 * step. It can also be switched off in Android's settings; Saakshi reads the real state again each
 * time it comes back to the screen, so it then shows as off.
 *
 * iPhone has no such permission: no app can lock its screen. There, and on Android while this is
 * off, "My phone is being taken" asks the user to lock the phone themselves.
 */

/** The native side (Android); null where it doesn't exist (iPhone, tests). */
export type LockAdminApi = {
  /** False on a phone without device admin. */
  supported(): boolean;
  active(): boolean;
  /** Android's activation screen with the explanation on it; resolves whether it is on. */
  request(explanation: string): Promise<boolean>;
  /** Switches it off; resolves whether it is still on. */
  remove(): Promise<boolean>;
  /** Locks the screen now; resolves false if it isn't on. */
  lockNow(): Promise<boolean>;
};

export type LockSettingState = {
  /** False on iPhone and on an Android phone without device admin: the setting isn't shown. */
  supported: boolean;
  on: boolean;
  busy: boolean;
  /** The last switch on or off went wrong (shown to the user until the next try). */
  failed: boolean;
};

/** After a switch-off Android hadn't finished, the state is read again this much later. */
export const RECHECK_MS = 2000;

export class LockSetting {
  private current: LockSettingState;
  private listeners = new Set<() => void>();

  constructor(private readonly api: LockAdminApi | null) {
    const supported = this.read(() => !!api?.supported(), false);
    this.current = { supported, on: supported && this.read(() => !!api?.active(), false), busy: false, failed: false };
  }

  getState = (): LockSettingState => this.current;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Reads the real state again (it may have been switched off in Android's settings). */
  refresh(): void {
    if (!this.current.supported) return;
    const on = this.read(() => !!this.api?.active(), this.current.on);
    if (on !== this.current.on) this.set({ on });
  }

  /**
   * Saakshi is back on screen: Android's own screen, if one was open, has closed. Reads the state
   * again, and ends a switch that never answered (Android can drop the answer if it closed
   * Saakshi's screen meanwhile), so the button can't stay busy.
   */
  appActive(): void {
    if (!this.current.supported) return;
    const on = this.read(() => !!this.api?.active(), this.current.on);
    if (on !== this.current.on || this.current.busy) this.set({ on, busy: false });
  }

  /** Android's "Activate device admin app?" screen, with `explanation` on it. Resolves whether it is on. */
  async switchOn(explanation: string): Promise<boolean> {
    return this.change(async (api) => {
      await api.request(explanation);
    });
  }

  /** Switches it off in one step. Resolves whether it is still on. */
  async switchOff(): Promise<boolean> {
    const on = await this.change(async (api) => {
      await api.remove();
    });
    // Android finishes switching it off a moment later; if it hadn't yet, look again.
    if (on) setTimeout(() => this.refresh(), RECHECK_MS);
    return on;
  }

  /**
   * Locks the screen, if the user switched this on. Resolves true only if the screen was locked;
   * false where it can't be (iPhone, switched off, or switched off in Android's settings meanwhile).
   */
  async lockNow(): Promise<boolean> {
    if (!this.api || !this.current.supported) return false;
    this.refresh();
    if (!this.current.on) return false;
    try {
      return await this.api.lockNow();
    } catch {
      return false;
    }
  }

  private async change(action: (api: LockAdminApi) => Promise<void>): Promise<boolean> {
    const api = this.api;
    if (!api || !this.current.supported || this.current.busy) return this.current.on;
    this.set({ busy: true, failed: false });
    let failed = false;
    try {
      await action(api);
    } catch {
      failed = true;
    }
    // Whatever was answered, the screen shows what Android says now.
    const on = this.read(() => api.active(), this.current.on);
    this.set({ busy: false, failed, on });
    return on;
  }

  private read<T>(get: () => T, fallback: T): T {
    try {
      return get();
    } catch {
      return fallback;
    }
  }

  private set(patch: Partial<LockSettingState>): void {
    this.current = { ...this.current, ...patch };
    for (const listener of this.listeners) listener();
  }
}
