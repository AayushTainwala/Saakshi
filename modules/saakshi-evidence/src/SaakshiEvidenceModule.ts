import { NativeModule, requireOptionalNativeModule } from 'expo';

import type {
  BodyCamOptions,
  FileHashes,
  KeyAttestation,
  NativeDeviceKey,
  RecorderOptions,
  SaakshiEvidenceEvents,
} from './SaakshiEvidence.types';

declare class SaakshiEvidenceModule extends NativeModule<SaakshiEvidenceEvents> {
  /** Reads a local file once and returns its size, SHA-256, SHA-1, MD5 and CRC-32. */
  hashFile(uri: string): Promise<FileHashes>;
  /** The device key, or null before it is created. On iOS `attestation` is always null here. */
  getDeviceKey(): Promise<NativeDeviceKey | null>;
  /** Creates the device key if there is none (Android attests it at creation). */
  createDeviceKey(): Promise<NativeDeviceKey>;
  /** iOS: runs App Attest over the device key (needs the internet). Android: returns the attestation chain. */
  attestDeviceKey(): Promise<KeyAttestation>;
  /** ES256 signature of the message's UTF-8 bytes, DER, in Base64. */
  signUtf8(message: string): Promise<string>;

  /** True on Android, where the app records video itself (CameraRecorder). */
  recorderSupported(): boolean;
  recorderOpen(quality: number): Promise<void>;
  recorderClose(): Promise<void>;
  recorderStart(options: RecorderOptions): Promise<void>;
  recorderStop(): Promise<void>;

  /** Android: starts body-cam recording in a foreground service (camera and microphone). */
  bodyCamStart(options: BodyCamOptions): Promise<void>;
  bodyCamStop(): Promise<void>;
  bodyCamRunning(): boolean;
  /** Starts delivering `onVolumeDown` events and stops the volume buttons changing the volume. */
  volumeKeysStart(): Promise<void>;
  volumeKeysStop(): Promise<void>;
  /** Dims the screen to its minimum, or puts it back. */
  setScreenDimmed(dimmed: boolean): Promise<void>;
}

/** Null where the native module isn't built in (unit tests, Expo Go). */
export default requireOptionalNativeModule<SaakshiEvidenceModule>('SaakshiEvidence');
