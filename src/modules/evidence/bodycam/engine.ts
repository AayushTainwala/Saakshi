import SaakshiEvidence, { type RecordingClosedEvent } from '@native/saakshi-evidence';

import type { CaptureSession } from '../capture/pipeline';
import type { LockerStore } from '../locker/store';
import type { ClosedFile, EndReason, LocationSnapshot } from '../types';
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

type NativeBodyCam = Pick<NonNullable<typeof SaakshiEvidence>, 'addListener' | 'bodyCamStart' | 'bodyCamStop'>;

function requireNative(native: NativeBodyCam | null | undefined): NativeBodyCam {
  if (!native) throw new Error('The SaakshiEvidence native module is not available in this build.');
  return native;
}

/**
 * The file a body-cam `onRecordingClosed` event describes, ready to be sealed. A file the recorder
 * closed because the user (or the app) stopped takes the stop's reason, such as `low-battery`.
 */
export function closedFileFromEvent(
  event: RecordingClosedEvent,
  location: LocationSnapshot,
  stopReason: EndReason | null,
): ClosedFile {
  return {
    uri: event.uri,
    kind: event.kind ?? 'video',
    segment: { clip: event.clip, index: event.index },
    startedAt: new Date(event.startedAt),
    endedAt: new Date(event.endedAt),
    location,
    mode: 'body-cam',
    endReason: event.endReason === 'stopped' && stopReason ? stopReason : event.endReason,
    gapBeforeMs: event.gapBeforeMs,
    rotationDegrees: event.rotationDegrees,
    pendingMarker: `${event.uri.split('/').pop()}.json`,
  };
}

function folders(common: Common): { outputDir: string; pendingDir: string } {
  const id = common.session.ensureSession().id;
  const base = common.store.sessionDirUri(id).replace(/\/$/, '');
  return { outputDir: `${base}/incoming`, pendingDir: `${base}/pending` };
}

/**
 * Android: the app's recorder runs in a foreground service (camera and microphone types), so
 * video and sound carry on with the screen off, during calls and in other apps. Pieces arrive as
 * events and are sealed here. If the JavaScript side is not running when a piece closes, its
 * marker stays and the piece is sealed when the app next opens.
 */
export function androidBodyCam(
  common: Common & { notificationTitle: string; notificationText: string; notificationStop: string },
  nativeModule: NativeBodyCam | null = SaakshiEvidence,
): BodyCamEngine {
  const native = requireNative(nativeModule);
  let stopReason: EndReason | null = null;
  let onFinal: (() => void) | null = null;
  let finished = false;
  const subscription = native.addListener('onRecordingClosed', (event: RecordingClosedEvent) => {
    void common.session.add(closedFileFromEvent(event, common.location(), stopReason));
    if (event.endReason !== 'piece-complete') {
      finished = true;
      onFinal?.();
    }
  });

  return {
    async start() {
      await native.bodyCamStart({
        ...folders(common),
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
      let timer: ReturnType<typeof setTimeout> | undefined;
      const closed = new Promise<void>((resolve) => {
        onFinal = resolve;
        // If the recorder had nothing to close, don't wait forever.
        timer = setTimeout(resolve, 5000);
      });
      await native.bodyCamStop();
      await closed;
      clearTimeout(timer);
      subscription.remove();
    },
  };
}

/**
 * iPhone: the app's own recorder (modules/saakshi-evidence/ios/BodyCamRecorder.swift). While
 * Saakshi is on screen, each video piece has its sound in the same file. iOS stops the camera
 * when the app leaves the screen or the phone locks; sound then carries on in sound-only pieces,
 * which overlap the video on both sides so the sound has no gap, and video with sound starts again
 * when the user comes back. Files arrive as events, the same as on Android; `bodyCamStop` also
 * returns the files it closed, so none is missed if its event comes late.
 */
export function iosBodyCam(
  common: Common & { onProblem?: (message: string) => void },
  nativeModule: NativeBodyCam | null = SaakshiEvidence,
): BodyCamEngine {
  const native = requireNative(nativeModule);
  let stopReason: EndReason | null = null;
  const added = new Set<string>();
  const add = (event: RecordingClosedEvent) => {
    if (added.has(event.uri)) return;
    added.add(event.uri);
    void common.session.add(closedFileFromEvent(event, common.location(), stopReason));
  };
  const closedSubscription = native.addListener('onRecordingClosed', add);
  const errorSubscription = native.addListener('onRecorderError', (event: { message: string }) =>
    common.onProblem?.(event.message),
  );
  const unsubscribe = () => {
    closedSubscription.remove();
    errorSubscription.remove();
  };

  return {
    async start() {
      try {
        await native.bodyCamStart({
          ...folders(common),
          pieceSeconds: BODYCAM_PIECE_SECONDS,
          quality: common.quality,
          clip: common.session.nextClip(),
          mode: 'body-cam',
          notificationTitle: '',
          notificationText: '',
          notificationStop: '',
        });
      } catch (error) {
        unsubscribe();
        throw error;
      }
    },
    async stop(reason = 'stopped') {
      stopReason = reason;
      try {
        const closed = await native.bodyCamStop();
        for (const event of closed ?? []) add(event);
      } finally {
        unsubscribe();
      }
    },
  };
}
