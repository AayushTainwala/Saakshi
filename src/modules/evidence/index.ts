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

export type { BatteryAction } from './battery/monitor';
export { useLowBattery } from './battery/useLowBattery';
export { BodyCamScreen } from './bodycam/BodyCamScreen';
export { CaptureScreen } from './capture/CaptureScreen';
export { createEvidenceSession } from './capture/deps';
export { type AudioPiecesHandle, piecePaths, startAudioPieces } from './capture/pieces';
export { CertificateForm } from './ui/CertificateForm';
export { RecordHome } from './ui/RecordHome';
export { SessionDetail } from './ui/SessionDetail';
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
