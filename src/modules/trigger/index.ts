/**
 * The quick trigger's plumbing (SPEC 5.1): the iPhone controls, Action Button and Back Tap, and the
 * Android widget and notification, all open the SOS screen (saakshi://sos). And "My phone is being
 * taken" (SPEC 5.4), which replaced confiscation mode in round 2. Owner: Stream B.
 *
 * Public API of this module. Other code imports only from `@/modules/trigger`, never from files
 * inside it.
 */
export { SOS_ROUTE, useQuickTriggers } from './listener';
export type { LockSettingState } from './lockScreen';
export { lockSetting, useLockSetting } from './lockScreenInstance';
export { removeOldCodePadSetting } from './migrate';
export type { PhoneTakenState, StartResult as PhoneTakenStart } from './phoneTaken';
export { phoneTaken, usePhoneTaken } from './phoneTakenInstance';
export { LockSettings, LockSettingsCard, LockSettingsPanel } from './ui/LockSettings';
export { PhoneTakenStatus, PhoneTakenSwipe } from './ui/PhoneTaken';
export { TriggerSettings } from './ui/TriggerSettings';
