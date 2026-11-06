import { notifyLockerChanged } from './store';

/** Sessions still being recorded or sealed. They can't be deleted until they finish. */
const active = new Set<string>();

export function markActive(id: string): void {
  if (active.has(id)) return;
  active.add(id);
  notifyLockerChanged();
}

export function markInactive(id: string): void {
  if (!active.delete(id)) return;
  notifyLockerChanged();
}

export function isActive(id: string): boolean {
  return active.has(id);
}

/** Sessions a copy or picture is being made from. They can't be deleted meanwhile either. */
const busy = new Map<string, number>();

export function markBusy(id: string): void {
  busy.set(id, (busy.get(id) ?? 0) + 1);
}

export function markIdle(id: string): void {
  const left = (busy.get(id) ?? 1) - 1;
  if (left > 0) busy.set(id, left);
  else busy.delete(id);
}

export function isBusy(id: string): boolean {
  return busy.has(id);
}

/** Runs `work` with the session marked busy. */
export async function whileBusy<T>(id: string, work: () => Promise<T>): Promise<T> {
  markBusy(id);
  try {
    return await work();
  } finally {
    markIdle(id);
  }
}

/**
 * True while anything is being recorded or sealed. Records aren't played meanwhile (fix round 1,
 * group 3): the microphone would pick the playback up, and on iPhone playing would take the sound
 * session from the recorder.
 */
export function anyActive(): boolean {
  return active.size > 0;
}
