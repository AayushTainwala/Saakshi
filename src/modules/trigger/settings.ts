import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';

import { checkCode, type CodeProblem } from './code';

/** What the code pad does when the right code is typed. */
export type TriggerAction = 'alert' | 'confiscation';

export type TriggerSettings = {
  code: string | null;
  action: TriggerAction;
};

const DEFAULTS: TriggerSettings = { code: null, action: 'alert' };

export function sanitizeTriggerSettings(raw: unknown): TriggerSettings {
  const value = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    code: typeof value.code === 'string' && checkCode(value.code) === null ? value.code : null,
    action: value.action === 'confiscation' ? 'confiscation' : 'alert',
  };
}

export type SettingsStorage = { read(): string | null; write(text: string): void };

export class TriggerSettingsStore {
  private value: TriggerSettings | null = null;
  private listeners = new Set<() => void>();

  constructor(private readonly storage: SettingsStorage) {}

  get = (): TriggerSettings => {
    if (!this.value) {
      try {
        const text = this.storage.read();
        this.value = text ? sanitizeTriggerSettings(JSON.parse(text)) : DEFAULTS;
      } catch {
        this.value = DEFAULTS;
      }
    }
    return this.value;
  };

  /** Sets the code, unless it is malformed or an emergency number. */
  setCode(code: string): CodeProblem | null {
    const problem = checkCode(code);
    if (!problem) this.save({ ...this.get(), code });
    return problem;
  }

  clearCode(): void {
    this.save({ ...this.get(), code: null });
  }

  setAction(action: TriggerAction): void {
    this.save({ ...this.get(), action });
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private save(value: TriggerSettings): void {
    this.storage.write(JSON.stringify({ version: 1, ...value }));
    this.value = value;
    for (const listener of this.listeners) listener();
  }
}

const FILE_NAME = 'sos-trigger.json';

export const triggerSettings = new TriggerSettingsStore({
  read() {
    const file = new File(Paths.document, FILE_NAME);
    return file.exists ? file.textSync() : null;
  },
  write(text) {
    const file = new File(Paths.document, FILE_NAME);
    if (!file.exists) file.create();
    file.writeSync(text);
  },
});

export function useTriggerSettings(): TriggerSettings {
  return useSyncExternalStore(triggerSettings.subscribe, triggerSettings.get);
}
