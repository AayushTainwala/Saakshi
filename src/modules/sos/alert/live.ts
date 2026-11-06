import i18n from '@/i18n';
import { type LiveShare, liveShare } from '@/modules/location';

import { formatTimeIST } from './time';
import { textTrustedContacts, type TextOutcome } from './text';

/** The text that invites contacts to follow the link. */
export function liveInvite(share: LiveShare): string {
  return i18n.t('sos:message.liveInvite', { time: formatTimeIST(share.expiresAt), link: share.link });
}

/**
 * Starts live location (S3) and, unless `sendLink` is false ("My phone is being taken" puts the link
 * in the SOS text instead), texts the link to the people ticked for live location. With
 * `persistent`, the share has no fixed end (SPEC 5.4).
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
    options.sendLink === false ? null : await textTrustedContacts(liveInvite(share), { use: 'live', directOnly: options.directOnly });
  return { share, sent };
}

export function stopLiveLocation(): Promise<void> {
  return liveShare.stop();
}
