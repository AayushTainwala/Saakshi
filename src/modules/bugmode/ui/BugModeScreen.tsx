import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components';
import { requireSecretCode } from '@/modules/secretcode';
import { canTextWithoutTap } from '@/modules/sos';
import { noRoomLabel, RoomLine, SAFETY_FLOOR_BYTES, soundBytesPerSecond, StorageExplainer, useStorageSettings } from '@/platform/storage';

import { NoRoomError } from '../controller';

import { MicrophoneDeniedError } from '../engines';
import { bugMode, useBugMode } from '../instance';

function timeIST(iso: string, seconds = false): string {
  const d = new Date(Date.parse(iso) + 330 * 60 * 1000);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(d.getUTCHours())}:${two(d.getUTCMinutes())}${seconds ? `:${two(d.getUTCSeconds())}` : ''} IST`;
}

/** Bug mode (E8): what it does, start and stop, and how far it has got. */
export function BugModeScreen() {
  const { t } = useTranslation(['sos', 'record']);
  const { t: ts } = useTranslation('storage');
  const storage = useStorageSettings();
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
        e instanceof NoRoomError
          ? noRoomLabel(ts, e.freeBytes, e.keepFreeBytes)
          : e instanceof MicrophoneDeniedError
            ? t('bug.micDenied')
            : t('bug.error', { detail: e instanceof Error ? e.message : String(e) }),
      );
    } finally {
      setBusy(false);
    }
  };

  // Stop asks for the secret code first (round 2; SPEC 5.3).
  const stop = async () => {
    if (!(await requireSecretCode({ reason: 'pocket-recording' }))) return;
    setBusy(true);
    await bugMode.stop().finally(() => setBusy(false));
  };

  return (
    <Screen>
      <AppText>{t('bug.intro')}</AppText>
      <AppText color="textMuted">{Platform.OS === 'ios' ? t('bug.iosNote') : t('bug.androidNote')}</AppText>
      <AppText color="textMuted">{witnessing ? t('bug.witnessOn') : t('bug.witnessOff')}</AppText>
      <AppText color="textMuted">{t('bug.localNote')}</AppText>
      {/* What Saakshi does about the phone's room, the first time Pocket recording opens (repair round A, group 2). */}
      <StorageExplainer firstTime />

      {state.running ? (
        <Card accessibilityLiveRegion="polite">
          {state.startedAt ? <AppText variant="label">{t('bug.recording', { time: timeIST(state.startedAt) })}</AppText> : null}
          <AppText>
            {state.checkpoints > 0 && state.lastSignedAt
              ? t('bug.checkpoints', { count: state.checkpoints, time: timeIST(state.lastSignedAt, true) })
              : t('bug.noCheckpointYet')}
          </AppText>
          {state.failed > 0 ? <AppText color="danger">{t('bug.failed', { count: state.failed })}</AppText> : null}
          {state.problem ? (
            <AppText color="danger">{t('bug.problem', { time: timeIST(state.problem.at, true), detail: state.problem.message })}</AppText>
          ) : null}
          {state.lastWitnessAt ? <AppText>{t('bug.witnessed', { time: timeIST(state.lastWitnessAt) })}</AppText> : null}
          {/* Low battery (round 2, group 1.5): it carries on in a new file at 5%; nothing stops. */}
          {state.saving ? (
            <AppText color="warning">{t('battery.handedOverSound', { ns: 'record' })}</AppText>
          ) : state.batteryWarning ? (
            <AppText color="warning">{t('battery.handoverSoon', { ns: 'record', percent: state.batteryWarning })}</AppText>
          ) : null}
          {/* Free storage, stage one: a warning as the room runs low; a failed reading stops nothing. */}
          {state.storageUnknown ? (
            <AppText color="warning">{ts('warn.unknown')}</AppText>
          ) : state.storageMinutes ? (
            <AppText color="warning">{ts('warn.sound', { minutes: state.storageMinutes })}</AppText>
          ) : null}
          <Button variant="danger" label={t('bug.stop')} busy={busy} onPress={() => void stop()} />
        </Card>
      ) : (
        <>
          {state.stoppedForStorage ? (
            <AppText color="warning" accessibilityLiveRegion="polite">
              {ts(state.stoppedForStorage === 'floor' ? 'warn.stoppedFloor' : 'warn.stoppedKeepFree')}
            </AppText>
          ) : null}
          {/* Always shown: how long the free room allows before the room kept free is reached. */}
          <RoomLine kind="sound" bytesPerSecond={soundBytesPerSecond()} limitBytes={Math.max(storage.keepFreeBytes, SAFETY_FLOOR_BYTES)} />
          <Button label={t('bug.start')} busy={busy} onPress={() => void start()} />
        </>
      )}

      {error ? (
        <AppText color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}
