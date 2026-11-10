/**
 * The one secret code (SPEC 5.3; round 2, groups 1.2 and 1.6): four digits, set in Settings, asked
 * for before anything that was turned on is turned off (body-cam, Pocket recording, live location
 * and "My phone is being taken"). A forgotten code is reset with the phone's passcode alone, or on
 * a phone with no screen lock with a recovery code, only while nothing runs.
 *
 * Public API of this module. Other modules ask "is a code set" and require the code before a Stop;
 * nothing outside this module knows how it is stored. Other code imports only from
 * `@/modules/secretcode`, never from files inside it.
 */
export { CODE_LENGTH, checkNewCode, type CodeProblem } from './code';
export { isSecretCodeSet, resetWithPhonePasscode, resetWithRecoveryCode, useSecretCode } from './instance';
export type { ResetMethod } from './reset';
export { type CodeScreenMode, openCodeScreen, requireSecretCode } from './request';
export { type Protected, registerRunningCheck, whatIsRunning } from './running';
export type { SecretCodeState } from './store';
export { RecoveryCodeReminder } from './ui/RecoveryCodeReminder';
export { SecretCodeRoute } from './ui/SecretCodeScreen';
export { SecretCodeSettings } from './ui/SecretCodeSettings';
