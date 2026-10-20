export type MediaKind = 'photo' | 'video';

export type SegmentRef = { clip: number; index: number };

/** A file the camera has just closed, before it is hashed or moved. */
export type ClosedFile = {
  uri: string;
  kind: MediaKind;
  segment: SegmentRef | null;
  startedAt: Date;
  endedAt: Date;
  location: LocationSnapshot;
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
