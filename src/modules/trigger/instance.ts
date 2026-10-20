import { bugMode } from '@/modules/bugmode';
import { alertController, liveInvite, startLiveLocation, textTrustedContacts } from '@/modules/sos';

import { type ConfiscationResult, startConfiscation } from './confiscation';

/** Confiscation mode with the app's real parts. */
export function startConfiscationMode(): Promise<ConfiscationResult> {
  return startConfiscation({
    startBug: () => bugMode.start(),
    startLive: async (hours) => {
      const { share } = await startLiveLocation(hours, { sendLink: false });
      return { link: share.link, invite: liveInvite(share) };
    },
    alert: (liveLink) => alertController.start({ immediate: true, liveLink }),
    text: async (message) => {
      await textTrustedContacts(message);
    },
  });
}
