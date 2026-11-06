import type { TFunction } from 'i18next';

import { type RecordSummary, splitLength } from '../locker/summary';

type T = TFunction<'record'>;

/** "12 min 5 s", "1 h 02 min", "35 s". */
export function lengthLabel(t: T, ms: number): string {
  const { h, m, s } = splitLength(ms);
  if (h > 0) return t('list.lengthHours', { h, m: String(m).padStart(2, '0') });
  if (m > 0) return t('list.lengthMinutes', { m, s });
  return t('list.lengthSeconds', { s });
}

/** A position in a recording: "4:05", "1:02:05". */
export function clockLabel(ms: number): string {
  const { h, m, s } = splitLength(Math.max(0, ms));
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

/** What a record is: "Body-cam", "Bug mode", "Photo", "2 videos", "Video and 3 photos". */
export function kindLabel(t: T, summary: RecordSummary): string {
  if (summary.kind === 'body-cam') return t('list.bodyCam');
  if (summary.kind === 'bug') return t('list.bug');
  const photos = summary.photos ? t('list.photos', { count: summary.photos }) : null;
  const videos = summary.videos ? t('list.videos', { count: summary.videos }) : null;
  if (photos && videos) return t('list.mixed', { videos, photos });
  return videos ?? photos ?? t('list.nothing');
}
