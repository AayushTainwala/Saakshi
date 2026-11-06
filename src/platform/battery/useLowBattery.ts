import * as Battery from 'expo-battery';
import { useEffect, useRef } from 'react';

import { type BatteryAction, batteryMonitor } from './monitor';

/** Android reports level changes only near "battery low", so the level is also read every 30 s. */
const POLL_MS = 30_000;

/**
 * While `active`, watches the battery and calls `onAction` for the 10% and 5% warnings and the 3%
 * stop. The latest callback is always used.
 */
export function useLowBattery(active: boolean, onAction: (action: BatteryAction) => void): void {
  const callback = useRef(onAction);
  useEffect(() => {
    callback.current = onAction;
  }, [onAction]);

  useEffect(() => {
    if (!active) return;
    const monitor = batteryMonitor();
    let cancelled = false;

    const check = async () => {
      const [level, state] = await Promise.all([Battery.getBatteryLevelAsync(), Battery.getBatteryStateAsync()]);
      if (cancelled) return;
      const charging = state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;
      const action = monitor(level, charging);
      if (action) callback.current(action);
    };

    void check().catch(() => undefined);
    const timer = setInterval(() => void check().catch(() => undefined), POLL_MS);
    const subscription = Battery.addBatteryLevelListener(() => void check().catch(() => undefined));
    return () => {
      cancelled = true;
      clearInterval(timer);
      subscription.remove();
    };
  }, [active]);
}
