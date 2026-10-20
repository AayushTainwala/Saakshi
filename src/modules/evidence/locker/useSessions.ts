import { useMemo, useSyncExternalStore } from 'react';

import type { SessionState } from '../types';
import { fileLocker, lockerVersion, subscribeToLocker } from './store';

export function useSessions(): SessionState[] {
  const version = useSyncExternalStore(subscribeToLocker, lockerVersion);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read the locker whenever it changes
  return useMemo(() => fileLocker.listSessions(), [version]);
}

export function useSession(id: string): SessionState | null {
  const version = useSyncExternalStore(subscribeToLocker, lockerVersion);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read the session whenever the locker changes
  return useMemo(() => fileLocker.readSession(id), [id, version]);
}
