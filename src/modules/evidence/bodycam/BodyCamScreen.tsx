import SaakshiEvidence from '@native/saakshi-evidence';
import { RecordingPresets, useAudioRecorder } from 'expo-audio';
import { useLowPowerMode } from 'expo-battery';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
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
import { type BodyCamSettings, loadBodyCamSettings, saveBodyCamSettings } from './settings';

const KEEP_AWAKE_TAG = 'saakshi-bodycam';
const OWN_RECORDER = Platform.OS === 'android' && !!SaakshiEvidence?.recorderSupported();
const dark = palettes.dark;

type Phase = 'setup' | 'starting' | 'running' | 'stopping';

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
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const lowPowerMode = useLowPowerMode();
  const location = useLatestLocation();
  // iPhone sound pieces: two recorders, used in turn so each piece starts before the last stops.
  const recorderA = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderB = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [settings, setSettingsState] = useState<BodyCamSettings>(loadBodyCamSettings);
  const setSettings = (next: BodyCamSettings) => {
    setSettingsState(next);
    saveBodyCamSettings(next);
  };

  const [phase, setPhase] = useState<Phase>('setup');
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [notificationsOff, setNotificationsOff] = useState(false);
  const [now, setNow] = useState(0);
  const camera = useRef<CameraView>(null);
  const engine = useRef<BodyCamEngine | null>(null);
  const session = useMemo(() => createEvidenceSession(), []);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => session.subscribe(refresh), [session]);

  useEffect(() => {
    if (phase !== 'running') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [phase]);

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
    const subscription = SaakshiEvidence.addListener('onVolumeDown', () => press());
    return () => subscription.remove();
  }, [locked, unlock]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(false), LOCK_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [message]);

  // ---- Start and stop --------------------------------------------------------------------------

  const begin = useCallback(async () => {
    const common = { session, store: fileLocker, location, quality: settings.quality };
    const next = OWN_RECORDER
      ? androidBodyCam({
          ...common,
          notificationTitle: t('bodycam.notificationTitle'),
          notificationText: t('bodycam.notificationText'),
          notificationStop: t('bodycam.notificationStop'),
        })
      : iosBodyCam(camera, [recorderA, recorderB], common);
    engine.current = next;
    await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    await next.start();
    const at = Date.now();
    setStartedAt(at);
    setNow(at);
    setPhase('running');
    lock();
  }, [location, lock, recorderA, recorderB, session, settings.quality, t]);

  /**
   * Android 13+: the recording notice (with its Stop button) needs the notification permission.
   * Ask the first time body-cam starts; if refused, record anyway and say where the notice is.
   */
  const checkNotifications = useCallback(async () => {
    if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return;
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (await PermissionsAndroid.check(permission)) return setNotificationsOff(false);
    if (!settings.notificationsAsked) {
      setSettings({ ...settings, notificationsAsked: true });
      const result = await PermissionsAndroid.request(permission);
      if (result === PermissionsAndroid.RESULTS.GRANTED) return setNotificationsOff(false);
    }
    setNotificationsOff(true);
  }, [settings]);

  const start = useCallback(async () => {
    await checkNotifications().catch(() => undefined);
    // iPhone records through expo-camera, which must be on screen and ready first.
    if (OWN_RECORDER) void begin();
    else setPhase('starting');
  }, [begin, checkNotifications]);


  const stop = useCallback(
    async (reason: EndReason = 'stopped') => {
      const current = engine.current;
      engine.current = null;
      setPhase('stopping');
      unlock();
      await current?.stop(reason);
      await session.finish();
      deactivateKeepAwake(KEEP_AWAKE_TAG);
      const id = session.id;
      if (id) router.replace({ pathname: '/record/[session]', params: { session: id } });
      else router.back();
    },
    [session, unlock],
  );

  // Android: stopped from the recording notice's Stop button.
  useEffect(() => {
    if (!OWN_RECORDER || !SaakshiEvidence || phase !== 'running') return;
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

  // While recording, the back button never leaves the screen: unlock with the volume buttons,
  // then use Stop.
  useEffect(() => {
    if (phase !== 'running' && phase !== 'starting') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [phase]);

  useEffect(
    () => () => {
      if (engine.current) void engine.current.stop('stopped');
      void SaakshiEvidence?.setScreenDimmed(false);
      void SaakshiEvidence?.volumeKeysStop();
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    },
    [],
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
          {!settings.taught ? (
            <Button variant="secondary" label={t('bodycam.unlockAck')} onPress={() => setSettings({ ...settings, taught: true })} />
          ) : null}
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
          onChange={(value) => setSettings({ ...settings, quality: value === '1080' ? 1080 : 720 })}
        />

        <Button variant="danger" label={t('bodycam.start')} disabled={!settings.taught} onPress={() => void start()} />
        {!settings.taught ? <AppText color="textMuted">{t('bodycam.ackFirst')}</AppText> : null}
      </Screen>
    );
  }

  const pieces = session.items.length;

  return (
    <View style={styles.black}>
      <StatusBar hidden={locked} style="light" />
      {Platform.OS === 'ios' && !OWN_RECORDER ? (
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          mode="video"
          mute
          videoQuality={settings.quality === 1080 ? '1080p' : '720p'}
          onCameraReady={() => {
            if (phase === 'starting') void begin();
          }}
        />
      ) : null}

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
            {phase === 'stopping' ? t('bodycam.saving') : t('bodycam.recordingFor', { time: formatElapsed(now - startedAt) })}
          </AppText>
          <AppText style={{ color: dark.textMuted }}>{t('bodycam.pieces', { count: pieces })}</AppText>
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
