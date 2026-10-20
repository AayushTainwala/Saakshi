import { CryptoDigestAlgorithm, digestStringAsync, getRandomBytes } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useSyncExternalStore } from 'react';

import { createLiveApi, type LivePoint } from './api';
import { type LiveShare, LiveShareController, type Tracker } from './share';

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

/**
 * Position updates that carry on with the screen locked, with only "while using" permission:
 * Android runs them in a location foreground service with a notification; iPhone shows the blue
 * location indicator. Both must be started while the app is on screen.
 */
const tracker: Tracker = {
  async start(notice) {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new LocationDeniedError('Location permission was not granted');
    await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 30_000,
      distanceInterval: 20,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      activityType: Location.ActivityType.Other,
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
    await liveShare.receive(data.locations.map(toPoint));
  });
  void liveShare.retryStops();
}

export function useLiveShare(): LiveShare | null {
  return useSyncExternalStore(liveShare.subscribe, liveShare.getShare);
}
