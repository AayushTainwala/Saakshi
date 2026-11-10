import type { TFunction } from 'i18next';

import type { EndReason, EvidenceItem } from '../types';

/** Every way a file can end, in the plain words the record screen uses (fix round 1, group 5). */
export const END_REASON_KEYS = {
  stopped: 'ended.stopped',
  'piece-complete': 'ended.pieceComplete',
  'app-left': 'ended.appLeft',
  'camera-in-use': 'ended.cameraInUse',
  'system-pressure': 'ended.systemPressure',
  'camera-lost': 'ended.cameraLost',
  'low-battery': 'ended.lowBattery',
  'audio-interrupted': 'ended.audioInterrupted',
  'sound-resumed': 'ended.soundResumed',
  'video-resumed': 'ended.videoResumed',
  'storage-sound-only': 'ended.storageSoundOnly',
  'storage-full': 'ended.storageFull',
  interrupted: 'ended.interrupted',
  error: 'ended.error',
} as const satisfies Record<EndReason, string>;

/**
 * Why a file ended, in plain words. Files sealed before end reasons were kept have none; a file cut
 * off is said to be so whatever else is known.
 */
export function endReasonLabel(t: TFunction<'record'>, item: Pick<EvidenceItem, 'endReason' | 'interrupted'>): string | null {
  if (item.interrupted) return t(END_REASON_KEYS.interrupted);
  return item.endReason ? t(END_REASON_KEYS[item.endReason]) : null;
}
