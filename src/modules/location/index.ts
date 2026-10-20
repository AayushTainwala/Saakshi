/**
 * Current position and live location by link (spec section 5: S3). Owner: Stream B.
 *
 * Public API of this module. Other code imports only from `@/modules/location`, never from files
 * inside it.
 */
export {
  type Fix,
  type FixOptions,
  type FixResult,
  getCurrentFix,
  getLocationPermission,
  type LocationApi,
  type LocationPermission,
  mapsLink,
  requestLocationPermission,
} from './current';
