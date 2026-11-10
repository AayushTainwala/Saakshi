export type FileHashes = {
  size: number;
  sha256: string;
  sha1: string;
  md5: string;
  crc32: number;
};

export type AndroidKeyAttestation = {
  format: 'android-key-attestation';
  /** Base64 DER certificates, leaf first. */
  certificateChain: string[];
};

export type AppleAppAttest = {
  format: 'apple-app-attest';
  keyId: string;
  attestationObject: string;
  clientDataHash: string;
};

export type KeyAttestation = AndroidKeyAttestation | AppleAppAttest;

export type KeyStorage = 'strongbox' | 'tee' | 'secure-enclave' | 'software';

export type NativeDeviceKey = {
  /** SHA-256 of the DER SubjectPublicKeyInfo, lowercase hex. */
  keyId: string;
  /** Base64 of the DER SubjectPublicKeyInfo. */
  publicKeySpki: string;
  platform: 'android' | 'ios';
  storage: KeyStorage;
  attestation: KeyAttestation | null;
  attestationError: string | null;
};

export type RecorderOptions = {
  /** Folder (file:// URI) the recorder writes into. */
  outputDir: string;
  /** Folder (file:// URI) for the crash-recovery markers. */
  pendingDir: string;
  /** Body-cam pieces: seconds per piece. Omit to record one file from start to stop. */
  pieceSeconds?: number;
  quality: 720 | 1080;
  clip: number;
  mode: 'camera' | 'body-cam';
};

export type RecordingStartedEvent = {
  uri: string;
  startedAt: string;
  clip: number;
  index: number;
  cutoffSafe: boolean;
  /** MPEG-TS only: degrees to turn the picture upright (the container can't say). Null otherwise. */
  rotationDegrees: number | null;
};

/** Why the recorder closed a file (the record's `capture.endReason`, docs/spec/evidence-bundle.md). */
export type RecorderEndReason =
  | 'stopped'
  | 'piece-complete'
  | 'camera-lost'
  | 'error'
  // From 0.9: closed cleanly at 5% battery, and a new file of the same clip follows.
  | 'low-battery'
  // iPhone body-cam only:
  | 'app-left'
  | 'camera-in-use'
  | 'system-pressure'
  | 'audio-interrupted'
  | 'sound-resumed'
  | 'video-resumed';

export type RecordingClosedEvent = RecordingStartedEvent & {
  endedAt: string;
  endReason: RecorderEndReason;
  gapBeforeMs: number | null;
  /** iPhone body-cam: `audio` for a sound-only file, made while video couldn't record. Android: absent (video). */
  kind?: 'video' | 'audio';
  /** iPhone body-cam: iOS's reason for stopping the camera, when it gave one. For diagnosis only. */
  interruption?: string | null;
  /** Body-cam (format 0.5): the recorder's random id for the file, which its checkpoints carry. */
  recording?: string | null;
  /** Body-cam: the length and SHA-256 of every byte the recorder wrote, from its running hash. */
  finalSize?: number | null;
  finalSha256?: string | null;
};

/**
 * Body-cam (fix round 1, group 2a): a checkpoint of a file still being written. Its first `bytes`
 * bytes have the SHA-256 `sha256`, from the recorder's running hash; about every 10 seconds.
 */
export type CheckpointEvent = {
  recording: string;
  uri: string;
  kind: 'video' | 'audio';
  clip: number;
  index: number;
  /** The checkpoint's number in its file, from 0. */
  checkpoint: number;
  bytes: number;
  sha256: string;
  at: string;
  startedAt: string;
};

/** A stretch of one file placed in a joined copy: `length` seconds from `from` in the file, at `at` in the copy. */
export type JoinSegment = { uri: string; at: number; from: number; length: number };

/** What `joinToMp4` takes. */
export type JoinToMp4Request = {
  output: string;
  video: JoinSegment[];
  audio: JoinSegment[];
  /** Android: degrees to turn the picture upright, the same for every file. */
  rotationDegrees: number | null;
};

/** What `joinToMp4` made: which of the requested stretches it placed (a file may lack that track). */
export type JoinToMp4Result = { uri: string; reencoded: boolean; placedVideo?: boolean[]; placedAudio?: boolean[] };

/** iPhone bug mode (SoundRecorder.swift): what `soundStart` takes. */
export type SoundStartOptions = {
  /** Folders (file:// URIs) for the files and their crash-recovery markers. */
  outputDir: string;
  pendingDir: string;
  /** About this often (seconds of sound), a checkpoint of the file being written. */
  checkpointSeconds: number;
  clip: number;
  mode: 'bug';
};

/** iPhone bug mode: a sound file (ADTS AAC) the recorder has closed. */
export type SoundClosedEvent = {
  uri: string;
  kind: 'audio';
  clip: number;
  index: number;
  startedAt: string;
  endedAt: string;
  endReason: 'stopped' | 'audio-interrupted' | 'error' | 'low-battery';
  gapBeforeMs: number | null;
  recording: string;
  finalSize: number | null;
  finalSha256: string | null;
};

export type SaakshiEvidenceEvents = {
  /** Android recorder: the camera is open. `minZoom`/`maxZoom`: ratios of its normal view (fix round 1, group 4). */
  onRecorderReady: (event: { width: number; height: number; facing?: 'back' | 'front'; minZoom?: number; maxZoom?: number }) => void;
  onRecordingStarted: (event: RecordingStartedEvent) => void;
  onRecordingClosed: (event: RecordingClosedEvent) => void;
  onCheckpoint: (event: CheckpointEvent) => void;
  onRecorderError: (event: { message: string }) => void;
  /** A volume-up press, while volumeKeysStart() is in effect: two in a row unlock body-cam mode. */
  onVolumeUp: () => void;
  /** iPhone bug mode: a checkpoint of the sound file being written. */
  onSoundCheckpoint: (event: CheckpointEvent) => void;
  onSoundClosed: (event: SoundClosedEvent) => void;
  onSoundError: (event: { message: string }) => void;
};

export type BodyCamOptions = RecorderOptions & {
  /** 0: one continuous file per stretch (body-cam's default since fix round 1, group 2a). */
  pieceSeconds: number;
  /** About this often, a checkpoint of the file being written. */
  checkpointSeconds: number;
  /** The text of the notification Android shows while the service runs. */
  notificationTitle: string;
  notificationText: string;
};
