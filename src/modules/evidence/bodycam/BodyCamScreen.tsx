import SaakshiEvidence from '@native/saakshi-evidence';
import { useLowPowerMode } from 'expo-battery';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useNavigation, usePreventRemove } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Linking, PermissionsAndroid, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Card, OptionGroup, Screen } from '@/components';
import { palettes, spacing } from '@/theme';

import type { BatteryAction } from '../battery/monitor';
import { useLowBattery } from '../battery/useLowBattery';
import { createEvidenceSession } from '../capture/deps';
import { useLatestLocation } from '../capture/useLocation';
import { fileLocker } from '../locker/store';
import type { EndReason } from '../types';
import { LOCK_MESSAGE_MS } from './constants';
import { doublePress } from './doublePress';
import { androidBodyCam, type BodyCamEngine, iosBodyCam } from './engine';
import { startUnlockPractice, type UnlockPractice } from './practice';
import { setBodyCamRunning } from './running';
import { type BodyCamSettings, loadBodyCamSettings, saveBodyCamSettings } from './settings';

const KEEP_AWAKE_TAG = 'saakshi-bodycam';
/** Body-cam needs the app's own recorder: Android's CameraRecorder, or iPhone's BodyCamRecorder. */
const RECORDER_AVAILABLE =
  Platform.OS === 'android' ? !!SaakshiEvidence?.recorderSupported() : Platform.OS === 'ios' && !!SaakshiEvidence;
const dark = palettes.dark;

type Phase = 'setup' | 'starting' | 'running' | 'stopping';

/** The phone's local time of day, hh:mm:ss. */
function formatClock(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Body-cam mode (spec B1–B4). */
export function BodyCamScreen() {
  const { t } = useTranslation('record');
  const navigation = useNavigation();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const lowPowerMode = useLowPowerMode();
  const location = useLatestLocation();

  const [settings, setSettingsState] = useState<BodyCamSettings>(loadBodyCamSettings);
  const updateSettings = useCallback((patch: Partial<BodyCamSettings>) => {
    setSettingsState((previous) => {
      const next = { ...previous, ...patch };
      saveBodyCamSettings(next);
      return next;
    });
  }, []);

  const [phase, setPhase] = useState<Phase>('setup');
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState(false);
  const [stopFirst, setStopFirst] = useState(false);
  const [problem, setProblem] = useState(false);
  const [startFailed, setStartFailed] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [notificationsOff, setNotificationsOff] = useState(false);
  const [now, setNow] = useState(0);
  const engine = useRef<BodyCamEngine | null>(null);
  const session = useMemo(() => createEvidenceSession(), []);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => session.subscribe(refresh), [session]);

  useEffect(() => {
    if (phase !== 'running') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // ---- Nothing leaves this screen while body-cam records (fix round 1, C2) --------------------
  //
  // One body-cam session is one record from Start to Stop. While it records, the back swipe
  // (iPhone), the back button (Android) and every navigation action are refused; the header with
  // its back button is hidden. The only way out is Stop.
  const recording = phase !== 'setup';
  // The secret code's reset is offered only while nothing runs (round 2, group 1.2).
  useEffect(() => {
    setBodyCamRunning(recording);
    return () => setBodyCamRunning(false);
  }, [recording]);
  const disablePrevention = usePreventRemove(recording, () => {
    if (locked) setMessage(true);
    else setStopFirst(true);
  });

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: !recording, gestureEnabled: false, fullScreenGestureEnabled: false });
  }, [navigation, recording]);

  useEffect(() => {
    if (!recording) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!locked) setStopFirst(true);
      return true;
    });
    return () => subscription.remove();
  }, [recording, locked]);

  useEffect(() => {
    if (!stopFirst) return;
    const timer = setTimeout(() => setStopFirst(false), LOCK_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [stopFirst]);

  // ---- Lock and unlock -------------------------------------------------------------------------

  const lock = useCallback(() => {
    setLocked(true);
    setMessage(false);
    void SaakshiEvidence?.setScreenDimmed(true);
    void SaakshiEvidence?.volumeKeysStart();
  }, []);

  const unlock = useCallback(() => {
    setLocked(false);
    void SaakshiEvidence?.setScreenDimmed(false);
    void SaakshiEvidence?.volumeKeysStop();
  }, []);

  useEffect(() => {
    if (!locked || !SaakshiEvidence) return;
    const press = doublePress(unlock);
    const subscription = SaakshiEvidence.addListener('onVolumeUp', () => press());
    return () => subscription.remove();
  }, [locked, unlock]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(false), LOCK_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [message]);

  // ---- Practising the unlock (fix round 1, group 2) ---------------------------------------------
  //
  // Start is offered only once the user has unlocked with volume-up twice here, read the same way
  // the lock reads it.

  const [practice, setPractice] = useState<'idle' | 'listening' | 'done'>('idle');
  const practiceRef = useRef<UnlockPractice | null>(null);
  const practiceReleased = useRef<Promise<void>>(Promise.resolve());

  const stopPractice = useCallback(() => {
    const current = practiceRef.current;
    practiceRef.current = null;
    if (current) practiceReleased.current = current.stop();
  }, []);

  const beginPractice = useCallback(() => {
    if (!SaakshiEvidence) return;
    stopPractice();
    setPractice('listening');
    practiceRef.current = startUnlockPractice(SaakshiEvidence, Platform.OS, () => {
      stopPractice();
      setPractice('done');
      updateSettings({ practised: true });
    });
  }, [stopPractice, updateSettings]);

  const cancelPractice = useCallback(() => {
    stopPractice();
    setPractice('idle');
  }, [stopPractice]);

  useEffect(() => stopPractice, [stopPractice]);

  // ---- Start and stop --------------------------------------------------------------------------

  /**
   * Android 13+: the recording notice (with its Stop button) needs the notification permission.
   * Ask the first time body-cam starts; if refused, record anyway and say where the notice is.
   */
  const checkNotifications = useCallback(async () => {
    if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return;
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (await PermissionsAndroid.check(permission)) return setNotificationsOff(false);
    if (!settings.notificationsAsked) {
      updateSettings({ notificationsAsked: true });
      const result = await PermissionsAndroid.request(permission);
      if (result === PermissionsAndroid.RESULTS.GRANTED) return setNotificationsOff(false);
    }
    setNotificationsOff(true);
  }, [settings.notificationsAsked, updateSettings]);

  const start = useCallback(async () => {
    setStartFailed(false);
    setPhase('starting');
    // The practice's camera must be off before the recorder takes it.
    stopPractice();
    await practiceReleased.current;
    await checkNotifications().catch(() => undefined);
    const common = { session, store: fileLocker, location, quality: settings.quality, partSeconds: settings.uploadPartSeconds };
    try {
      const next =
        Platform.OS === 'android'
          ? androidBodyCam({
              ...common,
              notificationTitle: t('bodycam.notificationTitle'),
              notificationText: t('bodycam.notificationText'),
              notificationStop: t('bodycam.notificationStop'),
            })
          : iosBodyCam({ ...common, onProblem: () => setProblem(true) });
      await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
      await next.start();
      engine.current = next;
    } catch {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
      setStartFailed(true);
      setPhase('setup');
      return;
    }
    const at = Date.now();
    setStartedAt(at);
    setNow(at);
    setPhase('running');
    lock();
  }, [checkNotifications, location, lock, session, settings.quality, settings.uploadPartSeconds, stopPractice, t]);

  const stop = useCallback(
    async (reason: EndReason = 'stopped') => {
      const current = engine.current;
      engine.current = null;
      setPhase('stopping');
      unlock();
      await current?.stop(reason);
      await session.finish();
      deactivateKeepAwake(KEEP_AWAKE_TAG);
      // The recording is over and saved: leaving the screen is allowed again.
      disablePrevention();
      const id = session.id;
      if (id) router.replace({ pathname: '/record/[session]', params: { session: id } });
      else router.back();
    },
    [disablePrevention, session, unlock],
  );

  // Android: stopped from the recording notice's Stop button.
  useEffect(() => {
    if (Platform.OS !== 'android' || !SaakshiEvidence || phase !== 'running') return;
    const subscription = SaakshiEvidence.addListener('onBodyCamStopped', () => void stop());
    return () => subscription.remove();
  }, [phase, stop]);

  // Spec E1: warn at 10% and 5%; at 3%, stop and save so a dying battery never cuts a piece off.
  const [batteryNote, setBatteryNote] = useState<string | null>(null);
  const onBattery = useCallback(
    (action: BatteryAction) => {
      if (action.type === 'warn') setBatteryNote(t('battery.warn', { percent: action.percent }));
      else void stop('low-battery');
    },
    [stop, t],
  );
  useLowBattery(phase === 'running', onBattery);

  // If the screen goes away anyway, the recording still ends as one complete record.
  useEffect(
    () => () => {
      const current = engine.current;
      engine.current = null;
      if (current) void current.stop('stopped').then(() => session.finish());
      void SaakshiEvidence?.setScreenDimmed(false);
      void SaakshiEvidence?.volumeKeysStop();
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    },
    [session],
  );

  // ---- Screens ---------------------------------------------------------------------------------

  if (!cameraPermission || !micPermission) return <View style={styles.black} />;
  if (!cameraPermission.granted || !micPermission.granted) {
    const needsCamera = !cameraPermission.granted;
    const permission = needsCamera ? cameraPermission : micPermission;
    return (
      <Screen>
        <AppText variant="heading">{needsCamera ? t('capture.cameraPermissionTitle') : t('capture.micPermissionTitle')}</AppText>
        <AppText>{needsCamera ? t('capture.cameraPermissionBody') : t('capture.micPermissionBody')}</AppText>
        {permission.canAskAgain ? (
          <Button label={t('capture.allow')} onPress={needsCamera ? requestCameraPermission : requestMicPermission} />
        ) : (
          <Button label={t('capture.openSettings')} onPress={() => Linking.openSettings()} />
        )}
      </Screen>
    );
  }

  if (phase === 'setup') {
    return (
      <Screen>
        <AppText>{t('bodycam.intro')}</AppText>

        <Card>
          <AppText variant="label">{t('bodycam.unlockTitle')}</AppText>
          <AppText>{t('bodycam.unlockBody')}</AppText>
          {practice === 'listening' ? (
            <>
              <AppText variant="heading" accessibilityLiveRegion="polite">
                {t('bodycam.practiseNow')}
              </AppText>
              {Platform.OS === 'ios' ? <AppText color="textMuted">{t('bodycam.practiseCameraNote')}</AppText> : null}
              <Button variant="secondary" label={t('bodycam.practiseCancel')} onPress={cancelPractice} />
            </>
          ) : (
            <>
              {practice === 'done' ? (
                <AppText color="success" variant="label" accessibilityLiveRegion="polite">
                  {t('bodycam.practiseDone')}
                </AppText>
              ) : !settings.practised ? (
                <AppText>{t('bodycam.practiseIntro')}</AppText>
              ) : null}
              <Button
                variant={settings.practised ? 'secondary' : 'primary'}
                label={settings.practised ? t('bodycam.practiseAgain') : t('bodycam.practiseButton')}
                disabled={!SaakshiEvidence}
                onPress={beginPractice}
              />
            </>
          )}
        </Card>

        {Platform.OS === 'ios' ? (
          <Card>
            <AppText color="warning" variant="label">
              {t('bodycam.iosWarningTitle')}
            </AppText>
            <AppText>{t('bodycam.iosWarning')}</AppText>
          </Card>
        ) : (
          <AppText color="textMuted">{t('bodycam.androidNote')}</AppText>
        )}

        {lowPowerMode ? null : (
          <Card>
            <AppText variant="label">{t('bodycam.batteryTitle')}</AppText>
            <AppText>{Platform.OS === 'ios' ? t('bodycam.batteryIos') : t('bodycam.batteryAndroid')}</AppText>
            {Platform.OS === 'android' ? (
              <Button
                variant="secondary"
                label={t('bodycam.batteryButton')}
                onPress={() =>
                  Linking.sendIntent('android.settings.BATTERY_SAVER_SETTINGS').catch(() => Linking.openSettings())
                }
              />
            ) : null}
          </Card>
        )}

        <AppText variant="label">{t('bodycam.quality')}</AppText>
        <OptionGroup
          label={t('bodycam.quality')}
          options={[
            { value: '720', label: t('bodycam.q720') },
            { value: '1080', label: t('bodycam.q1080') },
          ]}
          value={String(settings.quality) as '720' | '1080'}
          onChange={(value) => updateSettings({ quality: value === '1080' ? 1080 : 720 })}
        />

        {startFailed ? <AppText color="danger">{t('bodycam.startFailed')}</AppText> : null}
        {!RECORDER_AVAILABLE ? <AppText color="danger">{t('bodycam.unavailable')}</AppText> : null}
        {settings.practised ? <AppText color="textMuted">{t('bodycam.unlockReminder')}</AppText> : null}
        <Button
          variant="danger"
          label={t('bodycam.start')}
          disabled={!settings.practised || practice === 'listening' || !RECORDER_AVAILABLE}
          onPress={() => void start()}
        />
        {!settings.practised ? <AppText color="textMuted">{t('bodycam.practiseFirst')}</AppText> : null}
      </Screen>
    );
  }

  // Checkpoints signed so far (fix round 1, group 2a): the recording is proven up to the last one.
  const signed = session.checkpoints.filter((c) => c.status === 'sealed');
  const lastSigned = signed.length ? signed[signed.length - 1] : null;

  return (
    <View style={styles.black}>
      <StatusBar hidden={locked} style="light" />

      {locked ? (
        <Pressable
          style={styles.lock}
          accessibilityLabel={t('bodycam.locked')}
          onPress={() => setMessage(true)}>
          {message ? (
            <AppText variant="label" style={styles.lockText}>
              {t('bodycam.locked')}
            </AppText>
          ) : null}
          {batteryNote ? (
            <AppText variant="label" style={[styles.lockText, { color: dark.warning }]}>
              {batteryNote}
            </AppText>
          ) : null}
        </Pressable>
      ) : (
        <SafeAreaView style={styles.controls}>
          <AppText variant="title" style={{ color: dark.text }}>
            {phase === 'running'
              ? t('bodycam.recordingFor', { time: formatElapsed(now - startedAt) })
              : phase === 'starting'
                ? t('bodycam.starting')
                : t('bodycam.saving')}
          </AppText>
          <AppText style={{ color: dark.textMuted }}>
            {lastSigned
              ? t('bodycam.checkpoints', { count: signed.length, time: formatClock(lastSigned.at) })
              : t('bodycam.noCheckpointYet')}
          </AppText>
          {stopFirst ? <AppText style={{ color: dark.warning }}>{t('bodycam.stopFirst')}</AppText> : null}
          {problem ? <AppText style={{ color: dark.warning }}>{t('bodycam.recorderProblem')}</AppText> : null}
          {batteryNote ? <AppText style={{ color: dark.warning }}>{batteryNote}</AppText> : null}
          {notificationsOff ? <AppText style={{ color: dark.textMuted }}>{t('bodycam.notificationsOff')}</AppText> : null}
          {Platform.OS === 'ios' ? <AppText style={{ color: dark.warning }}>{t('bodycam.iosWarning')}</AppText> : null}
          <Button label={t('bodycam.lock')} disabled={phase !== 'running'} onPress={lock} />
          <Button variant="danger" label={t('bodycam.stop')} busy={phase === 'stopping'} disabled={phase !== 'running'} onPress={() => void stop()} />
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  lock: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  lockText: { color: '#8A8F98', textAlign: 'center' },
  controls: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', padding: spacing.lg, gap: spacing.md, justifyContent: 'center' },
});
