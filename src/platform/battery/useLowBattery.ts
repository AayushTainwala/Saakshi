import * as Battery from 'expo-battery';
import { useEffect, useRef } from 'react';

import { type BatteryAction, batteryMonitor } from './monitor';

/** Android reports level changes only near "battery low", so the level is also read every 30 s. */
const POLL_MS = 30_000;

/**
 * Watches the battery until the returned function is called, and calls `onAction` for the 10% and
 * 5% warnings, the 5% handover ("low") and the end of saving mode ("charging"). For code that isn't
 * a screen, such as Pocket recording's controller.
 */
export function watchBattery(onAction: (action: BatteryAction) => void): () => void {
  const monitor = batteryMonitor();
  let cancelled = false;
  const check = async () => {
    const [level, state] = await Promise.all([Battery.getBatteryLevelAsync(), Battery.getBatteryStateAsync()]);
    if (cancelled) return;
    const charging = state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;
    for (const action of monitor(level, charging)) onAction(action);
  };
  void check().catch(() => undefined);
  const timer = setInterval(() => void check().catch(() => undefined), POLL_MS);
  const levels = Battery.addBatteryLevelListener(() => void check().catch(() => undefined));
  const states = Battery.addBatteryStateListener(() => void check().catch(() => undefined));
  return () => {
    cancelled = true;
    clearInterval(timer);
    levels.remove();
    states.remove();
  };
}

/** While `active`, watches the battery (see `watchBattery`). The latest callback is always used. */
export function useLowBattery(active: boolean, onAction: (action: BatteryAction) => void): void {
  const callback = useRef(onAction);
  useEffect(() => {
    callback.current = onAction;
  }, [onAction]);

  useEffect(() => {
    if (!active) return;
    return watchBattery((action) => callback.current(action));
  }, [active]);
}
