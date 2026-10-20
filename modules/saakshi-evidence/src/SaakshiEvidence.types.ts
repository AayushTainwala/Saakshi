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

export type RecordingClosedEvent = RecordingStartedEvent & {
  endedAt: string;
  endReason: 'stopped' | 'piece-complete' | 'camera-lost' | 'error';
  gapBeforeMs: number | null;
};

export type SaakshiEvidenceEvents = {
  onRecorderReady: (event: { width: number; height: number }) => void;
  onRecordingStarted: (event: RecordingStartedEvent) => void;
  onRecordingClosed: (event: RecordingClosedEvent) => void;
  onRecorderError: (event: { message: string }) => void;
  /** A volume-down press, while volumeKeysStart() is in effect. */
  onVolumeDown: () => void;
  /** Android: body-cam was stopped from its notification's Stop button. */
  onBodyCamStopped: () => void;
};

export type BodyCamOptions = RecorderOptions & {
  pieceSeconds: number;
  /** The text of the notification Android shows while the service runs. */
  notificationTitle: string;
  notificationText: string;
  /** Label of the notification's Stop button. */
  notificationStop: string;
};
