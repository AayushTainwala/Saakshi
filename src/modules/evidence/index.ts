/**
 * Evidence capture and integrity (spec section 4: E1-E6, later E3). Photo and video capture,
 * streaming SHA-256 on close, signed and chained records, the evidence locker, export bundles,
 * witness SMS, the BSA s.63 certificate and rights prompts while recording. Owner: Stream A. Format:
 * docs/spec/evidence-bundle.md.
 *
 * Public API of this module. Other code imports only from `@/modules/evidence`, never from files
 * inside it.
 */
import { createPipelineDeps } from './capture/deps';
import { CaptureSession } from './capture/pipeline';

export { CaptureScreen } from './capture/CaptureScreen';
export { CertificateForm } from './ui/CertificateForm';
export { RecordHome } from './ui/RecordHome';
export { SessionDetail } from './ui/SessionDetail';
export type { ClosedFile, EvidenceItem, LocationSnapshot, MediaKind, SegmentRef, SessionState } from './types';
export type { CaptureSession };

/**
 * Starts a new evidence session for files recorded outside the evidence camera, such as bug mode's
 * audio segments (E8). Hand each file to `add()` as soon as it closes: it is hashed, moved into the
 * locker, and a signed, chained record is written. The session appears in the Record tab.
 */
export function createEvidenceSession(): CaptureSession {
  return new CaptureSession(createPipelineDeps());
}
