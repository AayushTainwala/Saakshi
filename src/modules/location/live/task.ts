import { CryptoDigestAlgorithm, digestStringAsync, getRandomBytes } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { readBatteryPercent } from '@/platform/battery';

import { createLiveApi, type LivePoint } from './api';
import { type LiveShare, LiveShareController, type Tracker, withBattery } from './share';

const TASK = 'saakshi-live-location';
const FILE_NAME = 'live-share.json';

export class LocationDeniedError extends Error {}

function toPoint(position: Location.LocationObject): LivePoint {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    acc: position.coords.accuracy ?? null,
    at: new Date(position.timestamp).toISOString(),
  };
}

/** The updates' settings: normally, and in saving mode on iPhone (round 2, group 1.6). */
export function trackingOptions(saving: boolean): Location.LocationTaskOptions {
  return {
    // Saving mode, built so: about 100 m (iOS may then find the position without the GPS, from
    // Wi-Fi and cell towers), and a new position only after moving about 100 m.
    accuracy: saving ? Location.Accuracy.Balanced : Location.Accuracy.High,
    timeInterval: 30_000,
    distanceInterval: saving ? 100 : 20,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    activityType: Location.ActivityType.Other,
  };
}

/**
 * Position updates that carry on with the screen locked, with only "while using" permission:
 * Android runs them in a location foreground service with a notification; iPhone shows the blue
 * location indicator. Both must be started while the app is on screen.
 */
export const tracker: Tracker = {
  async start(notice) {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new LocationDeniedError('Location permission was not granted');
    await Location.startLocationUpdatesAsync(TASK, {
      ...trackingOptions(false),
      foregroundService: {
        notificationTitle: notice.title,
        notificationBody: notice.body,
        killServiceOnDestroy: false,
      },
    });
  },
  async stop() {
    if (await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK);
  },
  /**
   * Saving mode's GPS (round 2, group 1.6), iPhone only. expo-location 58, asked again for a task
   * that runs, only changes the running CLLocationManager's accuracy and distance filter
   * (EXTaskService registerTaskWithName → EXLocationTaskConsumer setOptions): nothing is stopped,
   * and it works in the background. On Android the same call stops and restarts the updates
   * (LocationTaskConsumer.setOptions: removeLocationUpdates, then requestLocationUpdates), and the
   * library refuses it from the background, so Android is left as it is: positions are only sent
   * less often. Never starts updates that aren't running.
   */
  async setSaving(on) {
    if (Platform.OS !== 'ios') return false;
    if (!(await Location.hasStartedLocationUpdatesAsync(TASK))) return false;
    await Location.startLocationUpdatesAsync(TASK, trackingOptions(on));
    return true;
  },
};

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const liveShare = new LiveShareController({
  api: createLiveApi(),
  storage: {
    read() {
      const file = new File(Paths.document, FILE_NAME);
      return file.exists ? file.textSync() : null;
    },
    write(text) {
      const file = new File(Paths.document, FILE_NAME);
      if (!file.exists) file.create();
      file.writeSync(text);
    },
  },
  randomHex: (bytes) => toHex(getRandomBytes(bytes)),
  sha256Hex: (text) => digestStringAsync(CryptoDigestAlgorithm.SHA256, text),
  tracker,
  now: () => new Date(),
});

/**
 * Defines the background task that receives positions. Call once at the top level of the app's
 * root layout, so it exists whenever the system wakes the app with new positions.
 */
export function registerLiveLocationTask(): void {
  if (TaskManager.isTaskDefined(TASK)) return;
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    await liveShare.receive(withBattery(data.locations.map(toPoint), await readBatteryPercent()));
  });
  void liveShare.retryStops();
}

export function useLiveShare(): LiveShare | null {
  return useSyncExternalStore(liveShare.subscribe, liveShare.getShare);
}
