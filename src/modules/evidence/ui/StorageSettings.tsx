import { useTranslation } from 'react-i18next';

import { AppText, Card, OptionGroup, Screen } from '@/components';
import { GB, KEEP_FREE_CHOICES_GB, saveStorageSettings, sizeLabel, StorageExplainer, useFreeBytes, useStorageSettings } from '@/platform/storage';

import { useSessions } from '../locker/useSessions';
import type { SessionState } from '../types';

/**
 * About how much room Saakshi's recordings take: the sizes of the recorded files, as the locker
 * noted them when each was fingerprinted. The signed records, pictures for the list and copies made
 * for sharing are small beside them and are not counted.
 */
export function recordingsBytes(sessions: readonly SessionState[]): number {
  let total = 0;
  for (const session of sessions) for (const item of session.items) total += item.digests?.size ?? 0;
  return total;
}

/**
 * Settings → Storage (SPEC section 4, "Storage", stage one; repair round A, group 2): how much of
 * the phone is free and how much Saakshi's recordings take; the amount to keep free; whether
 * body-cam carries on as sound only there; and, always, what Saakshi does about the phone's room.
 */
export function StorageSettings() {
  const { t } = useTranslation('storage');
  const settings = useStorageSettings();
  const free = useFreeBytes();
  const used = recordingsBytes(useSessions());

  return (
    <Screen>
      <Card>
        <AppText>{free === null ? t('settings.freeUnknown') : t('settings.free', { free: sizeLabel(t, free) })}</AppText>
        <AppText>{used > 0 ? t('settings.used', { used: sizeLabel(t, used) }) : t('settings.usedNone')}</AppText>
      </Card>

      <AppText variant="heading">{t('settings.keepFreeHeading')}</AppText>
      <AppText color="textMuted">{t('settings.keepFreeBody')}</AppText>
      <OptionGroup<`${number}`>
        label={t('settings.keepFreeHeading')}
        options={KEEP_FREE_CHOICES_GB.map((gb) => ({ value: `${gb}`, label: t('settings.keepFreeOption', { gb }) }))}
        value={`${Math.round(settings.keepFreeBytes / GB)}`}
        onChange={(value) => saveStorageSettings({ keepFreeBytes: Number(value) * GB })}
      />

      <AppText variant="heading">{t('settings.soundOnlyHeading')}</AppText>
      <AppText color="textMuted">{t('settings.soundOnlyBody')}</AppText>
      <OptionGroup<'on' | 'off'>
        label={t('settings.soundOnlyHeading')}
        options={[
          { value: 'on', label: t('settings.soundOnlyOn') },
          { value: 'off', label: t('settings.soundOnlyOff') },
        ]}
        value={settings.bodyCamSoundOnly ? 'on' : 'off'}
        onChange={(value) => saveStorageSettings({ bodyCamSoundOnly: value === 'on' })}
      />

      <StorageExplainer />
    </Screen>
  );
}
