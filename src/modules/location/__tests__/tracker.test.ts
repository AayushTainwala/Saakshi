import * as Location from 'expo-location';

import { TRACKING_OPTIONS, tracker } from '../live/task';

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

describe('the live-location updates (round 2, group 1.7)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('start at full accuracy, with the Android notice', async () => {
    await tracker.start({ title: 'Saakshi', body: 'Sharing your location' });
    expect(mocked.startLocationUpdatesAsync).toHaveBeenCalledWith('saakshi-live-location', {
      ...TRACKING_OPTIONS,
      foregroundService: { notificationTitle: 'Saakshi', notificationBody: 'Sharing your location', killServiceOnDestroy: false },
    });
    expect(TRACKING_OPTIONS).toMatchObject({ accuracy: Location.Accuracy.High, distanceInterval: 20, timeInterval: 30_000 });
  });

  it('keep full accuracy in saving mode on every phone: the tracker has nothing to slow (owner, 9 Nov 2026)', () => {
    expect(Object.keys(tracker).sort()).toEqual(['start', 'stop']);
  });
});
