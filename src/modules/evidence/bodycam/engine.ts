import SaakshiEvidence, { type RecordingClosedEvent } from '@native/saakshi-evidence';
import type { AudioRecorder } from 'expo-audio';
import type { CameraView } from 'expo-camera';
import type { RefObject } from 'react';
import { AppState, type NativeEventSubscription } from 'react-native';

import type { CaptureSession } from '../capture/pipeline';
import { iosVideoController } from '../capture/video';
import type { LockerStore } from '../locker/store';
import type { EndReason, LocationSnapshot } from '../types';
import { AudioPieces } from './audioPieces';
import { BODYCAM_PIECE_SECONDS } from './constants';

export type BodyCamEngine = {
  start: () => Promise<void>;
  stop: (reason?: EndReason) => Promise<void>;
};

type Common = {
  session: CaptureSession;
  store: LockerStore;
  location: () => LocationSnapshot;
  quality: 720 | 1080;
};

/**
 * Android: the app's recorder runs in a foreground service (camera and microphone types), so
 * video and sound carry on with the screen off, during calls and in other apps. Pieces arrive as
 * events and are sealed here. If the JavaScript side is not running when a piece closes, its
 * marker stays and the piece is sealed when the app next opens.
 */
export function androidBodyCam(
  common: Common & { notificationTitle: string; notificationText: string; notificationStop: string },
): BodyCamEngine {
  const native = SaakshiEvidence;
  if (!native) throw new Error('The SaakshiEvidence native module is not available in this build.');
  let stopReason: EndReason | null = null;
  let onFinal: (() => void) | null = null;
  let finished = false;
  const subscription = native.addListener('onRecordingClosed', (event: RecordingClosedEvent) => {
    const reason: EndReason = event.endReason === 'stopped' && stopReason ? stopReason : event.endReason;
    void common.session.add({
      uri: event.uri,
      kind: 'video',
      segment: { clip: event.clip, index: event.index },
      startedAt: new Date(event.startedAt),
      endedAt: new Date(event.endedAt),
      location: common.location(),
      mode: 'body-cam',
      endReason: reason,
      gapBeforeMs: event.gapBeforeMs,
      pendingMarker: `${event.uri.split('/').pop()}.json`,
    });
    if (event.endReason !== 'piece-complete') {
      finished = true;
      onFinal?.();
    }
  });

  return {
    async start() {
      const id = common.session.ensureSession().id;
      const base = common.store.sessionDirUri(id).replace(/\/$/, '');
      await native.bodyCamStart({
        outputDir: `${base}/incoming`,
        pendingDir: `${base}/pending`,
        pieceSeconds: BODYCAM_PIECE_SECONDS,
        quality: common.quality,
        clip: common.session.nextClip(),
        mode: 'body-cam',
        notificationTitle: common.notificationTitle,
        notificationText: common.notificationText,
        notificationStop: common.notificationStop,
      });
    },
    async stop(reason = 'stopped') {
      stopReason = reason;
      // Already over, for example stopped from the notification.
      if (finished) {
        subscription.remove();
        return;
      }
      const closed = new Promise<void>((resolve) => {
        onFinal = resolve;
        setTimeout(resolve, 5000);
      });
      await native.bodyCamStop();
      await closed;
      subscription.remove();
    },
  };
}

/**
 * iPhone: Apple allows video only while the app is on screen. Video is recorded by expo-camera in
 * pieces (muted); sound is recorded separately in pieces with background recording, so it carries
 * on when the user leaves the app or a call comes in. When the app leaves the screen the video
 * piece ends with `app-left`; when it returns, video restarts as a new clip, and the gap is in the
 * first piece's record.
 */
export function iosBodyCam(
  camera: RefObject<CameraView | null>,
  recorders: readonly [AudioRecorder, AudioRecorder],
  common: Common,
): BodyCamEngine {
  const audio = new AudioPieces(recorders, common.session, common.store, common.location, BODYCAM_PIECE_SECONDS);
  let running = false;
  let videoOn = false;
  let current: ReturnType<typeof iosVideoController> | null = null;
  let lastVideoEnd: number | null = null;
  let loop: Promise<void> = Promise.resolve();
  let appState: NativeEventSubscription | null = null;

  const videoLoop = async () => {
    const clip = common.session.nextClip();
    for (let index = 0; videoOn && running; index++) {
      const gapBeforeMs = lastVideoEnd === null ? null : Date.now() - lastVideoEnd;
      current = iosVideoController(camera, {
        session: common.session,
        store: common.store,
        location: common.location,
        mode: 'body-cam',
        clip,
        segment: { index },
        maxDuration: BODYCAM_PIECE_SECONDS,
        gapBeforeMs,
      });
      try {
        await current.start();
      } catch {
        break;
      }
      const result = await current.done;
      lastVideoEnd = Date.now();
      current = null;
      if (!result || result.endReason !== 'piece-complete') break;
    }
  };

  const startVideo = () => {
    if (videoOn) return;
    videoOn = true;
    loop = videoLoop().finally(() => {
      videoOn = false;
    });
  };

  const stopVideo = async (reason: EndReason) => {
    videoOn = false;
    await current?.stop(reason);
    await loop;
  };

  return {
    async start() {
      running = true;
      await audio.start();
      startVideo();
      appState = AppState.addEventListener('change', (state) => {
        if (!running) return;
        if (state === 'background') void stopVideo('app-left');
        if (state === 'active') startVideo();
      });
    },
    async stop(reason = 'stopped') {
      running = false;
      appState?.remove();
      await stopVideo(reason);
      await audio.stop(reason);
    },
  };
}
