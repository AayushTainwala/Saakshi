import type { AudioRecorder } from 'expo-audio';

import { AudioPieces } from '../bodycam/audioPieces';
import { fileLocker } from '../locker/store';
import type { CaptureMode, EndReason, LocationSnapshot } from '../types';
import { createEvidenceSession } from './deps';
import type { CaptureSession } from './pipeline';

export type AudioPiecesHandle = {
  session: CaptureSession;
  /** Stops the current piece, seals it, and waits for every piece to be sealed. */
  stop: (reason?: EndReason) => Promise<void>;
};

/**
 * Records sound in fixed pieces with expo-audio, each hashed, signed and chained as it is saved,
 * in a new evidence session (used by bug mode on iPhone, E8). Recording carries on with the screen
 * locked. The two recorders are used in turn so there is no silence between pieces.
 */
export async function startAudioPieces(options: {
  mode: CaptureMode;
  recorders: readonly [AudioRecorder, AudioRecorder];
  location: () => LocationSnapshot;
  pieceSeconds: number;
}): Promise<AudioPiecesHandle> {
  const session = createEvidenceSession();
  const pieces = new AudioPieces(
    options.recorders,
    session,
    fileLocker,
    options.location,
    options.pieceSeconds,
    options.mode,
  );
  await pieces.start();
  return {
    session,
    async stop(reason) {
      await pieces.stop(reason);
      await session.finish();
    },
  };
}

/**
 * Where a native recorder should write a session's pieces and their crash-recovery markers
 * (locker/pending.ts), as file:// URIs. Used by bug mode's Android recorder.
 */
export function piecePaths(session: CaptureSession): { incomingDir: string; pendingDir: string } {
  const base = fileLocker.sessionDirUri(session.ensureSession().id).replace(/\/$/, '');
  return { incomingDir: `${base}/incoming`, pendingDir: `${base}/pending` };
}
