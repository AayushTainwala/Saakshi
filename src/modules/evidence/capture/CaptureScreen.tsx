import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SaakshiEvidence, { RecorderPreview } from '@native/saakshi-evidence';
import {
  AppState,
  BackHandler,
  type GestureResponderEvent,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components';
import { type BatteryAction, useLowBattery } from '@/platform/battery';
import {
  cameraBytesPerSecond,
  canStart,
  noRoomLabel,
  readFreeBytes,
  roomLabel,
  SAFETY_FLOOR_BYTES,
  secondsLeft,
  useFreeBytes,
  useStorageSettings,
  watchStorage,
} from '@/platform/storage';
import { palettes, radius, spacing, touchTarget } from '@/theme';

import { fileLocker } from '../locker/store';
import { RightsOverlay } from '../rights/RightsOverlay';
import type { EndReason, MediaKind } from '../types';
import { createPipelineDeps } from './deps';
import { CaptureSession } from './pipeline';
import { useLatestLocation } from './useLocation';
import { androidVideoController, iosVideoController, type VideoController } from './video';
import { cameraZoom, clampZoom, touchDistance, ULTRA_WIDE_LENS, type ZoomEngine, zoomLabel, zoomPresets } from './zoom';

type Facing = 'back' | 'front';

/** Android records video with the app's own recorder (MPEG-TS, cut-off safe); iPhone with expo-camera. */
const OWN_RECORDER = Platform.OS === 'android' && !!SaakshiEvidence?.recorderSupported();

// The camera screen is always dark, whatever the app theme, so the preview reads clearly.
const colors = palettes.dark;

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function CaptureScreen() {
  const { t } = useTranslation('record');
  const { t: ts } = useTranslation('storage');
  const storage = useStorageSettings();
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
  const [recordingSince, setRecordingSince] = useState(0);
  const [clock, setClock] = useState(0);

  // Front or back camera, and zoom (fix round 1, group 4). Neither camera can be switched to during
  // a video; zoom can change while recording, except iPhone's 0.5x, which is a different lens.
  const [facing, setFacing] = useState<Facing>('back');
  const [engine, setEngine] = useState<ZoomEngine | null>(null);
  const [factor, setFactor] = useState(1);
  // iPhone: a change to or from the 0.5x lens swaps expo-camera's camera; the shutter waits for it
  // (until expo-camera reports the lens, or a second and a half).
  const [lensSettling, setLensSettling] = useState(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);
  const zoomTo = (next: number, options: { lensChange?: boolean } = {}) => {
    if (!engine) return;
    const keepLens = engine.kind === 'ios' && options.lensChange === false;
    const value = clampZoom(engine, next, { recording: recording || keepLens, current: factor });
    if (engine.kind === 'ios' && value < 1 !== factor < 1) {
      setLensSettling(true);
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => setLensSettling(false), 1500);
    }
    setFactor(value);
  };
  // Two fingers on the picture zoom: the zoom when the fingers came down, times how far they moved
  // apart. On iPhone the 0.5x lens is changed to or from only when the fingers lift, not back and
  // forth while pinching.
  const pinch = useRef<{ distance: number; from: number; wanted: number } | null>(null);
  const twoFingers = (e: GestureResponderEvent) => e.nativeEvent.touches.length >= 2;
  const onPinchMove = (e: GestureResponderEvent) => {
    const distance = touchDistance(e.nativeEvent.touches);
    if (!distance) {
      // A finger lifted: the next two start afresh.
      pinch.current = null;
      return;
    }
    if (!pinch.current) {
      pinch.current = { distance, from: factor, wanted: factor };
      return;
    }
    const wanted = (pinch.current.from * distance) / pinch.current.distance;
    pinch.current.wanted = wanted;
    zoomTo(wanted, { lensChange: false });
  };
  const onPinchEnd = () => {
    const wanted = pinch.current?.wanted;
    pinch.current = null;
    if (wanted !== undefined && engine?.kind === 'ios') zoomTo(wanted);
  };
  // A new camera view for each camera and mode: expo-camera says it is ready only once per view.
  const viewKey = `${facing}-${mode}`;
  const facingNow = useRef(facing);
  useEffect(() => {
    facingNow.current = facing;
  }, [facing]);
  const switchCamera = () => {
    if (recording || !ready) return;
    setReady(false);
    setEngine(null);
    setFactor(1);
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
  };
  const chooseMode = (next: MediaKind) => {
    if (next === mode) return;
    setReady(false);
    setEngine(null);
    setFactor(1);
    setMode(next);
  };

  /** expo-camera's camera is ready: learn how far it zooms (and, on iPhone, whether there is a 0.5x lens). */
  const onCameraReady = useCallback(async () => {
    setReady(true);
    const native = SaakshiEvidence;
    if (!native) return;
    const asked = facing;
    try {
      if (Platform.OS === 'ios') {
        const lenses = (await camera.current?.getAvailableLensesAsync()) ?? [];
        const maxZoom = await native.cameraMaxZoom(asked, null);
        // A late answer about the camera before a switch is not this camera's.
        if (facingNow.current !== asked) return;
        setEngine({ kind: 'ios', maxZoom, ultraWide: asked === 'back' && lenses.some((l) => l.deviceType === ULTRA_WIDE_LENS) });
      } else {
        const range = await native.cameraZoomRange(asked);
        if (facingNow.current !== asked) return;
        setEngine({ kind: 'android-photo', maxZoom: range.max });
      }
    } catch {
      // No zoom controls; the camera works as before.
    }
  }, [facing]);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setClock(Date.now()), 500);
    return () => clearInterval(timer);
  }, [recording]);
  const elapsed = Math.max(0, Math.floor((clock - recordingSince) / 1000));

  // Free storage, stage one (SPEC section 4, "Storage"; repair round A, group 2). The evidence
  // camera has warnings and no automatic stop above the safety floor, as with the battery; at the
  // floor nothing is recorded, and a video being recorded is stopped and saved.
  const [storageNote, setStorageNote] = useState<string | null>(null);
  /** True if there is room above the floor (or the phone doesn't say); otherwise says why not. */
  const roomToRecord = useCallback(() => {
    const free = readFreeBytes();
    if (free === null || canStart(free, SAFETY_FLOOR_BYTES)) return true;
    setStorageNote(noRoomLabel(ts, free, null));
    return false;
  }, [ts]);

  const takePhoto = useCallback(async () => {
    if (!camera.current || busy) return;
    if (!roomToRecord()) return;
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
  }, [busy, location, roomToRecord, session]);

  const controller = useRef<VideoController | null>(null);

  // Android: the app's recorder owns the camera in video mode, and needs opening and closing.
  useEffect(() => {
    if (!OWN_RECORDER || mode !== 'video' || !SaakshiEvidence) return;
    const native = SaakshiEvidence;
    const ready = native.addListener('onRecorderReady', (event) => {
      setReady(true);
      if (typeof event.minZoom === 'number' && typeof event.maxZoom === 'number') {
        setEngine({ kind: 'android-video', minZoom: event.minZoom, maxZoom: event.maxZoom });
      }
    });
    void native.recorderOpen(720, facing);
    return () => {
      ready.remove();
      setReady(false);
      void native.recorderClose();
    };
  }, [mode, facing]);

  const zoom = engine ? cameraZoom(engine, factor) : { lens: undefined, zoom: 0, ratio: 1 };
  // Android video: the app's recorder takes the ratio itself, recording or not; at most about 30
  // times a second while pinching, and always the last one.
  const zoomSentAt = useRef(0);
  useEffect(() => {
    if (!OWN_RECORDER || mode !== 'video' || engine?.kind !== 'android-video') return;
    const send = () => {
      zoomSentAt.current = Date.now();
      void SaakshiEvidence?.recorderSetZoom(zoom.ratio);
    };
    const wait = 33 - (Date.now() - zoomSentAt.current);
    if (wait <= 0) {
      send();
      return;
    }
    const timer = setTimeout(send, wait);
    return () => clearTimeout(timer);
  }, [mode, engine, zoom.ratio]);

  /** One video, one file, from start to stop (spec E1). */
  const startRecording = useCallback(async () => {
    if (recordingRef.current) return;
    if (!roomToRecord()) return;
    setStorageNote(null);
    recordingRef.current = true;
    const common = { session, store: fileLocker, location, mode: 'camera' as const, clip: session.nextClip() };
    const next = OWN_RECORDER ? androidVideoController({ ...common, quality: 720 }) : iosVideoController(camera, common);
    controller.current = next;
    const now = Date.now();
    setRecordingSince(now);
    setClock(now);
    setRecording(true);
    try {
      await next.start();
    } catch {
      recordingRef.current = false;
      controller.current = null;
      setRecording(false);
    }
  }, [location, roomToRecord, session]);

  const stopRecording = useCallback(async (reason: EndReason = 'stopped') => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    const current = controller.current;
    controller.current = null;
    await current?.stop(reason);
    if (current && 'dispose' in current) (current as { dispose: () => void }).dispose();
    setRecording(false);
  }, []);

  // SPEC E1 (owner, 6 Nov 2026): the evidence camera warns at 10% and 5% and never stops by itself.
  const [batteryNote, setBatteryNote] = useState<string | null>(null);
  const onBattery = useCallback(
    (action: BatteryAction) => {
      if (action.type === 'warn') setBatteryNote(t('battery.warn', { percent: action.percent }));
    },
    [t],
  );
  useLowBattery(recording, onBattery);

  // While a video records: warnings at about 30 and 10 minutes of room left before the floor, a
  // note once the phone is below the room the user keeps free (recording carries on), and at the
  // floor the video is stopped and saved ("storage-full"). A reading that fails stops nothing.
  useEffect(() => {
    if (!recording) return;
    let pastKeepFree = false;
    const watch = watchStorage(
      () => ({ limitBytes: SAFETY_FLOOR_BYTES, floorBytes: SAFETY_FLOOR_BYTES, bytesPerSecond: cameraBytesPerSecond() }),
      (action) => {
        if (action.type === 'warn') setStorageNote(ts('warn.video', { minutes: action.minutes }));
        else if (action.type === 'floor') {
          setStorageNote(ts('warn.stoppedFloor'));
          void stopRecording('storage-full');
        } else if (action.type === 'unknown') setStorageNote(ts('warn.unknown'));
        else if (action.type === 'known') setStorageNote(null);
      },
      readFreeBytes,
      (free) => {
        if (free === null || pastKeepFree || free > storage.keepFreeBytes || free <= SAFETY_FLOOR_BYTES) return;
        pastKeepFree = true;
        setStorageNote(ts('warn.pastKeepFree'));
      },
    );
    return watch.stop;
  }, [recording, stopRecording, storage.keepFreeBytes, ts]);
  // Always shown before a video starts: how long the free room allows, down to the floor.
  const freeBytes = useFreeBytes(mode === 'video' && !recording);
  const room = mode === 'video' && !recording ? roomLabel(ts, 'video', secondsLeft(freeBytes, SAFETY_FLOOR_BYTES, cameraBytesPerSecond())) : null;

  const close = useCallback(async () => {
    await stopRecording();
    void session.finish();
    const id = session.id;
    if (id) router.replace({ pathname: '/record/[session]', params: { session: id } });
    else router.back();
  }, [session, stopRecording]);

  // The camera can't record in the background; close the file cleanly instead, and say why (fix
  // round 1, group 5). Only covering the app (Control Center, Notification Center) leaves it
  // recording, as for body-cam (group 2).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') void stopRecording('app-left');
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

  useEffect(
    () => () => {
      void controller.current?.stop();
    },
    [],
  );

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
      {OWN_RECORDER && mode === 'video' ? (
        <RecorderPreview key={facing} style={StyleSheet.absoluteFill} />
      ) : (
        <CameraView
          key={viewKey}
          ref={camera}
          style={StyleSheet.absoluteFill}
          mode={mode === 'photo' ? 'picture' : 'video'}
          facing={facing}
          zoom={zoom.zoom}
          selectedLens={Platform.OS === 'ios' ? zoom.lens : undefined}
          videoQuality="720p"
          onCameraReady={() => void onCameraReady()}
          onAvailableLensesChanged={() => setLensSettling(false)}
        />
      )}
      {/* Two fingers anywhere on the picture zoom; one finger does nothing here. */}
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={twoFingers}
        onMoveShouldSetResponder={twoFingers}
        onResponderMove={onPinchMove}
        onResponderRelease={onPinchEnd}
        onResponderTerminate={onPinchEnd}
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
            {batteryNote ? (
              <AppText variant="small" style={{ color: colors.warning }}>
                {batteryNote}
              </AppText>
            ) : null}
            {storageNote ? (
              <AppText variant="small" style={{ color: colors.warning }}>
                {storageNote}
              </AppText>
            ) : room ? (
              <AppText variant="small" style={{ color: colors.textMuted }}>
                {room}
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
          {engine ? (
            <View style={styles.zoomRow} accessibilityRole="radiogroup" accessibilityLabel={t('capture.zoom')}>
              {zoomPresets(engine).map((preset) => {
                const selected = Math.abs(preset - factor) < 0.05;
                const unavailable = recording && engine.kind === 'ios' && preset < 1 !== factor < 1;
                return (
                  <Pressable
                    key={preset}
                    accessibilityRole="radio"
                    accessibilityLabel={t('capture.zoomTo', { factor: zoomLabel(preset) })}
                    accessibilityState={{ checked: selected, disabled: unavailable }}
                    disabled={unavailable}
                    onPress={() => zoomTo(preset)}
                    style={[styles.zoomButton, selected && { backgroundColor: colors.surfaceRaised }, unavailable && { opacity: 0.4 }]}>
                    <AppText variant="label" style={{ color: colors.text }}>
                      {selected ? `${zoomLabel(factor)}×` : `${zoomLabel(preset)}×`}
                    </AppText>
                  </Pressable>
                );
              })}
              {zoomPresets(engine).every((preset) => Math.abs(preset - factor) >= 0.05) ? (
                <View style={[styles.zoomButton, { backgroundColor: colors.surfaceRaised }]} accessible accessibilityLabel={t('capture.zoomNow', { factor: zoomLabel(factor) })}>
                  <AppText variant="label" style={{ color: colors.text }}>
                    {zoomLabel(factor)}×
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : null}
          <View style={styles.modes} accessibilityRole="radiogroup">
            {(['photo', 'video'] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: mode === value, disabled: recording }}
                disabled={recording}
                onPress={() => chooseMode(value)}
                style={[styles.modeButton, mode === value && { backgroundColor: colors.surfaceRaised }]}>
                <AppText variant="label" style={{ color: colors.text }}>
                  {t(value === 'photo' ? 'capture.photo' : 'capture.video')}
                </AppText>
              </Pressable>
            ))}
          </View>
          <View style={styles.shutterRow}>
            <View style={styles.side} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                mode === 'photo'
                  ? t('capture.takePhoto')
                  : recording
                    ? t('capture.stopVideo')
                    : t('capture.startVideo')
              }
              disabled={!ready || busy || (lensSettling && !recording)}
              onPress={mode === 'photo' ? takePhoto : recording ? () => void stopRecording() : startRecording}
              style={[styles.shutter, { opacity: !ready || busy || (lensSettling && !recording) ? 0.5 : 1 }]}>
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
            <View style={styles.side}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={facing === 'back' ? t('capture.switchToFront') : t('capture.switchToBack')}
                accessibilityHint={recording ? t('capture.switchWhileRecording') : undefined}
                accessibilityState={{ disabled: recording || !ready }}
                disabled={recording || !ready}
                onPress={switchCamera}
                style={[styles.roundButton, (recording || !ready) && { opacity: 0.4 }]}>
                <AppText variant="label" style={{ color: colors.text }}>
                  ⇄
                </AppText>
              </Pressable>
            </View>
          </View>
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
  zoomRow: {
    flexDirection: 'row',
    backgroundColor: colors.overlay,
    borderRadius: radius.lg,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  zoomButton: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    borderRadius: touchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  shutterRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center' },
  side: { flex: 1, alignItems: 'center' },
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
