/**
 * Bug mode (spec section 4: E8): sound recorded in fixed pieces until stopped or the battery runs
 * out, carrying on with the screen locked. Each piece is sealed through the evidence module's
 * public API, witnessed by SMS where the phone can send with no tap, and handed to the cloud
 * uploader (E7) once there is one. Owner: Stream B.
 *
 * Public API of this module. Other code imports only from `@/modules/bugmode`, never from files
 * inside it.
 */
export { BUG_PIECE_SECONDS, type BugState, type PieceUploader } from './controller';
export { MicrophoneDeniedError } from './engines';
export { bugMode, setPieceUploader, useBugMode } from './instance';
export { BugModeScreen } from './ui/BugModeScreen';
