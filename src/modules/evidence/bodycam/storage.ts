import {
  SAFETY_FLOOR_BYTES,
  soundBytesPerSecond,
  type StorageAction,
  type StorageTarget,
  videoBytesPerSecond,
} from '@/platform/storage';

/** What body-cam does about one reading of the phone's free space. */
export type BodyCamStorageStep =
  /** Say that about this many minutes of video (or, once sound only, of sound) are left. */
  | { do: 'warn'; minutes: number; of: 'video' | 'sound' }
  /** The keep-free amount is reached: stop video and carry on as sound only. */
  | { do: 'sound-only' }
  /** Stop cleanly, with the end reason `storage-full`. */
  | { do: 'stop'; at: 'keep-free' | 'floor' }
  /** The phone didn't say how much is free, or says again. Nothing stops for this. */
  | { do: 'unknown' }
  | { do: 'known' };

/**
 * Body-cam and the phone's room (SPEC section 4, "Storage", stage one; repair round A, group 2).
 *
 * While it records video, body-cam watches for the keep-free amount. There, with "sound only" on
 * (it is unless the user switched it off), video stops and the recording carries on as sound, which
 * takes about a fiftieth of the room; from then it watches for the safety floor. With "sound only"
 * off, it stops at the keep-free amount. At the floor it always stops.
 */
export function bodyCamStoragePlan(options: { keepFreeBytes: number; soundOnly: boolean; quality: 720 | 1080; os?: string }) {
  let sound = false;
  return {
    /** Whether body-cam has dropped to sound only. */
    get soundOnly() {
      return sound;
    },
    /** What to watch for now. */
    target(): StorageTarget {
      return sound
        ? { limitBytes: SAFETY_FLOOR_BYTES, floorBytes: SAFETY_FLOOR_BYTES, bytesPerSecond: soundBytesPerSecond(options.os) }
        : {
            limitBytes: Math.max(options.keepFreeBytes, SAFETY_FLOOR_BYTES),
            floorBytes: SAFETY_FLOOR_BYTES,
            bytesPerSecond: videoBytesPerSecond(options.quality),
          };
    },
    step(action: StorageAction): BodyCamStorageStep | null {
      switch (action.type) {
        case 'warn':
          return { do: 'warn', minutes: action.minutes, of: sound ? 'sound' : 'video' };
        case 'limit':
          if (sound) return null;
          if (!options.soundOnly) return { do: 'stop', at: 'keep-free' };
          sound = true;
          return { do: 'sound-only' };
        case 'floor':
          return { do: 'stop', at: 'floor' };
        case 'unknown':
          return { do: 'unknown' };
        case 'known':
          return { do: 'known' };
      }
    },
  };
}
