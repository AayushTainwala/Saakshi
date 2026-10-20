import { type AudioRecorder, setAudioModeAsync } from 'expo-audio';

import type { CaptureSession } from '../capture/pipeline';
import { markerName, type PendingMarker } from '../locker/pending';
import type { LockerStore } from '../locker/store';
import type { EndReason, LocationSnapshot } from '../types';

type Piece = { recorder: AudioRecorder; uri: string; startedAt: Date; index: number; marker: string; gapBeforeMs: number | null };

/**
 * iPhone body-cam sound: expo-audio records fixed pieces with background recording on, so sound
 * carries on when the user leaves the app or locks the phone (video can't). Each next piece starts
 * before the previous one stops, so there is no silence between them; the overlap shows as a
 * negative `gapBeforeMs`. That takes two recorders, used in turn. If a new piece can't start (iOS may refuse while a call holds the
 * microphone), the current one keeps running and the next attempt comes a piece later.
 */
export class AudioPieces {
  private current: Piece | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private index = 0;
  private lastEnded: number | null = null;
  private readonly clip: number;
  private turn = 0;

  constructor(
    private readonly recorders: readonly [AudioRecorder, AudioRecorder],
    private readonly session: CaptureSession,
    private readonly store: LockerStore,
    private readonly location: () => LocationSnapshot,
    private readonly pieceSeconds: number,
  ) {
    this.clip = session.nextClip();
  }

  async start(): Promise<void> {
    await setAudioModeAsync({
      allowsRecording: true,
      allowsBackgroundRecording: true,
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    });
    this.current = await this.begin();
    this.timer = setInterval(() => void this.rotate(), this.pieceSeconds * 1000);
  }

  async stop(reason: EndReason = 'stopped'): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const piece = this.current;
    this.current = null;
    if (piece) await this.finish(piece, reason);
  }

  private async begin(): Promise<Piece> {
    const recorder = this.recorders[this.turn % 2];
    await recorder.prepareToRecordAsync();
    recorder.record();
    const uri = recorder.uri;
    if (!uri) throw new Error('The audio recorder has no file');
    const startedAt = new Date();
    const sessionId = this.session.ensureSession().id;
    const marker: PendingMarker = {
      file: uri,
      kind: 'audio',
      segment: { clip: this.clip, index: this.index },
      startedAt: startedAt.toISOString(),
      mode: 'body-cam',
      gapBeforeMs: this.lastEnded === null ? null : startedAt.getTime() - this.lastEnded,
      location: this.location(),
    };
    const name = markerName(marker);
    this.store.writePending(sessionId, name, marker);
    this.turn++;
    return { recorder, uri, startedAt, index: this.index++, marker: name, gapBeforeMs: marker.gapBeforeMs ?? null };
  }

  private async rotate(): Promise<void> {
    const old = this.current;
    if (!old) return;
    let next: Piece;
    try {
      next = await this.begin();
    } catch {
      return;
    }
    this.current = next;
    await this.finish(old, old.recorder.isRecording ? 'piece-complete' : 'audio-interrupted');
  }

  private async finish(piece: Piece, reason: EndReason): Promise<void> {
    try {
      await piece.recorder.stop();
    } catch {
      // Already stopped by the system; the file holds what was recorded.
    }
    const endedAt = new Date();
    this.lastEnded = endedAt.getTime();
    const sessionId = this.session.ensureSession().id;
    const segment = { clip: this.clip, index: piece.index };
    this.store.writePending(sessionId, piece.marker, {
      file: piece.uri,
      kind: 'audio',
      segment,
      startedAt: piece.startedAt.toISOString(),
      closedAt: endedAt.toISOString(),
      endReason: reason,
      mode: 'body-cam',
      gapBeforeMs: piece.gapBeforeMs,
    });
    void this.session.add({
      uri: piece.uri,
      kind: 'audio',
      segment,
      startedAt: piece.startedAt,
      endedAt,
      location: this.location(),
      mode: 'body-cam',
      endReason: reason,
      gapBeforeMs: piece.gapBeforeMs,
      pendingMarker: piece.marker,
    });
  }
}
