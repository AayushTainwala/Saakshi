import type { CaptureMode, EndReason, LocationSnapshot, MediaKind, SegmentRef } from '../types';

/**
 * A crash-recovery marker, one per file being recorded, kept in the session's `pending/` folder
 * from the moment recording starts until the file is safely in the locker. If the app is killed
 * or the phone switched off mid-recording, the marker is still there when the app next opens, and
 * the file it points to is sealed with its record marked interrupted.
 *
 * The Android recorder (CameraRecorder.kt) writes the same format natively.
 */
export type PendingMarker = {
  /** The file being written (file:// URI), or null while the camera hasn't told us its path. */
  file: string | null;
  /** iPhone: expo-camera writes to Caches/Camera/<random>.mov, which is only known when it stops. */
  search?: 'ios-camera-cache' | null;
  kind: MediaKind;
  segment: SegmentRef | null;
  startedAt: string;
  /** Set when the recorder closed the file normally. */
  closedAt?: string | null;
  endReason?: EndReason | null;
  mode: CaptureMode;
  gapBeforeMs?: number | null;
  rotationDegrees?: number | null;
  location?: LocationSnapshot;
};

export function markerName(marker: Pick<PendingMarker, 'file' | 'startedAt'>): string {
  if (marker.file) return `${marker.file.split('/').pop()}.json`;
  return `pending-${Date.parse(marker.startedAt)}.json`;
}
