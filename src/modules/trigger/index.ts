/**
 * The quick trigger's plumbing (SPEC 5.1): the iPhone controls, Action Button and Back Tap, and the
 * Android widget and notification, all open the SOS screen (saakshi://sos). Round 2 removed the
 * code pad and confiscation mode from this module. Owner: Stream B.
 *
 * Public API of this module. Other code imports only from `@/modules/trigger`, never from files
 * inside it.
 */
export { SOS_ROUTE, useQuickTriggers } from './listener';
export { removeOldCodePadSetting } from './migrate';
export { TriggerSettings } from './ui/TriggerSettings';
