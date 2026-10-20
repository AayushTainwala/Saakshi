import i18n from '@/i18n';
import { type LiveShare, liveShare } from '@/modules/location';

import { formatTimeIST } from './time';
import { textTrustedContacts, type TextOutcome } from './text';

/** The text that invites contacts to follow the link. */
export function liveInvite(share: LiveShare): string {
  return i18n.t('sos:message.liveInvite', { time: formatTimeIST(share.expiresAt), link: share.link });
}

/**
 * Starts live location (S3) and, unless `sendLink` is false (confiscation mode puts the link in
 * the SOS text instead), texts the link to every trusted contact.
 */
export async function startLiveLocation(
  hours: number,
  options: { sendLink?: boolean; directOnly?: boolean } = {},
): Promise<{ share: LiveShare; sent: TextOutcome | null }> {
  const share = await liveShare.start(hours, {
    title: i18n.t('sos:live.noticeTitle'),
    body: i18n.t('sos:live.noticeBody'),
  });
  const sent =
    options.sendLink === false ? null : await textTrustedContacts(liveInvite(share), { directOnly: options.directOnly });
  return { share, sent };
}

export function stopLiveLocation(): Promise<void> {
  return liveShare.stop();
}
