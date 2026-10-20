import { FORMAT_VERSION, RECORD_TYPE } from '../constants';
import type { CaptureMode, EndReason, FileDigests, LocationSnapshot, SegmentRef } from '../types';

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
  previous: { id: string; recordSha256: string; fileSha256: string } | null;
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
    hashedAt: string;
    timeZone: string | null;
    utcOffsetMinutes: number;
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
  timeZone: string | null;
  location: LocationSnapshot;
  device: DeviceInfo;
  app: AppInfo;
  keyId: string;
};

export function buildRecord(input: RecordInput): EvidenceRecord {
  const { fix } = input.location;
  return {
    type: RECORD_TYPE,
    version: FORMAT_VERSION,
    id: input.id,
    session: input.session,
    sequence: input.sequence,
    segment: input.segment,
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
      hashedAt: input.hashedAt.toISOString(),
      timeZone: input.timeZone,
      utcOffsetMinutes: -input.startedAt.getTimezoneOffset(),
    },
    location:
      input.location.status === 'fixed' && fix
        ? {
            latitude: fix.latitude,
            longitude: fix.longitude,
            accuracyMeters: fix.accuracyMeters,
            altitudeMeters: fix.altitudeMeters,
            fixedAt: fix.fixedAt,
          }
        : null,
    locationStatus: input.location.status === 'fixed' && !fix ? 'unavailable' : input.location.status,
    device: input.device,
    app: input.app,
    key: { id: input.keyId, algorithm: 'ES256' },
  };
}
