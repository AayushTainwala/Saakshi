import SaakshiEvidence, { type RecordingClosedEvent } from '@native/saakshi-evidence';
import type { CameraView } from 'expo-camera';
import type { RefObject } from 'react';
import { AppState } from 'react-native';

import type { LockerStore } from '../locker/store';
import { markerName, type PendingMarker } from '../locker/pending';
import type { CaptureMode, EndReason, LocationSnapshot } from '../types';
import type { CaptureSession } from './pipeline';

/**
 * Why expo-camera ended a recording we didn't stop: it reached the piece length, the app left
 * the screen (iPhone stops video then), or the system took the camera.
 */
function endedBySystem(startedAt: Date, endedAt: Date, maxDuration?: number): EndReason {
  if (maxDuration && endedAt.getTime() - startedAt.getTime() >= maxDuration * 1000 - 1500) return 'piece-complete';
  return AppState.currentState === 'active' ? 'camera-lost' : 'app-left';
}

/** Starts and stops one video recording, handing each finished file to the session. */
export type VideoController = {
  start: () => Promise<void>;
  /** Stops and resolves once the file has been handed to the session. */
  stop: (reason?: EndReason) => Promise<void>;
};

type Common = {
  session: CaptureSession;
  store: LockerStore;
  location: () => LocationSnapshot;
  mode: CaptureMode;
};

/**
 * iPhone: expo-camera records one .mov from start to stop. AVCaptureMovieFileOutput writes a
 * movie fragment every 10 seconds, so a file cut off by a crash plays up to its last fragment.
 * The marker is written before recording starts, because expo-camera only reports the file's path
 * when it stops.
 */
export function iosVideoController(
  camera: RefObject<CameraView | null>,
  common: Common & { clip: number; segment?: { index: number } | null; maxDuration?: number; gapBeforeMs?: number | null },
): VideoController & { done: Promise<{ endReason: EndReason } | null> } {
  let endReason: EndReason = 'stopped';
  let stopping = false;
  let resolveDone: (value: { endReason: EndReason } | null) => void = () => undefined;
  const done = new Promise<{ endReason: EndReason } | null>((resolve) => (resolveDone = resolve));

  return {
    done,
    async start() {
      const view = camera.current;
      if (!view) throw new Error('Camera not ready');
      const sessionId = common.session.ensureSession().id;
      const startedAt = new Date();
      const segment = common.segment ? { clip: common.clip, index: common.segment.index } : null;
      const marker: PendingMarker = {
        file: null,
        search: 'ios-camera-cache',
        kind: 'video',
        segment,
        startedAt: startedAt.toISOString(),
        mode: common.mode,
        gapBeforeMs: common.gapBeforeMs ?? null,
        location: common.location(),
      };
      const name = markerName(marker);
      common.store.writePending(sessionId, name, marker);

      view
        .recordAsync(common.maxDuration ? { maxDuration: common.maxDuration } : undefined)
        .then((result) => {
          if (!result?.uri) {
            common.store.deletePending(sessionId, name);
            resolveDone(null);
            return;
          }
          const endedAt = new Date();
          const reason = stopping ? endReason : endedBySystem(startedAt, endedAt, common.maxDuration);
          common.store.writePending(sessionId, name, {
            ...marker,
            file: result.uri,
            search: null,
            closedAt: endedAt.toISOString(),
            endReason: reason,
          });
          void common.session.add({
            uri: result.uri,
            kind: 'video',
            segment,
            startedAt,
            endedAt,
            location: common.location(),
            mode: common.mode,
            endReason: reason,
            gapBeforeMs: common.gapBeforeMs ?? null,
            pendingMarker: name,
          });
          resolveDone({ endReason: reason });
        })
        .catch(() => {
          // The marker stays: if a file was written, the next app start seals it as interrupted.
          resolveDone(null);
        });
    },
    async stop(reason = 'stopped') {
      endReason = reason;
      stopping = true;
      camera.current?.stopRecording();
      await done;
    },
  };
}

/**
 * Android: the app's own recorder (modules/saakshi-evidence, CameraRecorder.kt) writes MPEG-TS,
 * which plays up to the point a recording was cut off. It writes its own markers.
 */
export function androidVideoController(
  common: Common & { clip: number; quality: 720 | 1080; pieceSeconds?: number },
): VideoController & { dispose: () => void } {
  const native = SaakshiEvidence;
  if (!native) throw new Error('The SaakshiEvidence native module is not available in this build.');
  let stopReason: EndReason | null = null;
  let waiting: (() => void) | null = null;

  const subscription = native.addListener('onRecordingClosed', (event: RecordingClosedEvent) => {
    const segment = common.pieceSeconds ? { clip: event.clip, index: event.index } : null;
    const reason: EndReason = event.endReason === 'stopped' && stopReason ? stopReason : event.endReason;
    void common.session.add({
      uri: event.uri,
      kind: 'video',
      segment,
      startedAt: new Date(event.startedAt),
      endedAt: new Date(event.endedAt),
      location: common.location(),
      mode: common.mode,
      endReason: reason,
      gapBeforeMs: event.gapBeforeMs,
      rotationDegrees: event.rotationDegrees,
      pendingMarker: `${event.uri.split('/').pop()}.json`,
    });
    if (event.endReason !== 'piece-complete') {
      waiting?.();
      waiting = null;
    }
  });

  return {
    async start() {
      const dir = common.session.ensureSession().id;
      const base = common.store.sessionDirUri(dir).replace(/\/$/, '');
      stopReason = null;
      await native.recorderStart({
        outputDir: `${base}/incoming`,
        pendingDir: `${base}/pending`,
        quality: common.quality,
        clip: common.clip,
        mode: common.mode === 'bug' ? 'camera' : common.mode,
        ...(common.pieceSeconds ? { pieceSeconds: common.pieceSeconds } : {}),
      });
    },
    async stop(reason = 'stopped') {
      stopReason = reason;
      const closed = new Promise<void>((resolve) => {
        waiting = resolve;
        // If the recorder had nothing to close, don't wait forever.
        setTimeout(resolve, 5000);
      });
      await native.recorderStop();
      await closed;
    },
    dispose() {
      subscription.remove();
    },
  };
}
