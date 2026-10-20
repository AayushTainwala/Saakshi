import { useSyncExternalStore } from 'react';

import i18n from '@/i18n';
import { getCurrentFix } from '@/modules/location';

import { contactsStore } from '../contacts/fileStore';
import { phoneChannels } from './channels';
import { AlertController, type AlertState } from './controller';

/** The app's one alert. The SOS tab, and later the code pad and confiscation mode, all drive it. */
export const alertController = new AlertController({
  contacts: contactsStore.list,
  locate: () => getCurrentFix({ timeoutMs: 6000 }),
  now: () => new Date(),
  channels: phoneChannels,
  labels: () => ({
    title: i18n.t('sos:message.title'),
    location: i18n.t('sos:message.location'),
    noLocation: i18n.t('sos:message.noLocation'),
    sent: i18n.t('sos:message.sent'),
    live: i18n.t('sos:message.live'),
  }),
});

export function useAlertState(): AlertState {
  return useSyncExternalStore(alertController.subscribe, alertController.getState);
}
