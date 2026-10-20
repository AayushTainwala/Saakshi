import SaakshiSos, { type BugPieceClosedEvent } from '@native/saakshi-sos';
import { AudioModule, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import { PermissionsAndroid, Platform } from 'react-native';

import { createEvidenceSession, type EndReason, type LocationSnapshot, piecePaths, startAudioPieces } from '@/modules/evidence';
import { getCurrentFix } from '@/modules/location';

import { BUG_PIECE_SECONDS, type BugEngine } from './controller';

export class MicrophoneDeniedError extends Error {}

/**
 * The place each piece's record carries: the latest fix, refreshed in the background while
 * recording, so sealing a piece never waits for the phone's location.
 */
function locationTracker(): { snapshot: () => LocationSnapshot; refresh: () => void } {
  let current: LocationSnapshot = { status: 'unavailable', fix: null };
  const refresh = () => {
    void getCurrentFix({ ask: false, timeoutMs: 10_000 }).then((result) => {
      current =
        result.status === 'fixed'
          ? { status: 'fixed', fix: { ...result.fix, altitudeMeters: null } }
          : { status: result.status, fix: null };
    });
  };
  refresh();
  return { snapshot: () => current, refresh };
}

async function ensureMicrophone(): Promise<void> {
  const { granted } = await requestRecordingPermissionsAsync();
  if (!granted) throw new MicrophoneDeniedError('Microphone permission was not granted');
}

/**
 * Android: the app's own recorder in a microphone foreground service (modules/saakshi-sos),
 * writing cut-off-safe AAC pieces and crash-recovery markers into the evidence session. A piece
 * that closes while the app's JavaScript isn't running keeps its marker and is sealed when the app
 * next opens.
 */
async function androidEngine(notice: { title: string; text: string }): Promise<BugEngine> {
  const native = SaakshiSos;
  if (!native) throw new Error('Bug mode is not built into this app');
  await ensureMicrophone();
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    // Only so the recording notification shows; recording works without it.
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(() => undefined);
  }

  const session = createEvidenceSession();
  const location = locationTracker();
  let stopReason: EndReason | null = null;
  let onFinal: (() => void) | null = null;
  const subscription = native.addListener('onBugPieceClosed', (event: BugPieceClosedEvent) => {
    const reason: EndReason = event.endReason === 'stopped' && stopReason ? stopReason : event.endReason;
    void session.add({
      uri: event.uri,
      kind: 'audio',
      segment: { clip: event.clip, index: event.index },
      startedAt: new Date(event.startedAt),
      endedAt: new Date(event.endedAt),
      location: location.snapshot(),
      mode: 'bug',
      endReason: reason,
      gapBeforeMs: event.gapBeforeMs,
      pendingMarker: event.marker,
    });
    location.refresh();
    if (event.endReason !== 'piece-complete') onFinal?.();
  });

  const { incomingDir, pendingDir } = piecePaths(session);
  try {
    await native.bugRecorderStart({
      outputDir: incomingDir,
      pendingDir,
      pieceSeconds: BUG_PIECE_SECONDS,
      clip: session.nextClip(),
      notificationTitle: notice.title,
      notificationText: notice.text,
    });
  } catch (error) {
    subscription.remove();
    await session.finish();
    throw error;
  }

  return {
    session,
    async stop(reason = 'stopped') {
      stopReason = reason;
      const closed = new Promise<void>((resolve) => {
        onFinal = resolve;
        setTimeout(resolve, 5000);
      });
      await native.bugRecorderStop();
      await closed;
      subscription.remove();
      await session.finish();
    },
  };
}

/**
 * iPhone: expo-audio with background recording, through the evidence module's AudioPieces (the
 * same pipeline as body-cam sound). iOS shows the orange microphone dot; the Live Activity is
 * started by the controller.
 */
async function iosEngine(): Promise<BugEngine> {
  await ensureMicrophone();
  const preset = RecordingPresets.HIGH_QUALITY;
  const options = {
    extension: preset.extension,
    sampleRate: preset.sampleRate,
    numberOfChannels: preset.numberOfChannels,
    bitRate: preset.bitRate,
    isMeteringEnabled: false,
    ...preset.ios,
  };
  // Created outside React (unlike useAudioRecorder) so recording outlives any one screen.
  // eslint-disable-next-line import/namespace -- AudioModule is an object, not an ES namespace.
  const Recorder = AudioModule.AudioRecorder;
  const recorders = [new Recorder(options), new Recorder(options)] as const;
  const location = locationTracker();
  const handle = await startAudioPieces({
    mode: 'bug',
    recorders,
    location: () => {
      location.refresh();
      return location.snapshot();
    },
    pieceSeconds: BUG_PIECE_SECONDS,
  });
  return {
    session: handle.session,
    async stop(reason) {
      await handle.stop(reason);
      for (const recorder of recorders) recorder.release();
    },
  };
}

export function startBugEngine(notice: { title: string; text: string }): Promise<BugEngine> {
  return Platform.OS === 'android' ? androidEngine(notice) : iosEngine();
}
