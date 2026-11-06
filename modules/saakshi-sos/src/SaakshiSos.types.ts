/** One phone number the user chose in the phone's own contact picker. */
export type PickedPhone = {
  name: string | null;
  phone: string;
};

/**
 * What Android reported for one recipient of a direct SMS. `sent` means every part left the phone
 * (the network accepted it); it does not mean the message was delivered.
 */
export type DirectSmsResult = {
  phone: string;
  status: 'sent' | 'failed' | 'unknown';
  /** SmsManager's result code for the first part that failed, when there was one. */
  errorCode: number | null;
  error: string | null;
};

/**
 * Android bug mode: a file the recorder has closed (spec E8). Since fix round 1 bug mode records one
 * continuous file from Start to Stop; a new file starts only after a recorder error.
 */
export type BugPieceClosedEvent = {
  uri: string;
  clip: number;
  index: number;
  startedAt: string;
  endedAt: string;
  endReason: 'stopped' | 'error';
  gapBeforeMs: number | null;
  /** The crash-recovery marker's file name in the session's pending/ folder. */
  marker: string;
  /** The recorder's random id for the file, which its checkpoints carry. */
  recording: string;
  /** The length and SHA-256 of the whole file, from the recorder's running hash (null if it failed). */
  finalSize: number | null;
  finalSha256: string | null;
  /** True for the file Stop closed (the last one). */
  final: boolean;
};

/** Android bug mode: a checkpoint of the file being written; its first `bytes` bytes have SHA-256 `sha256`. */
export type BugCheckpointEvent = {
  recording: string;
  uri: string;
  kind: 'audio';
  clip: number;
  index: number;
  /** The checkpoint's number in its file, from 0. */
  checkpoint: number;
  bytes: number;
  sha256: string;
  at: string;
  startedAt: string;
};

export type BugRecorderOptions = {
  /** Folders (file:// URIs) for the files and their crash-recovery markers. */
  outputDir: string;
  pendingDir: string;
  /** About this often, a checkpoint of the file being written. */
  checkpointSeconds: number;
  clip: number;
  notificationTitle: string;
  notificationText: string;
};

export type SaakshiSosEvents = {
  /** iPhone: a control, the Action Button or a Shortcut asked for the code pad. */
  onOpenCodePad: () => void;
  onBugPieceClosed: (event: BugPieceClosedEvent) => void;
  onBugCheckpoint: (event: BugCheckpointEvent) => void;
  onBugRecorderError: (event: { message: string }) => void;
  /** Sent once Stop has closed the last file (after its onBugPieceClosed). */
  onBugRecorderStopped: () => void;
};
