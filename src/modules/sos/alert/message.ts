import { type FixResult, mapsLink } from '@/modules/location';

import { formatDateIST, formatIST, formatTimeIST } from './time';

/** The words of the alert in the app's language. The link, numbers and times never change. */
export type AlertLabels = {
  /** "Saakshi alert: I may need help." */
  title: string;
  /** "My location" */
  location: string;
  /** "My location: not available" */
  noLocation: string;
  /** "Sent" */
  sent: string;
};

/**
 * The SOS text (spec S1): who it is from is the sender's number; the text carries a map link to the
 * best known position, its accuracy and when the phone took it, and the time the alert was sent.
 *
 *   Saakshi alert: I may need help.
 *   My location: https://maps.google.com/?q=19.07600,72.87770 (±20 m, 14:31 IST)
 *   Sent: 20/10/2026 14:32 IST
 */
export function alertMessage(where: FixResult, sentAt: Date, labels: AlertLabels): string {
  const lines = [labels.title];
  if (where.status === 'fixed') {
    const { fix } = where;
    const details: string[] = [];
    if (fix.accuracyMeters !== null) details.push(`±${Math.max(1, Math.round(fix.accuracyMeters))} m`);
    // A fix from an earlier day says which day.
    const sameDay = formatDateIST(fix.fixedAt) === formatDateIST(sentAt);
    details.push(sameDay ? formatTimeIST(fix.fixedAt) : formatIST(fix.fixedAt));
    lines.push(`${labels.location}: ${mapsLink(fix)} (${details.join(', ')})`);
  } else {
    lines.push(labels.noLocation);
  }
  lines.push(`${labels.sent}: ${formatIST(sentAt)}`);
  return lines.join('\n');
}
