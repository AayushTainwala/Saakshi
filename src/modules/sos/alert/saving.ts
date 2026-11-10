import i18n from '@/i18n';
import { liveShare } from '@/modules/location';

import { textTrustedContacts } from './text';

/** The shares whose contacts have been told about saving mode (once each). */
const told = new Set<string>();

/**
 * Saving mode for live location (round 2, group 1.5): on at 5% battery in body-cam or Pocket
 * recording, off when the phone is charging or the recording stops. When it comes on while a share
 * runs, the people ticked for live location are told once: "my battery is at 5%, my location now
 * updates every 5 minutes". It is texted only where the phone sends with no tap (the Android APK):
 * the phone may be locked, and nobody can tap Send. The live page also says so, from the battery
 * level (web/live/index.html).
 */
export async function lowBatterySaving(on: boolean): Promise<void> {
  await liveShare.setSaving(on);
  const share = liveShare.getShare();
  if (!on || !share || told.has(share.shareId)) return;
  told.add(share.shareId);
  await textTrustedContacts(i18n.t('sos:message.saving'), { use: 'live', directOnly: true }).catch(() => undefined);
}
