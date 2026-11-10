import { Platform } from 'react-native';

/**
 * How fast each recorder fills the phone, in bytes a second, for "Room for about …" and the
 * warnings (repair round A, group 2). Worked out from the rates the recorders are set to
 * (modules/saakshi-evidence: CameraRecorder.kt, BodyCamRecorder.swift, CheckpointedFile.swift;
 * modules/saakshi-sos: BugRecorder.kt), not measured on a phone, so the app says "about".
 *
 * - Video, body-cam on both phones and the evidence camera on Android: 3 Mbit/s at 720p and
 *   6 Mbit/s at 1080p, with 128 kbit/s of sound in the same file.
 * - Sound: 128 kbit/s on iPhone (Pocket recording and body-cam's sound-only files) and 64 kbit/s on
 *   Android.
 * - The iPhone evidence camera records through the phone's own movie recorder at 720p, at a rate
 *   Saakshi does not set and this code can't read. 12 Mbit/s is an assumption on the high side, so
 *   that the app promises less time rather than more, until a file from a phone is measured.
 *
 * `ALLOWANCE` adds a tenth for what a rate leaves out: the container's own bytes, and an encoder
 * running over its target.
 */
const ALLOWANCE = 1.1;
const perSecond = (bitsPerSecond: number) => Math.round((bitsPerSecond / 8) * ALLOWANCE);

const VIDEO_SOUND_BITS = 128_000;
const IOS_CAMERA_BITS_ASSUMED = 12_000_000;

export type RecorderKind = 'body-cam' | 'camera' | 'sound';

export function videoBytesPerSecond(quality: 720 | 1080): number {
  return perSecond((quality >= 1080 ? 6_000_000 : 3_000_000) + VIDEO_SOUND_BITS);
}

export function soundBytesPerSecond(os: string = Platform.OS): number {
  return perSecond(os === 'ios' ? 128_000 : 64_000);
}

export function cameraBytesPerSecond(os: string = Platform.OS): number {
  return os === 'ios' ? perSecond(IOS_CAMERA_BITS_ASSUMED) : videoBytesPerSecond(720);
}

export const bytesPerHour = (bytesPerSecond: number) => bytesPerSecond * 3600;
