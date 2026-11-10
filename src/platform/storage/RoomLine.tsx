import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card } from '@/components';

import { GB, MB, SAFETY_FLOOR_BYTES } from './limits';
import { roundedMinutes, secondsLeft } from './monitor';
import { bytesPerHour, soundBytesPerSecond, videoBytesPerSecond } from './rates';
import { saveStorageSettings } from './settings';
import { useFreeBytes, useStorageSettings } from './watch';

type T = TFunction<'storage'>;

/** "about" a length of time: "3 h 20 min", "45 min", "less than a minute". */
export function timeLeftLabel(t: T, seconds: number): string {
  const minutes = roundedMinutes(seconds);
  if (minutes < 1) return t('time.underMinute');
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return t('time.minutes', { m });
  return m === 0 ? t('time.hours', { h }) : t('time.hoursMinutes', { h, m });
}

/** A size said roughly: "1.5 GB", "12 GB", "60 MB". */
export function sizeLabel(t: T, bytes: number): string {
  if (bytes >= GB) {
    const gb = bytes / GB;
    return t('size.gb', { value: gb < 10 ? (Math.round(gb * 10) / 10).toString() : Math.round(gb).toString() });
  }
  return t('size.mb', { value: Math.max(1, Math.round(bytes / MB)).toString() });
}

/**
 * "Room for about 3 h 20 min of video": how long the phone's free room allows before this recorder
 * would stop, worked out from free space, the amount it stops at and its rate. Shown on every Start
 * screen, and read again every 10 seconds. If the phone doesn't say how much is free, it says that.
 */
export function RoomLine({ kind, bytesPerSecond, limitBytes }: { kind: 'video' | 'sound'; bytesPerSecond: number; limitBytes: number }) {
  const { t } = useTranslation('storage');
  const free = useFreeBytes();
  const left = secondsLeft(free, limitBytes, bytesPerSecond);
  return (
    <AppText color={left !== null && left < 30 * 60 ? 'warning' : 'textMuted'} accessibilityLiveRegion="polite">
      {roomLabel(t, kind, left)}
    </AppText>
  );
}

/** The words of `RoomLine`, for a screen that draws its own text (the camera, over its picture). */
export function roomLabel(t: T, kind: 'video' | 'sound', left: number | null): string {
  if (left === null) return t('room.unknown');
  return t(kind === 'video' ? 'room.video' : 'room.sound', { time: timeLeftLabel(t, left) });
}

/** Why a recording can't start, in the user's words: below the floor, or below the amount kept free. */
export function noRoomLabel(t: T, freeBytes: number, keepFreeBytes: number | null): string {
  if (keepFreeBytes === null || freeBytes <= SAFETY_FLOOR_BYTES) {
    return t('start.belowFloor', { free: sizeLabel(t, freeBytes), floor: sizeLabel(t, SAFETY_FLOOR_BYTES) });
  }
  return t('start.belowKeepFree', { free: sizeLabel(t, freeBytes), amount: sizeLabel(t, keepFreeBytes) });
}

/**
 * What Saakshi does about the phone's room (SPEC section 4, "Storage"): shown the first time
 * body-cam or Pocket recording opens (with a button that puts it away), and always under Settings →
 * Storage. `quality` is body-cam's, for the size of an hour of video.
 */
export function StorageExplainer({ firstTime = false, quality = 720 }: { firstTime?: boolean; quality?: 720 | 1080 }) {
  const { t } = useTranslation('storage');
  const settings = useStorageSettings();
  if (firstTime && settings.explained) return null;
  const amount = sizeLabel(t, settings.keepFreeBytes);
  const floor = sizeLabel(t, SAFETY_FLOOR_BYTES);
  return (
    <Card>
      <AppText variant="label">{t('explain.title')}</AppText>
      <AppText>{t('explain.long')}</AppText>
      <AppText>
        {t('explain.perHour', {
          video: sizeLabel(t, bytesPerHour(videoBytesPerSecond(quality))),
          sound: sizeLabel(t, bytesPerHour(soundBytesPerSecond())),
        })}
      </AppText>
      <AppText>{t('explain.keepFree', { amount })}</AppText>
      <AppText>{t(settings.bodyCamSoundOnly ? 'explain.atKeepFreeSoundOnly' : 'explain.atKeepFreeStop')}</AppText>
      <AppText>{t('explain.floor', { floor })}</AppText>
      <AppText>{t('explain.phoneTaken', { floor })}</AppText>
      {firstTime ? <Button variant="secondary" label={t('explain.gotIt')} onPress={() => saveStorageSettings({ explained: true })} /> : null}
    </Card>
  );
}
