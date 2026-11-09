import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { bugMode } from '@/modules/bugmode';
import { liveLength } from '@/modules/location';
import { isSecretCodeSet, requireSecretCode } from '@/modules/secretcode';
import { alertController, liveInviteNow, startLiveLocation, stopLiveLocation, textTrustedContacts } from '@/modules/sos';

import { lockSetting } from './lockScreenInstance';
import { PhoneTakenController, type PhoneTakenState } from './phoneTaken';

const FILE_NAME = 'phone-taken.json';

/** "My phone is being taken" with the app's real parts. */
export const phoneTaken = new PhoneTakenController({
  storage: {
    read() {
      const file = new File(Paths.document, FILE_NAME);
      return file.exists ? file.textSync() : null;
    },
    write(text) {
      const file = new File(Paths.document, FILE_NAME);
      if (!file.exists) file.create();
      file.writeSync(text);
    },
  },
  codeIsSet: isSecretCodeSet,
  requireCode: () => requireSecretCode({ reason: 'phone-taken' }),
  // Without Saakshi's own Live Activity, so the locked screen shows less (SPEC 5.4).
  startPocket: () => bugMode.start({ startedFrom: 'phone-taken', liveActivity: false }),
  stopPocket: () => bugMode.stop(),
  startLive: async () => {
    // No fixed end; the Settings length is not used for this share.
    const { share } = await startLiveLocation(liveLength.get(), { sendLink: false, persistent: true });
    return { link: share.link, invite: await liveInviteNow(share) };
  },
  stopLive: stopLiveLocation,
  alert: (liveLink) => alertController.start({ immediate: true, liveLink }),
  textLink: async (invite, to) => {
    await textTrustedContacts(invite, { use: 'live', except: to === 'not-alerted' ? 'sos' : undefined });
  },
  // The silence alarm's heartbeat (round 2, group 3.5) goes here.
  heartbeat: { start: () => undefined, stop: () => undefined },
  // Android, if the user switched it on in Settings: device admin's force-lock (group 1.7).
  lockScreen: () => lockSetting.lockNow(),
  inForeground: () => AppState.currentState === 'active',
  now: () => new Date(),
});

// "Now lock your phone" stays until the app goes to the background: the screen locked, or the
// user left Saakshi.
AppState.addEventListener('change', (state) => {
  if (state === 'background') phoneTaken.appInBackground();
});

export function usePhoneTaken(): PhoneTakenState {
  return useSyncExternalStore(phoneTaken.subscribe, phoneTaken.getState);
}
