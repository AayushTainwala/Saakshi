/**
 * Evidence capture and integrity (spec section 4: E1-E6, later E3). Photo and video capture,
 * streaming SHA-256 on close, signed and chained records, the evidence locker, export bundles,
 * witness SMS, the BSA s.63 certificate and rights prompts while recording. Owner: Stream A. Format:
 * docs/spec/evidence-bundle.md.
 *
 * Public API of this module. Other code imports only from `@/modules/evidence`, never from files
 * inside it.
 */
import type { CaptureSession } from './capture/pipeline';

export { BodyCamScreen } from './bodycam/BodyCamScreen';
/** For E7: body-cam upload parts, each a byte range ending on a signed checkpoint. */
export { setBodyCamPartListener, type UploadPart } from './bodycam/parts';
/** For the secret code's reset, offered only while nothing runs. */
export { isBodyCamRunning } from './bodycam/running';
export { CaptureScreen } from './capture/CaptureScreen';
export { createEvidenceSession } from './capture/deps';
/** Bug mode (E8): one continuous, checkpointed sound file per recording. */
export {
  type SoundCheckpoint,
  type SoundClosed,
  type SoundHandlers,
  type SoundRecorderNative,
  type SoundRecordingHandle,
  soundRecorder,
  startSoundRecording,
} from './sound/recording';
export { CertificateForm } from './ui/CertificateForm';
export { CertificateProfile } from './ui/CertificateProfile';
export { PhotoViewer } from './ui/PhotoViewer';
export { RecordHome } from './ui/RecordHome';
export { SessionDetail } from './ui/SessionDetail';
/** Settings → Storage (repair round A, group 2). */
export { StorageSettings } from './ui/StorageSettings';
export type {
  CaptureMode,
  ClosedFile,
  EndReason,
  EvidenceItem,
  LocationSnapshot,
  MediaKind,
  SegmentRef,
  SessionState,
} from './types';
export type { CaptureSession };
