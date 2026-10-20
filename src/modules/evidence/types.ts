export type MediaKind = 'photo' | 'video' | 'audio';

export type SegmentRef = { clip: number; index: number };

/** What was recording: the evidence camera, body-cam mode or bug mode (spec E1, B1–B4, E8). */
export type CaptureMode = 'camera' | 'body-cam' | 'bug';

/**
 * Why a file ended. `interrupted`: cut off (crash or forced power-off) and sealed when the app
 * next opened. `app-left`: on iPhone, video stops when the user leaves the app. `low-battery`:
 * the app stopped and saved the recording itself at 3% battery. `audio-interrupted`: the system
 * stopped sound recording (for example, a phone call on iPhone).
 */
export type EndReason =
  | 'stopped'
  | 'piece-complete'
  | 'app-left'
  | 'camera-lost'
  | 'low-battery'
  | 'audio-interrupted'
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
  /** The crash-recovery marker for this file (locker/pending.ts), removed once the file is safe. */
  pendingMarker?: string;
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
