import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, BackHandler, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components';
import { palettes, radius, spacing, touchTarget } from '@/theme';

import { SEGMENT_SECONDS } from '../constants';
import { RightsOverlay } from '../rights/RightsOverlay';
import type { MediaKind } from '../types';
import { createPipelineDeps } from './deps';
import { CaptureSession } from './pipeline';
import { useLatestLocation } from './useLocation';

// The camera screen is always dark, whatever the app theme, so the preview reads clearly.
const colors = palettes.dark;

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function CaptureScreen() {
  const { t } = useTranslation('record');
  const camera = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const location = useLatestLocation();

  const session = useMemo(() => new CaptureSession(createPipelineDeps()), []);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => session.subscribe(refresh), [session]);

  const [mode, setMode] = useState<MediaKind>('photo');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(false);
  const loopDone = useRef<Promise<void>>(Promise.resolve());
  const [recordingSince, setRecordingSince] = useState(0);
  const [clock, setClock] = useState(0);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setClock(Date.now()), 500);
    return () => clearInterval(timer);
  }, [recording]);
  const elapsed = Math.max(0, Math.floor((clock - recordingSince) / 1000));

  const takePhoto = useCallback(async () => {
    if (!camera.current || busy) return;
    setBusy(true);
    try {
      const at = new Date();
      const picture = await camera.current.takePictureAsync({ quality: 1, exif: false });
      if (picture?.uri) {
        void session.add({
          uri: picture.uri,
          kind: 'photo',
          segment: null,
          startedAt: at,
          endedAt: at,
          location: location(),
        });
      }
    } finally {
      setBusy(false);
    }
  }, [busy, location, session]);

  /** Records consecutive segments until stopped, handing each finished one to the pipeline. */
  const recordSegments = useCallback(async () => {
    const clip = session.nextClip();
    for (let index = 0; recordingRef.current && camera.current; index++) {
      const startedAt = new Date();
      const result = await camera.current.recordAsync({ maxDuration: SEGMENT_SECONDS });
      const endedAt = new Date();
      if (result?.uri) {
        void session.add({
          uri: result.uri,
          kind: 'video',
          segment: { clip, index },
          startedAt,
          endedAt,
          location: location(),
        });
      }
    }
  }, [location, session]);

  const startRecording = useCallback(() => {
    if (recordingRef.current) return;
    recordingRef.current = true;
    const now = Date.now();
    setRecordingSince(now);
    setClock(now);
    setRecording(true);
    loopDone.current = recordSegments()
      .catch(() => undefined)
      .finally(() => {
        recordingRef.current = false;
        setRecording(false);
      });
  }, [recordSegments]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    camera.current?.stopRecording();
    await loopDone.current;
  }, []);

  const close = useCallback(async () => {
    await stopRecording();
    void session.finish();
    const id = session.id;
    if (id) router.replace({ pathname: '/record/[session]', params: { session: id } });
    else router.back();
  }, [session, stopRecording]);

  // The camera can't record in the background; finish the current segment cleanly instead.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void stopRecording();
    });
    return () => subscription.remove();
  }, [stopRecording]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      void close();
      return true;
    });
    return () => subscription.remove();
  }, [close]);

  useEffect(() => () => camera.current?.stopRecording(), []);

  if (!cameraPermission || !micPermission) return <View style={styles.fill} />;

  const needsCamera = !cameraPermission.granted;
  const needsMic = mode === 'video' && !micPermission.granted;
  if (needsCamera || needsMic) {
    const permission = needsCamera ? cameraPermission : micPermission;
    const request = needsCamera ? requestCameraPermission : requestMicPermission;
    return (
      <SafeAreaView style={[styles.fill, styles.permission]}>
        <AppText variant="heading" style={{ color: colors.text }}>
          {needsCamera ? t('capture.cameraPermissionTitle') : t('capture.micPermissionTitle')}
        </AppText>
        <AppText style={{ color: colors.textMuted }}>
          {needsCamera ? t('capture.cameraPermissionBody') : t('capture.micPermissionBody')}
        </AppText>
        {permission.canAskAgain ? (
          <Button label={t('capture.allow')} onPress={request} />
        ) : (
          <Button label={t('capture.openSettings')} onPress={() => Linking.openSettings()} />
        )}
        <Button variant="secondary" label={t('capture.close')} onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const saved = session.items.length;
  const pending = session.pending;

  return (
    <View style={styles.fill}>
      <CameraView
        ref={camera}
        style={StyleSheet.absoluteFill}
        mode={mode === 'photo' ? 'picture' : 'video'}
        videoQuality="720p"
        onCameraReady={() => setReady(true)}
      />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('capture.close')}
            onPress={close}
            style={styles.roundButton}>
            <AppText variant="label" style={{ color: colors.text }}>
              ✕
            </AppText>
          </Pressable>
          <View style={styles.status} accessibilityLiveRegion="polite">
            {recording ? (
              <AppText variant="label" style={{ color: colors.danger }}>
                ● {formatElapsed(elapsed)}
              </AppText>
            ) : null}
            <AppText variant="small" style={{ color: colors.text }}>
              {pending > 0
                ? t('capture.sealing', { count: pending })
                : t('capture.saved', { count: saved })}
            </AppText>
          </View>
        </View>

        <View style={styles.bottomBar}>
          <RightsOverlay />
          <View style={styles.modes} accessibilityRole="radiogroup">
            {(['photo', 'video'] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: mode === value, disabled: recording }}
                disabled={recording}
                onPress={() => setMode(value)}
                style={[styles.modeButton, mode === value && { backgroundColor: colors.surfaceRaised }]}>
                <AppText variant="label" style={{ color: colors.text }}>
                  {t(value === 'photo' ? 'capture.photo' : 'capture.video')}
                </AppText>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              mode === 'photo'
                ? t('capture.takePhoto')
                : recording
                  ? t('capture.stopVideo')
                  : t('capture.startVideo')
            }
            disabled={!ready || busy}
            onPress={mode === 'photo' ? takePhoto : recording ? stopRecording : startRecording}
            style={[styles.shutter, { opacity: !ready || busy ? 0.5 : 1 }]}>
            <View
              style={
                mode === 'video'
                  ? recording
                    ? styles.shutterStop
                    : styles.shutterRecord
                  : styles.shutterPhoto
              }
            />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const SHUTTER = 84;

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  permission: { padding: spacing.lg, gap: spacing.md, justifyContent: 'center' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.md,
  },
  roundButton: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: touchTarget / 2,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    backgroundColor: colors.overlay,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'flex-end',
  },
  bottomBar: { alignItems: 'center', gap: spacing.md, paddingBottom: spacing.lg },
  modes: {
    flexDirection: 'row',
    backgroundColor: colors.overlay,
    borderRadius: radius.lg,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  modeButton: {
    minHeight: touchTarget,
    minWidth: 112,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  shutter: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: SHUTTER / 2,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPhoto: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF' },
  shutterRecord: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E53935' },
  shutterStop: { width: 34, height: 34, borderRadius: 6, backgroundColor: '#E53935' },
});
