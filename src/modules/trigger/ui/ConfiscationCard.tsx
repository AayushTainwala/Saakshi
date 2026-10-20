import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { AppText, Button, Card } from '@/components';
import { bugMode, useBugMode } from '@/modules/bugmode';
import { useLiveShare } from '@/modules/location';
import { stopLiveLocation } from '@/modules/sos';

import type { ConfiscationResult } from '../confiscation';
import { startConfiscationMode } from '../instance';

/**
 * Confiscation mode (spec section 5) in two taps: the button, then Start in the confirmation. Shows
 * what is running, and stops live location and bug mode together.
 */
export function ConfiscationCard({ hasContacts }: { hasContacts: boolean }) {
  const { t } = useTranslation('sos');
  const bug = useBugMode();
  const live = useLiveShare();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ConfiscationResult | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      setResult(await startConfiscationMode());
    } finally {
      setBusy(false);
    }
  };

  const confirm = () =>
    Alert.alert(t('confiscation.confirmTitle'), t('confiscation.confirmBody'), [
      { text: t('alert.cancel'), style: 'cancel' },
      { text: t('confiscation.confirm'), style: 'destructive', onPress: () => void run() },
    ]);

  const stopAll = async () => {
    setBusy(true);
    await Promise.allSettled([bugMode.stop(), stopLiveLocation()]);
    setResult(null);
    setBusy(false);
  };

  const failed = result
    ? (
        [
          ['alert', t('confiscation.partAlert')],
          ['live', t('confiscation.partLive')],
          ['bug', t('confiscation.partBug')],
        ] as const
      ).filter(([part]) => result[part] === 'failed')
    : [];
  const running = !!live || bug.running;

  return (
    <Card>
      <AppText variant="heading">{t('confiscation.title')}</AppText>
      <AppText>{t('confiscation.intro')}</AppText>
      <AppText color="textMuted">{t('confiscation.biometrics')}</AppText>
      {running ? (
        <>
          <AppText variant="label">{t('confiscation.running')}</AppText>
          {live ? <AppText>{t('confiscation.partLive')}</AppText> : null}
          {bug.running ? <AppText>{t('confiscation.partBug')}</AppText> : null}
        </>
      ) : null}
      {failed.map(([part, label]) => (
        <AppText key={part} color="danger">
          {t('confiscation.partFailed', { part: label })}
        </AppText>
      ))}
      {running ? (
        <Button variant="secondary" label={t('confiscation.stopAll')} busy={busy} onPress={() => void stopAll()} />
      ) : (
        <Button variant="danger" label={t('confiscation.start')} busy={busy} disabled={!hasContacts} onPress={confirm} />
      )}
      <Button variant="secondary" label={t('bug.title')} onPress={() => router.push('/sos/bugmode')} />
      <Button variant="secondary" label={t('trigger.title')} onPress={() => router.push('/sos/trigger')} />
    </Card>
  );
}
