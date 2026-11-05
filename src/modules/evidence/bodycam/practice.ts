import type SaakshiEvidence from '@native/saakshi-evidence';

import { doublePress } from './doublePress';

type PracticeNative = Pick<
  NonNullable<typeof SaakshiEvidence>,
  'addListener' | 'volumeKeysStart' | 'volumeKeysStop' | 'unlockPracticeStart' | 'unlockPracticeStop'
>;

export type UnlockPractice = {
  /** Stops listening. Resolves once the buttons (and, on iPhone, the camera) are released. */
  stop: () => Promise<void>;
};

/**
 * The unlock practice on body-cam's start screen (fix round 1, group 2): the user presses
 * volume-up twice, read exactly as the lock reads it, before Start is offered. On iPhone the camera
 * runs (without recording) while it listens, because iOS sends the presses only to an app that is
 * using the camera. `onDone` is called once, on the second press, as listening stops.
 */
export function startUnlockPractice(native: PracticeNative, platform: string, onDone: () => void): UnlockPractice {
  const ios = platform === 'ios';
  let stopping: Promise<void> | null = null;
  let subscription: ReturnType<PracticeNative['addListener']> | null = null;
  const started = ios ? native.unlockPracticeStart() : native.volumeKeysStart();

  const stop = () => {
    if (!stopping) {
      subscription?.remove();
      stopping = started
        .catch(() => undefined)
        .then(() => (ios ? native.unlockPracticeStop() : native.volumeKeysStop()))
        .catch(() => undefined);
    }
    return stopping;
  };

  const press = doublePress(() => {
    if (stopping) return;
    void stop();
    onDone();
  });
  subscription = native.addListener('onVolumeUp', () => press());
  return { stop };
}
