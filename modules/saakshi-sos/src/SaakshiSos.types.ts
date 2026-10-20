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

/** Android bug mode: a piece the recorder has closed (spec E8). */
export type BugPieceClosedEvent = {
  uri: string;
  clip: number;
  index: number;
  startedAt: string;
  endedAt: string;
  endReason: 'stopped' | 'piece-complete' | 'error';
  gapBeforeMs: number | null;
  /** The crash-recovery marker's file name in the session's pending/ folder. */
  marker: string;
};

export type BugRecorderOptions = {
  /** Folders (file:// URIs) for the pieces and their crash-recovery markers. */
  outputDir: string;
  pendingDir: string;
  pieceSeconds: number;
  clip: number;
  notificationTitle: string;
  notificationText: string;
};

export type SaakshiSosEvents = {
  /** iPhone: a control, the Action Button or a Shortcut asked for the code pad. */
  onOpenCodePad: () => void;
  onBugPieceClosed: (event: BugPieceClosedEvent) => void;
  onBugRecorderError: (event: { message: string }) => void;
};
