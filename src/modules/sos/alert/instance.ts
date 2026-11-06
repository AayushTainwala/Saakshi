import { useSyncExternalStore } from 'react';

import i18n from '@/i18n';
import { getCurrentFix, liveLength, type LiveShare } from '@/modules/location';
import { readBatteryPercent } from '@/platform/battery';

import { contactsStore } from '../contacts/fileStore';
import { forUse } from '../contacts/store';
import { phoneChannels } from './channels';
import { AlertController, type AlertState } from './controller';
import { type HelpResult, needHelp } from './help';
import { liveInviteNow, startLiveLocation } from './live';
import { textTrustedContacts } from './text';

/** The app's one alert: "I need help" and "My phone is being taken" both drive it. */
export const alertController = new AlertController({
  // The people ticked for SOS alerts (fix round 1, group 6).
  contacts: () => forUse(contactsStore.list(), 'sos'),
  locate: () => getCurrentFix({ timeoutMs: 6000 }),
  now: () => new Date(),
  channels: phoneChannels,
  labels: () => ({
    title: i18n.t('sos:message.title'),
    location: i18n.t('sos:message.location'),
    noLocation: i18n.t('sos:message.noLocation'),
    accuracy: (meters) => i18n.t('sos:message.accuracy', { meters }),
    live: i18n.t('sos:message.live'),
    battery: (percent) => i18n.t('sos:message.battery', { percent }),
    batteryUnknown: i18n.t('sos:message.batteryUnknown'),
    sent: i18n.t('sos:message.sent'),
  }),
  battery: () => readBatteryPercent(),
});

/** "I need help" with the app's real parts (SPEC 5.2). */
export async function startNeedHelp(): Promise<HelpResult> {
  // Nobody to alert: the alert says so, and no location is shared with nobody told.
  if (forUse(contactsStore.list(), 'sos').length === 0) {
    await alertController.start({ immediate: true });
    return { live: 'failed', liveError: null };
  }
  let share: LiveShare | null = null;
  return needHelp({
    startLive: async () => {
      // For the Settings length (4 hours unless changed); the link goes in the alert.
      share = (await startLiveLocation(liveLength.get(), { sendLink: false })).share;
      return share.link;
    },
    alert: async (liveLink) => {
      await alertController.start({ immediate: true, liveLink });
      return alertController.lastLiveLink;
    },
    textLink: async (to) => {
      if (!share) return;
      await textTrustedContacts(await liveInviteNow(share), { use: 'live', except: to === 'not-alerted' ? 'sos' : undefined });
    },
  });
}

export function useAlertState(): AlertState {
  return useSyncExternalStore(alertController.subscribe, alertController.getState);
}
