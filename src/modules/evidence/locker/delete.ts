import { isActive } from './active';
import type { LockerStore } from './store';

export class SessionBusyError extends Error {}

/**
 * Ordinary delete (spec E5): removes one session's media, records, certificate and bookkeeping
 * from the phone. Refused while the session is still recording or sealing. Copies already
 * exported or sent elsewhere are not touched.
 */
export function deleteSession(store: LockerStore, id: string): void {
  if (isActive(id)) throw new SessionBusyError('This session is still being recorded or sealed.');
  store.deleteSession(id);
}
