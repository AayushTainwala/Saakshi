import { CHECKPOINT_TYPE, FORMAT_VERSION, RECORD_TYPE } from '../constants';
import type { CaptureMode, EndReason, FileDigests, LocationSnapshot, SegmentRef, StartedFrom } from '../types';

/** The record before this one in the session's chain (a file's record or a checkpoint's). */
export type ChainLink = { id: string; recordSha256: string; fileSha256: string };

export type DeviceInfo = {
  manufacturer: string | null;
  brand: string | null;
  model: string | null;
  modelName: string | null;
  os: string | null;
  osVersion: string | null;
};

export type AppInfo = { id: string | null; version: string | null; build: string | null };

/** A record as defined in docs/spec/evidence-bundle.md, section 4. */
export type EvidenceRecord = {
  type: typeof RECORD_TYPE;
  version: typeof FORMAT_VERSION;
  id: string;
  session: string;
  sequence: number;
  segment: SegmentRef | null;
  /** From 0.5: the recorder's id for the file, which its checkpoints carry; null if it had none. */
  recording: string | null;
  previous: ChainLink | null;
  /** True when the recording was cut off and this record was made when the app next opened. */
  interrupted: boolean;
  file: {
    name: string;
    mediaType: string;
    size: number;
    sha256: string;
    sha1: string;
    md5: string;
  };
  capture: {
    mode: CaptureMode;
    startedAt: string;
    endedAt: string;
    /** `recorder`: the camera reported the end. `file-modified`: the file's last write (interrupted). */
    endedAtSource: 'recorder' | 'file-modified';
    endReason: EndReason;
    gapBeforeMs: number | null;
    /** Degrees to turn the picture upright, for MPEG-TS, which has no field for it. Otherwise null. */
    rotationDegrees: number | null;
    hashedAt: string;
    timeZone: string | null;
    utcOffsetMinutes: number;
    /** From 0.9, optional: the battery level, 0-100, when the file closed. Absent when not known. */
    batteryPercent?: number;
    /** From 0.9, optional, Pocket recording only: how it was started. */
    startedFrom?: StartedFrom;
  };
  location: {
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
    altitudeMeters: number | null;
    fixedAt: string;
  } | null;
  locationStatus: LocationSnapshot['status'];
  device: DeviceInfo;
  app: AppInfo;
  key: { id: string; algorithm: 'ES256' };
};

export type RecordInput = {
  id: string;
  session: string;
  sequence: number;
  segment: SegmentRef | null;
  recording?: string | null;
  previous: EvidenceRecord['previous'];
  fileName: string;
  mediaType: string;
  digests: FileDigests;
  startedAt: Date;
  endedAt: Date;
  hashedAt: Date;
  mode?: CaptureMode;
  endReason?: EndReason;
  interrupted?: boolean;
  gapBeforeMs?: number | null;
  rotationDegrees?: number | null;
  batteryPercent?: number | null;
  startedFrom?: StartedFrom;
  timeZone: string | null;
  location: LocationSnapshot;
  device: DeviceInfo;
  app: AppInfo;
  keyId: string;
};

/** The 0.9 members, present only when known (bundle spec section 4). */
function newCaptureMembers(mode: CaptureMode, batteryPercent?: number | null, startedFrom?: StartedFrom) {
  return {
    ...(typeof batteryPercent === 'number' && Number.isInteger(batteryPercent) && batteryPercent >= 0 && batteryPercent <= 100
      ? { batteryPercent }
      : {}),
    ...(mode === 'bug' && startedFrom ? { startedFrom } : {}),
  };
}

function locationOf(location: LocationSnapshot): Pick<EvidenceRecord, 'location' | 'locationStatus'> {
  const { fix } = location;
  return {
    location:
      location.status === 'fixed' && fix
        ? {
            latitude: fix.latitude,
            longitude: fix.longitude,
            accuracyMeters: fix.accuracyMeters,
            altitudeMeters: fix.altitudeMeters,
            fixedAt: fix.fixedAt,
          }
        : null,
    locationStatus: location.status === 'fixed' && !fix ? 'unavailable' : location.status,
  };
}

export function buildRecord(input: RecordInput): EvidenceRecord {
  return {
    type: RECORD_TYPE,
    version: FORMAT_VERSION,
    id: input.id,
    session: input.session,
    sequence: input.sequence,
    segment: input.segment,
    recording: input.recording ?? null,
    previous: input.previous,
    interrupted: !!input.interrupted,
    file: {
      name: input.fileName,
      mediaType: input.mediaType,
      size: input.digests.size,
      sha256: input.digests.sha256,
      sha1: input.digests.sha1,
      md5: input.digests.md5,
    },
    capture: {
      mode: input.mode ?? 'camera',
      startedAt: input.startedAt.toISOString(),
      endedAt: input.endedAt.toISOString(),
      endedAtSource: input.interrupted ? 'file-modified' : 'recorder',
      endReason: input.endReason ?? (input.interrupted ? 'interrupted' : 'stopped'),
      gapBeforeMs: input.gapBeforeMs ?? null,
      rotationDegrees: input.rotationDegrees ?? null,
      hashedAt: input.hashedAt.toISOString(),
      timeZone: input.timeZone,
      utcOffsetMinutes: -input.startedAt.getTimezoneOffset(),
      ...newCaptureMembers(input.mode ?? 'camera', input.batteryPercent, input.startedFrom),
    },
    ...locationOf(input.location),
    device: input.device,
    app: input.app,
    key: { id: input.keyId, algorithm: 'ES256' },
  };
}

/**
 * A checkpoint record (format 0.5, docs/spec/evidence-bundle.md, section 4a): proof, signed while
 * a file was still being written, that its first `file.size` bytes had the SHA-256 `file.sha256`.
 * It sits in the session's chain like a file's record; the file's own record, when the file closes,
 * carries the same `recording`.
 */
export type CheckpointRecord = {
  type: typeof CHECKPOINT_TYPE;
  version: typeof FORMAT_VERSION;
  id: string;
  session: string;
  sequence: number;
  recording: string;
  /** The checkpoint's number in its file, from 0. */
  checkpoint: number;
  segment: SegmentRef | null;
  previous: ChainLink | null;
  file: { mediaType: string; size: number; sha256: string };
  capture: {
    mode: CaptureMode;
    startedAt: string;
    checkpointAt: string;
    timeZone: string | null;
    utcOffsetMinutes: number;
    /** From 0.9, optional: the battery level, 0-100, when the checkpoint was made. */
    batteryPercent?: number;
    /** From 0.9, optional, Pocket recording only. */
    startedFrom?: StartedFrom;
  };
  location: EvidenceRecord['location'];
  locationStatus: EvidenceRecord['locationStatus'];
  device: DeviceInfo;
  app: AppInfo;
  key: { id: string; algorithm: 'ES256' };
};

export type CheckpointRecordInput = {
  id: string;
  session: string;
  sequence: number;
  recording: string;
  checkpoint: number;
  segment: SegmentRef | null;
  previous: ChainLink | null;
  mediaType: string;
  size: number;
  sha256: string;
  mode?: CaptureMode;
  startedAt: Date;
  checkpointAt: Date;
  batteryPercent?: number | null;
  startedFrom?: StartedFrom;
  timeZone: string | null;
  location: LocationSnapshot;
  device: DeviceInfo;
  app: AppInfo;
  keyId: string;
};

export function buildCheckpointRecord(input: CheckpointRecordInput): CheckpointRecord {
  return {
    type: CHECKPOINT_TYPE,
    version: FORMAT_VERSION,
    id: input.id,
    session: input.session,
    sequence: input.sequence,
    recording: input.recording,
    checkpoint: input.checkpoint,
    segment: input.segment,
    previous: input.previous,
    file: { mediaType: input.mediaType, size: input.size, sha256: input.sha256 },
    capture: {
      mode: input.mode ?? 'body-cam',
      startedAt: input.startedAt.toISOString(),
      checkpointAt: input.checkpointAt.toISOString(),
      timeZone: input.timeZone,
      utcOffsetMinutes: -input.startedAt.getTimezoneOffset(),
      ...newCaptureMembers(input.mode ?? 'body-cam', input.batteryPercent, input.startedFrom),
    },
    ...locationOf(input.location),
    device: input.device,
    app: input.app,
    key: { id: input.keyId, algorithm: 'ES256' },
  };
}
