import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { getCalendars } from 'expo-localization';
import { Platform } from 'react-native';

import type { AppInfo, DeviceInfo } from './record';

/** The phone as the operating system reports it. Android has no marketing name; iOS gives both. */
export function deviceInfo(): DeviceInfo {
  const ios = Platform.OS === 'ios';
  return {
    manufacturer: Device.manufacturer,
    brand: Device.brand,
    model: ios ? (Device.modelId ?? Device.modelName) : Device.modelName,
    modelName: ios ? Device.modelName : null,
    os: Device.osName,
    osVersion: Device.osVersion,
  };
}

export function appInfo(): AppInfo {
  return {
    id: Application.applicationId,
    version: Application.nativeApplicationVersion,
    build: Application.nativeBuildVersion,
  };
}

export function timeZone(): string | null {
  return getCalendars()[0]?.timeZone ?? null;
}
