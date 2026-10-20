import * as Location from 'expo-location';

export type Fix = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  /** When the phone took this fix, ISO 8601. It can be older than the moment it is used. */
  fixedAt: string;
};

export type FixResult =
  | { status: 'fixed'; fix: Fix }
  | { status: 'denied'; fix: null }
  | { status: 'unavailable'; fix: null };

export type LocationPermission = 'granted' | 'denied' | 'undetermined';

type Position = Pick<Location.LocationObject, 'coords' | 'timestamp'>;

/** The parts of expo-location this file uses, so tests can stand in for the phone. */
export type LocationApi = {
  getPermission(): Promise<{ status: LocationPermission; canAskAgain: boolean }>;
  requestPermission(): Promise<{ status: LocationPermission }>;
  lastKnown(maxAgeMs?: number, requiredAccuracy?: number): Promise<Position | null>;
  current(): Promise<Position>;
};

const expoLocation: LocationApi = {
  async getPermission() {
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    return { status: status as LocationPermission, canAskAgain };
  },
  async requestPermission() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return { status: status as LocationPermission };
  },
  lastKnown: (maxAge, requiredAccuracy) => Location.getLastKnownPositionAsync({ maxAge, requiredAccuracy }),
  current: () => Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
};

export type FixOptions = {
  /** How long to wait for a new fix before falling back to the last one the phone knows. */
  timeoutMs?: number;
  /** A last-known fix this recent and this accurate is used at once, without waiting. */
  freshMs?: number;
  freshAccuracyMeters?: number;
  /** Ask for permission if it hasn't been asked yet. */
  ask?: boolean;
};

function toFix(position: Position): Fix {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: position.coords.accuracy ?? null,
    fixedAt: new Date(position.timestamp).toISOString(),
  };
}

function within<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/**
 * The best position available within a few seconds, for an alert that can't wait: a recent,
 * accurate fix the phone already has; else a new fix; else the last fix the phone knows, however
 * old (its time travels with it). Never throws.
 */
export async function getCurrentFix(options: FixOptions = {}, api: LocationApi = expoLocation): Promise<FixResult> {
  const { timeoutMs = 8000, freshMs = 2 * 60 * 1000, freshAccuracyMeters = 100, ask = true } = options;
  try {
    let { status, canAskAgain } = await api.getPermission();
    if (status !== 'granted' && ask && canAskAgain) ({ status } = await api.requestPermission());
    if (status !== 'granted') return { status: 'denied', fix: null };

    const fresh = await api.lastKnown(freshMs, freshAccuracyMeters).catch(() => null);
    if (fresh) return { status: 'fixed', fix: toFix(fresh) };

    const current = await within(api.current(), timeoutMs);
    if (current) return { status: 'fixed', fix: toFix(current) };

    const old = await api.lastKnown().catch(() => null);
    if (old) return { status: 'fixed', fix: toFix(old) };
  } catch {
    // Fall through: an alert goes out without a place rather than not at all.
  }
  return { status: 'unavailable', fix: null };
}

export async function getLocationPermission(api: LocationApi = expoLocation): Promise<LocationPermission> {
  return (await api.getPermission()).status;
}

export async function requestLocationPermission(api: LocationApi = expoLocation): Promise<LocationPermission> {
  return (await api.requestPermission()).status;
}

/** A link that opens the place in any browser or maps app. Five decimals is about a metre. */
export function mapsLink(fix: Pick<Fix, 'latitude' | 'longitude'>): string {
  return `https://maps.google.com/?q=${fix.latitude.toFixed(5)},${fix.longitude.toFixed(5)}`;
}
