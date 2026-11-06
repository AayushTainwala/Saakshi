/**
 * The battery, shared by every feature that needs it (round 2, group 1.4): the low-battery
 * warnings and handover while recording, and the level in alerts, live-location positions and
 * records. Not a feature module: any module may import it.
 */
export { type BatteryAction, batteryMonitor, STOP_LEVEL, WARN_LEVELS } from './monitor';
export { readBatteryPercent, toPercent } from './read';
export { useLowBattery } from './useLowBattery';
