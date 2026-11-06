export type MediaKind = 'photo' | 'video' | 'audio';

export type SegmentRef = { clip: number; index: number };

/** What was recording: the evidence camera, body-cam mode or bug mode (spec E1, B1–B4, E8). */
export type CaptureMode = 'camera' | 'body-cam' | 'bug';

/**
 * Why a file ended. `interrupted`: cut off (crash or forced power-off) and sealed when the app
 * next opened. `app-left`: on iPhone, video stops when the user leaves the app or the phone locks.
 * `camera-in-use` and `system-pressure` (iPhone body-cam): iOS stopped the camera because another
 * app took it, or because the phone was under strain, such as from heat. `low-battery`:
 * the app stopped and saved the recording itself at 3% battery. `audio-interrupted`: the system
 * stopped sound recording (for example, a phone call on iPhone). iPhone body-cam only:
 * `sound-resumed`, a video piece whose sound stopped part-way (or which had none) ended so that the
 * next one has sound again;
 * `video-resumed`, a sound-only file ended because video with sound started again.
 */
export type EndReason =
  | 'stopped'
  | 'piece-complete'
  | 'app-left'
  | 'camera-in-use'
  | 'system-pressure'
  | 'camera-lost'
  | 'low-battery'
  | 'audio-interrupted'
  | 'sound-resumed'
  | 'video-resumed'
  | 'interrupted'
  | 'error';

/** A file the camera has just closed, before it is hashed or moved. */
export type ClosedFile = {
  uri: string;
  kind: MediaKind;
  segment: SegmentRef | null;
  startedAt: Date;
  endedAt: Date;
  location: LocationSnapshot;
  mode?: CaptureMode;
  endReason?: EndReason;
  /** True when the file was cut off and is being sealed at the next app start. */
  interrupted?: boolean;
  /** Milliseconds since the previous piece of the same recording ended, if there was one. */
  gapBeforeMs?: number | null;
  /** Degrees to turn the picture upright, for containers with no field for it (MPEG-TS). */
  rotationDegrees?: number | null;
  /** The crash-recovery marker for this file (locker/pending.ts), removed once the file is safe. */
  pendingMarker?: string;
  /** The recorder's random id for this file, which its checkpoints carry (body-cam, format 0.5). */
  recording?: string | null;
  /** The recorder's own fingerprint of every byte it wrote, to compare with the file as hashed. */
  written?: { size: number; sha256: string } | null;
};

/**
 * A checkpoint of a file still being written: its length so far and the SHA-256 of those bytes,
 * from the recorder's running hash (fix round 1, group 2a). Sealed into the session's chain as it
 * comes, so it proves what existed at that moment even if the recording is later cut off.
 */
export type CheckpointInput = {
  recording: string;
  /** The checkpoint's number in its file, from 0. */
  index: number;
  kind: MediaKind;
  segment: SegmentRef | null;
  mediaType: string;
  bytes: number;
  sha256: string;
  /** When the recorder counted the bytes. */
  at: Date;
  /** When the file started. */
  startedAt: Date;
  location: LocationSnapshot;
  mode?: CaptureMode;
};

export type CheckpointItem = {
  sequence: number;
  recording: string;
  /** What is recording (body-cam or bug mode), kept here for the records list. */
  mode?: CaptureMode;
  index: number;
  bytes: number;
  sha256: string;
  at: string;
  status: 'sealed' | 'failed';
  record?: { file: string; recordId: string };
  recordSha256?: string;
  error?: string;
};

export type FileDigests = {
  size: number;
  sha256: string;
  sha1: string;
  md5: string;
  /** CRC-32 of the file, kept for writing the export ZIP without reading the file twice. */
  crc32: number;
};

export type ItemStatus = 'saved' | 'hashed' | 'sealed' | 'failed';

/** The locker's own, unsigned bookkeeping for one file. The signed record is the source of truth. */
export type EvidenceItem = {
  sequence: number;
  kind: MediaKind;
  segment: SegmentRef | null;
  media: string;
  mediaType: string;
  startedAt: string;
  endedAt: string;
  status: ItemStatus;
  digests?: FileDigests;
  /** The signed record's file name in records/ and its id. */
  record?: { file: string; recordId: string };
  recordSha256?: string;
  interrupted?: boolean;
  endReason?: EndReason;
  error?: string;
  /** The recorder's id for the file, which its checkpoints carry (format 0.5). */
  recording?: string;
  /** Set when the file as hashed differs from what the recorder wrote (it should never happen). */
  writtenMismatch?: boolean;
  /** What recorded it (the signed record's `capture.mode`), kept here for the records list. */
  mode?: CaptureMode;
  /** Degrees to turn the picture upright (MPEG-TS), as in the signed record. */
  rotationDegrees?: number | null;
};

export type WitnessEntry = {
  sentAt: string;
  chainHead: string;
  recipients: number;
  result: 'sent' | 'cancelled' | 'unknown';
};

export type SessionState = {
  version: 1;
  id: string;
  createdAt: string;
  updatedAt: string;
  items: EvidenceItem[];
  witness: WitnessEntry[];
  certificate: { file: string; createdAt: string } | null;
  /**
   * Playable MP4 copies of Android .ts videos, by the original's sequence number. Each has its own
   * signed record; the originals stay the evidence (owner decision of 22 Oct).
   */
  copies?: Record<string, { file: string; sha256: string; recordSha256: string; madeAt: string }>;
  /**
   * The joined MP4 copy of a record with more than one video file, for sharing (format 0.7, fix
   * round 1, group 3): its file in copies/, its own signed record, and the files it was made from.
   */
  joined?: { file: string; sha256: string; recordSha256: string; madeAt: string; sources: number[]; reencoded: boolean };
  /** Signed checkpoints of body-cam files while they were written (format 0.5), in chain order. */
  checkpoints?: CheckpointItem[];
  /** The last on-phone check of files, records and chain. */
  lastCheck?: { at: string; ok: boolean; problems: { sequence: number; problem: string }[] };
};

export type LocationFix = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  altitudeMeters: number | null;
  fixedAt: string;
};

export type LocationStatus = 'fixed' | 'denied' | 'unavailable';

export type LocationSnapshot = { status: LocationStatus; fix: LocationFix | null };
