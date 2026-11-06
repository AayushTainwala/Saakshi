import SaakshiSos, { type BugPieceClosedEvent } from '@native/saakshi-sos';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import { PermissionsAndroid, Platform } from 'react-native';

import {
  type LocationSnapshot,
  type SoundClosed,
  type SoundRecorderNative,
  soundRecorder,
  startSoundRecording,
  type UploadPart,
} from '@/modules/evidence';
import { getCurrentFix } from '@/modules/location';

import type { BugEngine } from './controller';

export class MicrophoneDeniedError extends Error {}

/** Checkpoints come every 10 seconds; the place is asked for at most this often, to save battery. */
const LOCATION_REFRESH_MS = 60_000;

/**
 * The place each record carries: the latest fix, refreshed in the background while recording
 * (at most once a minute, as records are made), so sealing never waits for the phone's location.
 */
function locationTracker(): () => LocationSnapshot {
  let current: LocationSnapshot = { status: 'unavailable', fix: null };
  let refreshing = false;
  let lastAsked = 0;
  const refresh = () => {
    if (refreshing || Date.now() - lastAsked < LOCATION_REFRESH_MS) return;
    refreshing = true;
    lastAsked = Date.now();
    void getCurrentFix({ ask: false, timeoutMs: 10_000 })
      .then((result) => {
        current =
          result.status === 'fixed'
            ? { status: 'fixed', fix: { ...result.fix, altitudeMeters: null } }
            : { status: result.status, fix: null };
      })
      .finally(() => {
        refreshing = false;
      });
  };
  refresh();
  return () => {
    const snapshot = current;
    refresh();
    return snapshot;
  };
}

async function ensureMicrophone(): Promise<void> {
  const { granted } = await requestRecordingPermissionsAsync();
  if (!granted) throw new MicrophoneDeniedError('Microphone permission was not granted');
}

function fromAndroid(event: BugPieceClosedEvent): SoundClosed {
  return {
    uri: event.uri,
    clip: event.clip,
    index: event.index,
    startedAt: event.startedAt,
    endedAt: event.endedAt,
    endReason: event.endReason,
    gapBeforeMs: event.gapBeforeMs,
    recording: event.recording ?? null,
    finalSize: event.finalSize ?? null,
    finalSha256: event.finalSha256 ?? null,
  };
}

type AndroidNative = Pick<NonNullable<typeof SaakshiSos>, 'addListener' | 'bugRecorderStart' | 'bugRecorderStop'>;

/**
 * Android: the app's own recorder in a microphone foreground service (modules/saakshi-sos), writing
 * one cut-off-safe AAC file with checkpoints and its crash-recovery marker into the evidence
 * session. Stop resolves once the service says the last file has closed (or after 5 seconds).
 */
export function androidRecorder(
  notice: { title: string; text: string },
  native: AndroidNative | null | undefined = SaakshiSos,
): SoundRecorderNative {
  if (!native) throw new Error('Bug mode is not built into this app');
  let stopped: (() => void) | null = null;
  return {
    listen(handlers) {
      const subscriptions = [
        native.addListener('onBugCheckpoint', (event) => handlers.checkpoint(event)),
        native.addListener('onBugPieceClosed', (event) => handlers.closed(fromAndroid(event))),
        native.addListener('onBugRecorderError', (event) => handlers.error(event.message)),
        native.addListener('onBugRecorderStopped', () => stopped?.()),
      ];
      return { remove: () => subscriptions.forEach((s) => s.remove()) };
    },
    start: (options) =>
      native.bugRecorderStart({ ...options, notificationTitle: notice.title, notificationText: notice.text }),
    async stop() {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const done = new Promise<void>((resolve) => {
        stopped = resolve;
        timer = setTimeout(resolve, 5000);
      });
      await native.bugRecorderStop();
      await done;
      clearTimeout(timer);
      stopped = null;
      // The files came as events.
      return [];
    },
  };
}

export function startBugEngine(
  notice: { title: string; text: string },
  onPart: (part: UploadPart) => void,
): Promise<BugEngine> {
  return (async () => {
    await ensureMicrophone();
    let native: SoundRecorderNative;
    if (Platform.OS === 'android') {
      if (Number(Platform.Version) >= 33) {
        // Only so the recording notification shows; recording works without it.
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(() => undefined);
      }
      native = androidRecorder(notice);
    } else {
      // iPhone: the evidence module's recorder (SoundRecorder.swift). iOS shows the orange
      // microphone dot; the Live Activity is started by the controller.
      const ios = soundRecorder();
      if (!ios) throw new Error('Bug mode is not built into this app');
      native = ios;
    }
    const handle = await startSoundRecording({ mode: 'bug', native, location: locationTracker(), onPart });
    return { session: handle.session, stop: (reason) => handle.stop(reason) };
  })();
}
