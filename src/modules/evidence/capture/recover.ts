import type { PendingMarker } from '../locker/pending';
import { isActive } from '../locker/active';
import type { EvidenceItem } from '../types';
import { CaptureSession, type PipelineDeps } from './pipeline';

/** What recovery needs to know about files on disk. */
export type RecoveryFiles = {
  /** Size in bytes and last-write time (ms since epoch), or null if there is no such file. */
  stat: (uri: string) => { size: number; modifiedAt: number } | null;
  /**
   * iPhone: files in expo-camera's cache folder, with their creation times (ms), for markers
   * written before the camera reported its file's path.
   */
  iosCameraFiles: () => { uri: string; createdAt: number }[];
};

/** A file created more than this long before its marker's start is not the marker's file. */
const SEARCH_SLACK_MS = 5_000;

function findIosFile(marker: PendingMarker, files: RecoveryFiles, claimed: Set<string>): string | null {
  const startedAt = Date.parse(marker.startedAt);
  const candidates = files
    .iosCameraFiles()
    .filter((f) => !claimed.has(f.uri) && f.createdAt >= startedAt - SEARCH_SLACK_MS)
    .sort((a, b) => a.createdAt - b.createdAt);
  return candidates[0]?.uri ?? null;
}

/**
 * Seals files left behind by a recording that was cut off (crash, forced power-off) or closed but
 * not yet sealed. Runs when the app opens. A file whose recorder never closed it is sealed with
 * `interrupted: true`, its end time taken from its last write. Returns the items it added.
 */
export async function recoverPending(deps: PipelineDeps, files: RecoveryFiles): Promise<EvidenceItem[]> {
  const recovered: EvidenceItem[] = [];
  for (const state of deps.store.listSessions()) {
    if (isActive(state.id)) continue;
    const markers = deps.store
      .listPending(state.id)
      .sort((a, b) => Date.parse(a.marker.startedAt) - Date.parse(b.marker.startedAt));
    if (!markers.length) continue;

    const session = CaptureSession.resume(deps, state.id);
    const claimed = new Set<string>();
    try {
      for (const { name, marker } of markers) {
        const uri = marker.file ?? (marker.search === 'ios-camera-cache' ? findIosFile(marker, files, claimed) : null);
        const stat = uri ? files.stat(uri) : null;
        if (!uri || !stat || stat.size === 0) {
          // Nothing was written before the cut-off (or the file is gone). Nothing to seal.
          deps.store.deletePending(state.id, name);
          continue;
        }
        claimed.add(uri);
        const closed = !!marker.closedAt;
        recovered.push(
          await session.add({
            uri,
            kind: marker.kind,
            segment: marker.segment,
            startedAt: new Date(marker.startedAt),
            endedAt: closed ? new Date(marker.closedAt!) : new Date(stat.modifiedAt),
            location: marker.location ?? { status: 'unavailable', fix: null },
            mode: marker.mode,
            endReason: closed ? (marker.endReason ?? 'stopped') : 'interrupted',
            interrupted: !closed,
            gapBeforeMs: marker.gapBeforeMs ?? null,
            rotationDegrees: marker.rotationDegrees ?? null,
            pendingMarker: name,
          }),
        );
      }
    } finally {
      await session.finish();
    }
  }
  return recovered;
}
