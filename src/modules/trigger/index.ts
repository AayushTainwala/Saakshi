/**
 * Quick trigger and code pad (spec section 5: S4) and confiscation mode. Owner: Stream B. Builds on
 * `@/modules/sos`, `@/modules/location` and `@/modules/bugmode`.
 *
 * Public API of this module. Other code imports only from `@/modules/trigger`, never from files
 * inside it.
 */
export { CODE_LENGTH, REFUSED_CODES } from './code';
export type { ConfiscationResult } from './confiscation';
export { startConfiscationMode } from './instance';
export { useQuickTriggers } from './listener';
export { triggerSettings, useTriggerSettings } from './settings';
export { CodePad } from './ui/CodePad';
export { ConfiscationCard } from './ui/ConfiscationCard';
export { TriggerSettings } from './ui/TriggerSettings';
