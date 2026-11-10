/**
 * Bug mode (spec section 4: E8): sound recorded as one continuous, cut-off-safe file until stopped
 * or the battery runs out, carrying on with the screen locked. The file is checkpointed and signed
 * about every 10 seconds through the evidence module's public API, the newest chain head is
 * witnessed by SMS where the phone can send with no tap (at most every 10 minutes), and upload parts
 * are handed to E7 once it exists. Owner: Stream B.
 *
 * Public API of this module. Other code imports only from `@/modules/bugmode`, never from files
 * inside it.
 */
export type { BugState, StartedFrom, StartOptions as PocketStartOptions } from './controller';
export { NoRoomError } from './controller';
export { MicrophoneDeniedError } from './engines';
export { bugMode, setBugModePartListener, useBugMode } from './instance';
export { BugModeScreen } from './ui/BugModeScreen';
