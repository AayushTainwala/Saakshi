import SaakshiEvidence, { type CheckpointEvent, type RecordingClosedEvent } from '@native/saakshi-evidence';

import type { CaptureSession } from '../capture/pipeline';
import { extensionOf, mediaTypeFor } from '../locker/media';
import type { LockerStore } from '../locker/store';
import type { CheckpointInput, ClosedFile, EndReason, EvidenceItem, LocationSnapshot } from '../types';
import { BODYCAM_CHECKPOINT_SECONDS, DEFAULT_UPLOAD_PART_SECONDS } from './constants';
import { PartPlanner } from './parts';

export type BodyCamEngine = {
  start: () => Promise<void>;
  stop: (reason?: EndReason) => Promise<void>;
};

type Common = {
  session: CaptureSession;
  store: LockerStore;
  location: () => LocationSnapshot;
  quality: 720 | 1080;
  /** About how long an upload part is (BodyCamSettings.uploadPartSeconds). */
  partSeconds?: number;
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
    recording: event.recording ?? null,
    written:
      event.finalSha256 && typeof event.finalSize === 'number' ? { size: event.finalSize, sha256: event.finalSha256 } : null,
  };
}

/** A checkpoint event from the recorder, ready to be sealed into the session's chain. */
export function checkpointFromEvent(event: CheckpointEvent, location: LocationSnapshot): CheckpointInput {
  return {
    recording: event.recording,
    index: event.checkpoint,
    kind: event.kind,
    segment: { clip: event.clip, index: event.index },
    mediaType: mediaTypeFor(extensionOf(event.uri), event.kind),
    bytes: event.bytes,
    sha256: event.sha256,
    at: new Date(event.at),
    startedAt: new Date(event.startedAt),
    location,
    mode: 'body-cam',
  };
}

/**
 * Both platforms: each checkpoint is sealed into the session's chain as it arrives and handed to
 * the upload planner; each closed file ends its parts.
 */
function checkpoints(native: NativeBodyCam, common: Common) {
  const parts = new PartPlanner(() => common.partSeconds ?? DEFAULT_UPLOAD_PART_SECONDS);
  const subscription = native.addListener('onCheckpoint', (event: CheckpointEvent) => {
    void common.session.addCheckpoint(checkpointFromEvent(event, common.location())).then((item) => {
      // Parts end only on checkpoints that were signed.
      if (item.status === 'sealed') parts.checkpoint({ ...event, at: new Date(event.at), startedAt: new Date(event.startedAt) });
    });
  });
  return {
    /** After the file's own record: the last part ends at the file's end, as sealed. */
    closed(event: RecordingClosedEvent, sealed: Promise<EvidenceItem>) {
      void sealed.then((item) => {
        const size = item.digests?.size ?? event.finalSize;
        const sha256 = item.digests?.sha256 ?? event.finalSha256;
        const uri = item.status === 'sealed' || item.status === 'hashed' ? common.store.mediaUri(common.session.id!, item.media) : event.uri;
        if (event.recording && sha256 && typeof size === 'number') parts.closed({ recording: event.recording, uri, size, sha256 });
      });
    },
    remove: () => subscription.remove(),
  };
}

function folders(common: Common): { outputDir: string; pendingDir: string } {
  const id = common.session.ensureSession().id;
  const base = common.store.sessionDirUri(id).replace(/\/$/, '');
  return { outputDir: `${base}/incoming`, pendingDir: `${base}/pending` };
}

/**
 * Android: the app's recorder runs in a foreground service (camera and microphone types), so
 * video and sound carry on with the screen off, during calls and in other apps. It records one
 * continuous MPEG-TS file from Start to Stop and sends a checkpoint about every 10 seconds; the file
 * arrives as an event when it closes and is sealed here. If the JavaScript side is not running when
 * it closes, its marker stays and it is sealed when the app next opens.
 */
export function androidBodyCam(
  common: Common & { notificationTitle: string; notificationText: string; notificationStop: string },
  nativeModule: NativeBodyCam | null = SaakshiEvidence,
): BodyCamEngine {
  const native = requireNative(nativeModule);
  let stopReason: EndReason | null = null;
  let onFinal: (() => void) | null = null;
  let finished = false;
  const marks = checkpoints(native, common);
  const subscription = native.addListener('onRecordingClosed', (event: RecordingClosedEvent) => {
    marks.closed(event, common.session.add(closedFileFromEvent(event, common.location(), stopReason)));
    if (event.endReason !== 'piece-complete') {
      finished = true;
      onFinal?.();
    }
  });

  return {
    async start() {
      await native.bodyCamStart({
        ...folders(common),
        pieceSeconds: 0,
        checkpointSeconds: BODYCAM_CHECKPOINT_SECONDS,
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
        marks.remove();
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
      marks.remove();
    },
  };
}

/**
 * iPhone: the app's own recorder (modules/saakshi-evidence/ios/BodyCamRecorder.swift). While
 * Saakshi is on screen, video and its sound go into one file (fragmented MP4), with a checkpoint at
 * every 10-second segment. iOS stops the camera when the app leaves the screen or the phone locks;
 * sound then carries on in a sound-only file (ADTS AAC), also checkpointed,
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
  const marks = checkpoints(native, common);
  const add = (event: RecordingClosedEvent) => {
    if (added.has(event.uri)) return;
    added.add(event.uri);
    marks.closed(event, common.session.add(closedFileFromEvent(event, common.location(), stopReason)));
  };
  const closedSubscription = native.addListener('onRecordingClosed', add);
  const errorSubscription = native.addListener('onRecorderError', (event: { message: string }) =>
    common.onProblem?.(event.message),
  );
  const unsubscribe = () => {
    closedSubscription.remove();
    errorSubscription.remove();
    marks.remove();
  };

  return {
    async start() {
      try {
        await native.bodyCamStart({
          ...folders(common),
          pieceSeconds: 0,
          checkpointSeconds: BODYCAM_CHECKPOINT_SECONDS,
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
