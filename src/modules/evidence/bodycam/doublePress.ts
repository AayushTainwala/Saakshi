import { UNLOCK_WINDOW_MS } from './constants';

/** Calls `onDouble` when `press` is called twice within `windowMs`. */
export function doublePress(onDouble: () => void, windowMs = UNLOCK_WINDOW_MS) {
  let last: number | null = null;
  return (at: number = Date.now()) => {
    if (last !== null && at - last <= windowMs) {
      last = null;
      onDouble();
    } else {
      last = at;
    }
  };
}
