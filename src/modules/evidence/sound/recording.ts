import SaakshiEvidence, { type SoundClosedEvent } from '@native/saakshi-evidence';
import { Platform } from 'react-native';

import { loadBodyCamSettings } from '../bodycam/settings';
import { PartPlanner, type UploadPart } from '../bodycam/parts';
import { createEvidenceSession } from '../capture/deps';
import type { CaptureSession } from '../capture/pipeline';
import { extensionOf, mediaTypeFor } from '../locker/media';
import { fileLocker, type LockerStore } from '../locker/store';
import type { CaptureMode, CheckpointInput, ClosedFile, EndReason, LocationSnapshot, StartedFrom } from '../types';

/**
 * A sound recording's file is checkpointed about this often (seconds of sound): the same pace as
 * body-cam (fix round 1: bug mode as one continuous file, like body-cam).
 */
export const SOUND_CHECKPOINT_SECONDS = 10;

/** A checkpoint of a sound file still being written: its first `bytes` bytes have SHA-256 `sha256`. */
export type SoundCheckpoint = {
  recording: string;
  uri: string;
  clip: number;
  index: number;
  /** The checkpoint's number in its file, from 0. */
  checkpoint: number;
  bytes: number;
  sha256: string;
  at: string;
  startedAt: string;
};

/** A sound file the recorder has closed. */
export type SoundClosed = {
  uri: string;
  clip: number;
  index: number;
  startedAt: string;
  endedAt: string;
  endReason: EndReason;
  gapBeforeMs: number | null;
  recording: string | null;
  /** The length and SHA-256 of every byte the recorder wrote, from its running hash. */
  finalSize: number | null;
  finalSha256: string | null;
};

export type SoundHandlers = {
  checkpoint: (event: SoundCheckpoint) => void;
  closed: (event: SoundClosed) => void;
  error: (message: string) => void;
};

/**
 * A native recorder of one continuous, cut-off-safe sound file with checkpoints: on iPhone this
 * module's own (`soundRecorder()`), on Android bug mode's recorder in the SaakshiSos module.
 * A file's checkpoints must come before its `closed`.
 */
export type SoundRecorderNative = {
  listen: (handlers: SoundHandlers) => { remove: () => void };
  start: (options: { outputDir: string; pendingDir: string; clip: number; checkpointSeconds: number }) => Promise<void>;
  /** Resolves once every file is closed, with the files the stop closed (if they also came as events, they are added once). */
  stop: () => Promise<SoundClosed[]>;
  /** The low-battery handover (round 2, group 1.5): the file closes with `reason`, the next continues. */
  handOver?: (reason: 'low-battery') => Promise<void>;
};

export type SoundRecordingHandle = {
  session: CaptureSession;
  /** Stops recording, and waits until every file and checkpoint is sealed. */
  stop: (reason?: EndReason) => Promise<void>;
  /**
   * The low-battery handover at 5% (round 2, group 1.5; bundle format 0.9): the file being
   * written closes cleanly as "low-battery" and a new file of the same clip continues.
   */
  handOver: () => Promise<void>;
};

export type SoundRecordingOptions = {
  mode: CaptureMode;
  /** Pocket recording (format 0.9, `capture.startedFrom`): on its own, or by "My phone is being taken". */
  startedFrom?: StartedFrom;
  native: SoundRecorderNative;
  /** The place each record carries: the latest fix, never waited for. */
  location: () => LocationSnapshot;
  /** For E7: each upload part as soon as it can be uploaded (a byte range ending on a checkpoint). */
  onPart?: (part: UploadPart) => void;
  onProblem?: (message: string) => void;
  /** About how long an upload part is. Default: the stored setting, as for body-cam. */
  partSeconds?: () => number;
  /** For tests. */
  session?: CaptureSession;
  store?: LockerStore;
};

/** A closed sound file, ready to be sealed. A file closed by Stop takes the stop's reason. */
export function closedSoundFile(
  event: SoundClosed,
  mode: CaptureMode,
  location: LocationSnapshot,
  stopReason: EndReason | null,
  startedFrom?: StartedFrom,
): ClosedFile {
  return {
    ...(mode === 'bug' && startedFrom ? { startedFrom } : {}),
    uri: event.uri,
    kind: 'audio',
    segment: { clip: event.clip, index: event.index },
    startedAt: new Date(event.startedAt),
    endedAt: new Date(event.endedAt),
    location,
    mode,
    endReason: event.endReason === 'stopped' && stopReason ? stopReason : event.endReason,
    gapBeforeMs: event.gapBeforeMs,
    pendingMarker: `${event.uri.split('/').pop()}.json`,
    recording: event.recording,
    written:
      event.finalSha256 && typeof event.finalSize === 'number' ? { size: event.finalSize, sha256: event.finalSha256 } : null,
  };
}

/** A checkpoint of a sound file, ready to be sealed into the session's chain. */
export function soundCheckpoint(
  event: SoundCheckpoint,
  mode: CaptureMode,
  location: LocationSnapshot,
  startedFrom?: StartedFrom,
): CheckpointInput {
  return {
    ...(mode === 'bug' && startedFrom ? { startedFrom } : {}),
    recording: event.recording,
    index: event.checkpoint,
    kind: 'audio',
    segment: { clip: event.clip, index: event.index },
    mediaType: mediaTypeFor(extensionOf(event.uri), 'audio'),
    bytes: event.bytes,
    sha256: event.sha256,
    at: new Date(event.at),
    startedAt: new Date(event.startedAt),
    location,
    mode,
  };
}

/**
 * Records sound as one continuous file from start to stop, in a new evidence session (bug mode,
 * E8; fix round 1, as for body-cam). Each checkpoint is signed into the session's chain as it
 * comes and cut into upload parts for E7; each file is hashed, moved into the locker and sealed as
 * it closes. A new file starts only as a fail-safe (the microphone stopped and came back, or a file
 * couldn't be written). A file that closes while the app's JavaScript isn't running keeps its
 * crash-recovery marker and is sealed when the app next opens.
 */
export async function startSoundRecording(options: SoundRecordingOptions): Promise<SoundRecordingHandle> {
  const { mode, native, location, startedFrom } = options;
  const session = options.session ?? createEvidenceSession();
  const store = options.store ?? fileLocker;
  const parts = new PartPlanner(
    options.partSeconds ?? (() => loadBodyCamSettings().uploadPartSeconds),
    (part) => options.onPart?.(part),
  );
  let stopReason: EndReason | null = null;
  const added = new Set<string>();
  const base = store.sessionDirUri(session.ensureSession().id).replace(/\/$/, '');
  const outputDir = `${base}/incoming`;
  // Only this recording's files: a late event from an earlier recording still stopping is not ours.
  const ours = (uri: string) => uri.startsWith(`${outputDir}/`);
  const close = (event: SoundClosed) => {
    if (added.has(event.uri) || !ours(event.uri)) return;
    added.add(event.uri);
    void session.add(closedSoundFile(event, mode, location(), stopReason, startedFrom)).then((item) => {
      // The last part ends at the file's end, as sealed (the recorder's own fingerprint if sealing failed).
      const size = item.digests?.size ?? event.finalSize;
      const sha256 = item.digests?.sha256 ?? event.finalSha256;
      const uri = item.status === 'sealed' || item.status === 'hashed' ? store.mediaUri(session.id!, item.media) : event.uri;
      if (event.recording && sha256 && typeof size === 'number') parts.closed({ recording: event.recording, uri, size, sha256 });
    });
  };
  const subscription = native.listen({
    checkpoint: (event) => {
      if (!ours(event.uri)) return;
      void session.addCheckpoint(soundCheckpoint(event, mode, location(), startedFrom)).then((item) => {
        // Parts end only on checkpoints that were signed.
        if (item.status === 'sealed') parts.checkpoint({ ...event, at: new Date(event.at), startedAt: new Date(event.startedAt) });
      });
    },
    closed: close,
    error: (message) => options.onProblem?.(message),
  });

  try {
    await native.start({
      outputDir,
      pendingDir: `${base}/pending`,
      clip: session.nextClip(),
      checkpointSeconds: SOUND_CHECKPOINT_SECONDS,
    });
  } catch (error) {
    subscription.remove();
    await session.finish();
    // Nothing was recorded: don't leave an empty session in the Record tab.
    const id = session.id!;
    if (!session.items.length && !session.checkpoints.length && !store.listPending(id).length) store.deleteSession(id);
    throw error;
  }

  return {
    session,
    handOver: async () => {
      await native.handOver?.('low-battery');
    },
    async stop(reason = 'stopped') {
      stopReason = reason;
      try {
        for (const event of await native.stop()) close(event);
      } finally {
        subscription.remove();
        await session.finish();
      }
    },
  };
}

type NativeSound = Pick<NonNullable<typeof SaakshiEvidence>, 'addListener' | 'soundStart' | 'soundStop' | 'soundHandOver'>;

function fromNative(event: SoundClosedEvent): SoundClosed {
  return { ...event, recording: event.recording ?? null };
}

/** iPhone: this module's own sound recorder (SoundRecorder.swift). Null on Android and in tests. */
export function soundRecorder(nativeModule: NativeSound | null | undefined = SaakshiEvidence): SoundRecorderNative | null {
  if (!nativeModule || Platform.OS !== 'ios') return null;
  const native = nativeModule;
  return {
    listen(handlers) {
      const subscriptions = [
        native.addListener('onSoundCheckpoint', (event) => handlers.checkpoint(event)),
        native.addListener('onSoundClosed', (event) => handlers.closed(fromNative(event))),
        native.addListener('onSoundError', (event) => handlers.error(event.message)),
      ];
      return { remove: () => subscriptions.forEach((s) => s.remove()) };
    },
    start: (options) => native.soundStart({ ...options, mode: 'bug' }),
    handOver: (reason) => native.soundHandOver(reason),
    async stop() {
      return ((await native.soundStop()) ?? []).map(fromNative);
    },
  };
}
