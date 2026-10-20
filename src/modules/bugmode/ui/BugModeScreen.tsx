import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components';
import { canTextWithoutTap } from '@/modules/sos';

import { MicrophoneDeniedError } from '../engines';
import { bugMode, useBugMode } from '../instance';

function timeIST(iso: string): string {
  const d = new Date(Date.parse(iso) + 330 * 60 * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} IST`;
}

/** Bug mode (E8): what it does, start and stop, and how far it has got. */
export function BugModeScreen() {
  const { t } = useTranslation('sos');
  const state = useBugMode();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [witnessing, setWitnessing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      canTextWithoutTap().then((value) => live && setWitnessing(value));
      return () => {
        live = false;
      };
    }, []),
  );

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await bugMode.start();
    } catch (e) {
      setError(
        e instanceof MicrophoneDeniedError
          ? t('bug.micDenied')
          : t('bug.error', { detail: e instanceof Error ? e.message : String(e) }),
      );
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    await bugMode.stop().finally(() => setBusy(false));
  };

  return (
    <Screen>
      <AppText>{t('bug.intro')}</AppText>
      <AppText color="textMuted">{Platform.OS === 'ios' ? t('bug.iosNote') : t('bug.androidNote')}</AppText>
      <AppText color="textMuted">{witnessing ? t('bug.witnessOn') : t('bug.witnessOff')}</AppText>
      <AppText color="textMuted">{t('bug.localNote')}</AppText>

      {state.running ? (
        <Card accessibilityLiveRegion="polite">
          {state.startedAt ? <AppText variant="label">{t('bug.recording', { time: timeIST(state.startedAt) })}</AppText> : null}
          <AppText>{t('bug.pieces', { count: state.sealed })}</AppText>
          {state.failed > 0 ? <AppText color="danger">{t('bug.failed', { count: state.failed })}</AppText> : null}
          {state.lastWitnessAt ? <AppText>{t('bug.witnessed', { time: timeIST(state.lastWitnessAt) })}</AppText> : null}
          <Button variant="danger" label={t('bug.stop')} busy={busy} onPress={() => void stop()} />
        </Card>
      ) : (
        <Button label={t('bug.start')} busy={busy} onPress={() => void start()} />
      )}

      {error ? (
        <AppText color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}
