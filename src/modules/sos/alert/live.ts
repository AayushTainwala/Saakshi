import i18n from '@/i18n';
import { type LiveShare, liveShare } from '@/modules/location';
import { readBatteryPercent } from '@/platform/battery';

import { shareMessage, type ShareLabels } from './message';
import { textTrustedContacts, type TextOutcome } from './text';

/** The calm message's words, in the app's language at the moment it is written. */
export function shareLabels(): ShareLabels {
  return {
    until: (time) => i18n.t('sos:message.shareUntil', { time }),
    open: i18n.t('sos:message.shareOpen'),
    battery: (percent) => i18n.t('sos:message.shareBattery', { percent }),
    follow: (link) => i18n.t('sos:message.shareFollow', { link }),
  };
}

/**
 * The text that invites contacts to follow the link: the calm "Share my location" message, with
 * the battery level (SPEC 5.2). Also sent when the link follows an alert on its own.
 */
export function liveInvite(share: LiveShare, battery: number | null = null): string {
  return shareMessage(share, battery, shareLabels());
}

/** The invite with the battery level read now. */
export async function liveInviteNow(share: LiveShare): Promise<string> {
  return liveInvite(share, await readBatteryPercent());
}

/**
 * Starts live location (S3) and, unless `sendLink` is false (an alert carries the link instead),
 * texts the calm invite to the people ticked for live location. With `persistent`, the share has no
 * fixed end (SPEC 5.4).
 */
export async function startLiveLocation(
  hours: number,
  options: { sendLink?: boolean; directOnly?: boolean; persistent?: boolean } = {},
): Promise<{ share: LiveShare; sent: TextOutcome | null }> {
  const share = await liveShare.start(
    hours,
    { title: i18n.t('sos:live.noticeTitle'), body: i18n.t('sos:live.noticeBody') },
    { persistent: options.persistent },
  );
  const sent =
    options.sendLink === false
      ? null
      : await textTrustedContacts(await liveInviteNow(share), { use: 'live', directOnly: options.directOnly });
  return { share, sent };
}

export function stopLiveLocation(): Promise<void> {
  return liveShare.stop();
}
