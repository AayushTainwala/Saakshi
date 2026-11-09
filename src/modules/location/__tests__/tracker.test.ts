import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { tracker, trackingOptions } from '../live/task';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3, High: 4 },
  ActivityType: { Other: 1 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  startLocationUpdatesAsync: jest.fn(async () => undefined),
  stopLocationUpdatesAsync: jest.fn(async () => undefined),
  hasStartedLocationUpdatesAsync: jest.fn(async () => true),
}));
jest.mock('expo-task-manager', () => ({ isTaskDefined: () => true, defineTask: jest.fn() }));

const mocked = Location as jest.Mocked<typeof Location>;

function onPlatform(os: 'ios' | 'android') {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

describe("saving mode's GPS on each phone (round 2, group 1.6)", () => {
  const realOS = Platform.OS;
  afterEach(() => {
    onPlatform(realOS as 'ios' | 'android');
    jest.clearAllMocks();
  });

  it('iPhone: changes the running updates to about 100 m, and back, without stopping them', async () => {
    onPlatform('ios');
    expect(await tracker.setSaving!(true)).toBe(true);
    expect(mocked.startLocationUpdatesAsync).toHaveBeenLastCalledWith('saakshi-live-location', trackingOptions(true));
    expect(trackingOptions(true)).toMatchObject({ accuracy: Location.Accuracy.Balanced, distanceInterval: 100 });
    expect(await tracker.setSaving!(false)).toBe(true);
    expect(mocked.startLocationUpdatesAsync).toHaveBeenLastCalledWith('saakshi-live-location', trackingOptions(false));
    expect(trackingOptions(false)).toMatchObject({ accuracy: Location.Accuracy.High, distanceInterval: 20 });
    expect(mocked.stopLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('iPhone: never starts updates that are not running', async () => {
    onPlatform('ios');
    mocked.hasStartedLocationUpdatesAsync.mockResolvedValueOnce(false);
    expect(await tracker.setSaving!(true)).toBe(false);
    expect(mocked.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('Android: leaves the updates alone (the library would stop and restart them)', async () => {
    onPlatform('android');
    expect(await tracker.setSaving!(true)).toBe(false);
    expect(mocked.startLocationUpdatesAsync).not.toHaveBeenCalled();
    expect(mocked.stopLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('starts sharing at the normal settings, with the Android notice', async () => {
    await tracker.start({ title: 'Saakshi', body: 'Sharing your location' });
    expect(mocked.startLocationUpdatesAsync).toHaveBeenCalledWith('saakshi-live-location', {
      ...trackingOptions(false),
      foregroundService: { notificationTitle: 'Saakshi', notificationBody: 'Sharing your location', killServiceOnDestroy: false },
    });
  });
});
