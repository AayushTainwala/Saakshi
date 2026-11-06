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

/**
 * True while anything is being recorded or sealed. Records aren't played meanwhile (fix round 1,
 * group 3): the microphone would pick the playback up, and on iPhone playing would take the sound
 * session from the recorder.
 */
export function anyActive(): boolean {
  return active.size > 0;
}
