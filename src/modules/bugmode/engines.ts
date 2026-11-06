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

/** How long Start waits for the Android recorder to say its first file is recording. */
const START_TIMEOUT_MS = 8000;

/**
 * Android: the app's own recorder in a microphone foreground service (modules/saakshi-sos), writing
 * one cut-off-safe AAC file with checkpoints and its crash-recovery marker into the evidence
 * session. Stop resolves once the service says the last file has closed (or after 5 seconds).
 */
export function androidRecorder(
  notice: { title: string; text: string },
  native: AndroidNative | null | undefined = SaakshiSos,
): SoundRecorderNative {
  if (!native) throw new Error('Pocket recording is not built into this app');
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
    // The service starts at once; the recorder in it may not. Resolves once the first file is
    // recording, or rejects with the recorder's reason (and stops the service).
    start: (options) =>
      new Promise<void>((resolve, reject) => {
        let settled = false;
        const settle = (error?: Error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          started.remove();
          failed.remove();
          if (!error) return resolve();
          void native.bugRecorderStop().catch(() => undefined);
          reject(error);
        };
        const started = native.addListener('onBugRecorderStarted', () => settle());
        const failed = native.addListener('onBugRecorderError', (event) => settle(new Error(event.message)));
        const timer = setTimeout(() => settle(new Error('Recording did not start')), START_TIMEOUT_MS);
        native
          .bugRecorderStart({ ...options, notificationTitle: notice.title, notificationText: notice.text })
          .catch((error: unknown) => settle(error instanceof Error ? error : new Error(String(error))));
      }),
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
  onProblem: (message: string) => void,
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
      if (!ios) throw new Error('Pocket recording is not built into this app');
      native = ios;
    }
    const handle = await startSoundRecording({ mode: 'bug', native, location: locationTracker(), onPart, onProblem });
    return { session: handle.session, stop: (reason) => handle.stop(reason) };
  })();
}
