import * as Location from 'expo-location';
import { useCallback, useEffect, useRef } from 'react';

import type { LocationFix, LocationSnapshot } from '../types';

function toFix(position: Location.LocationObject): LocationFix {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: position.coords.accuracy ?? null,
    altitudeMeters: position.coords.altitude ?? null,
    fixedAt: new Date(position.timestamp).toISOString(),
  };
}

/**
 * Keeps the most recent position fix while the camera is open, so that each file's record
 * carries the latest place known when it closed. Asks for location permission when used.
 */
export function useLatestLocation(): () => LocationSnapshot {
  const snapshot = useRef<LocationSnapshot>({ status: 'unavailable', fix: null });

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') {
        snapshot.current = { status: 'denied', fix: null };
        return;
      }
      const last = await Location.getLastKnownPositionAsync().catch(() => null);
      if (last && !cancelled) snapshot.current = { status: 'fixed', fix: toFix(last) };
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
        (position) => {
          snapshot.current = { status: 'fixed', fix: toFix(position) };
        },
      );
      if (cancelled) subscription.remove();
    })().catch(() => {
      snapshot.current = { status: 'unavailable', fix: null };
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return useCallback(() => snapshot.current, []);
}
