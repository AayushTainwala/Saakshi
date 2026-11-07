import { type FixResult, mapsLink } from '@/modules/location';

import { formatDateIST, formatIST, formatTimeIST } from './time';

/** The words of the alert in the app's language. The links, numbers and times never change. */
export type AlertLabels = {
  /** "Saakshi alert: I may need help." */
  title: string;
  /** "My location" */
  location: string;
  /** "My location: not available" */
  noLocation: string;
  /** "within 20 m" (GSM characters only in English, so the text stays in the cheaper encoding). */
  accuracy: (meters: number) => string;
  /** "Live location" */
  live: string;
  /** "Battery: 82%" */
  battery: (percent: number) => string;
  /** "Battery: not known" */
  batteryUnknown: string;
  /** "Sent" */
  sent: string;
};

/**
 * The SOS text, "I need help" (SPEC 5.2; round 2, group 1.4). Who it is from is the sender's
 * number. It carries a map link to the best known position (Google Maps) with its accuracy and when
 * the phone took it, the live-location link when it is ready in time, the battery level, and the
 * time it was sent:
 *
 *   Saakshi alert: I may need help.
 *   My location: https://maps.google.com/?q=19.07600,72.87770 (within 20 m, 14:31 IST)
 *   Live location: https://aayushtainwala.github.io/Saakshi/live/#…
 *   Battery: 82%
 *   Sent: 20/10/2026 14:32 IST
 *
 * Each link ends its line, so that no punctuation can be taken as part of it.
 */
export function alertMessage(
  where: FixResult,
  sentAt: Date,
  labels: AlertLabels,
  extra: { liveLink?: string | null; battery?: number | null } = {},
): string {
  const lines = [labels.title];
  if (where.status === 'fixed') {
    const { fix } = where;
    const details: string[] = [];
    if (fix.accuracyMeters !== null) details.push(labels.accuracy(Math.max(1, Math.round(fix.accuracyMeters))));
    // A fix from an earlier day says which day.
    const sameDay = formatDateIST(fix.fixedAt) === formatDateIST(sentAt);
    details.push(sameDay ? formatTimeIST(fix.fixedAt) : formatIST(fix.fixedAt));
    lines.push(`${labels.location}: ${mapsLink(fix)} (${details.join(', ')})`);
  } else {
    lines.push(labels.noLocation);
  }
  if (extra.liveLink) lines.push(`${labels.live}: ${extra.liveLink}`);
  lines.push(extra.battery != null ? labels.battery(extra.battery) : labels.batteryUnknown);
  lines.push(`${labels.sent}: ${formatIST(sentAt)}`);
  return lines.join('\n');
}

/** The words of "Share my location"'s message. */
export type ShareLabels = {
  /** "I'm sharing my location with you until 18:40 IST." */
  until: (time: string) => string;
  /** "I'm sharing my location with you until I stop." (no fixed end) */
  open: string;
  /** "Battery 82%." */
  battery: (percent: number) => string;
  /** "Follow it here: <link>" */
  follow: (link: string) => string;
};

/**
 * "Share my location" (SPEC 5.2): a calm message, not an alert, to the people ticked for live
 * location, with the link and the battery level:
 *
 *   I'm sharing my location with you until 18:40 IST. Battery 82%.
 *   Follow it here: https://aayushtainwala.github.io/Saakshi/live/#…
 *
 * The link comes last, so no full stop can end up in it.
 */
export function shareMessage(
  share: { link: string; expiresAt: string; persistent?: boolean },
  battery: number | null,
  labels: ShareLabels,
): string {
  const first = [share.persistent ? labels.open : labels.until(formatTimeIST(share.expiresAt))];
  if (battery != null) first.push(labels.battery(battery));
  return `${first.join(' ')}\n${labels.follow(share.link)}`;
}
