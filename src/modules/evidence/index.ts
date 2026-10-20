/**
 * Evidence capture and integrity (spec section 4: E1-E6, later E3). Photo and video capture,
 * streaming SHA-256 on close, signed and chained records, the evidence locker, export bundles,
 * witness SMS, the BSA s.63 certificate and rights prompts while recording. Owner: Stream A. Format:
 * docs/spec/evidence-bundle.md.
 *
 * Public API of this module. Other code imports only from `@/modules/evidence`, never from files
 * inside it.
 */
export { CaptureScreen } from './capture/CaptureScreen';
export { RecordHome } from './ui/RecordHome';
export { SessionDetail } from './ui/SessionDetail';
