/**
 * The one secret code (SPEC 5.3; round 2, group 1.2): four digits, set in Settings, asked for
 * before anything that was turned on is turned off (body-cam, Pocket recording, live location and
 * "My phone is being taken").
 *
 * Public API of this module. Other modules ask "is a code set" and require the code before a Stop;
 * nothing outside this module knows how it is stored. Other code imports only from
 * `@/modules/secretcode`, never from files inside it.
 */
export { CODE_LENGTH, checkNewCode, type CodeProblem } from './code';
export { isSecretCodeSet, resetWithPhonePasscode, useSecretCode } from './instance';
export { type CodeScreenMode, openCodeScreen, requireSecretCode } from './request';
export { type Protected, registerRunningCheck, whatIsRunning } from './running';
export type { SecretCodeState } from './store';
export { SecretCodeRoute } from './ui/SecretCodeScreen';
export { SecretCodeSettings } from './ui/SecretCodeSettings';
