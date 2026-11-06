import { NativeModule, requireOptionalNativeModule } from 'expo';

import type {
  BodyCamOptions,
  FileHashes,
  JoinToMp4Request,
  JoinToMp4Result,
  KeyAttestation,
  NativeDeviceKey,
  RecorderOptions,
  RecordingClosedEvent,
  SaakshiEvidenceEvents,
  SoundClosedEvent,
  SoundStartOptions,
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
  /** Android: opens the back camera, or the front one (fix round 1, group 4). */
  recorderOpen(quality: number, facing?: 'back' | 'front'): Promise<void>;
  /** Android: zoom, as a ratio of the camera's normal view, clamped to what it can do. */
  recorderSetZoom(ratio: number): Promise<void>;
  /** Android: how far the camera facing this way can zoom (for expo-camera's photos). */
  cameraZoomRange(facing: 'back' | 'front'): Promise<{ min: number; max: number }>;
  /** iPhone: the most the lens in use can zoom in its current format (for expo-camera's `zoom`). */
  cameraMaxZoom(position: 'back' | 'front', deviceType: string | null): Promise<number>;
  recorderClose(): Promise<void>;
  recorderStart(options: RecorderOptions): Promise<void>;
  recorderStop(): Promise<void>;

  /**
   * Starts body-cam recording. Android: in a foreground service (camera and microphone). iPhone:
   * the app's own recorder, with video and sound in one file while the app is on screen.
   */
  bodyCamStart(options: BodyCamOptions): Promise<void>;
  /**
   * Stops body-cam recording. iPhone: resolves once every file is closed, with the
   * `onRecordingClosed` events of the files the stop closed. Android: resolves with nothing.
   */
  bodyCamStop(): Promise<RecordingClosedEvent[] | null | undefined>;
  bodyCamRunning(): boolean;
  /**
   * The low-battery handover at 5% (round 2, group 1.5): the file being written closes with
   * `reason` ("low-battery") and a new file of the same clip continues; with `saving`, at 480p and
   * 15 frames a second.
   */
  bodyCamHandOver(reason: string, saving: boolean): Promise<void>;
  /** Saving mode on or off; it applies from the next file. */
  bodyCamSetSaving(saving: boolean): Promise<void>;
  /** iPhone: Pocket recording's handover (the file closes with `reason`, the next continues). */
  soundHandOver(reason: string): Promise<void>;
  /**
   * iPhone only: bug mode's sound recorder (SoundRecorder.swift), one continuous ADTS AAC file with
   * checkpoints. Rejects if the microphone can't start. (Android bug mode records in SaakshiSos.)
   */
  soundStart(options: SoundStartOptions): Promise<void>;
  /** iPhone only: resolves once the file is closed, with the `onSoundClosed` events of the files the stop closed. */
  soundStop(): Promise<SoundClosedEvent[] | null | undefined>;
  soundRunning(): boolean;
  /**
   * Joins a record's files into one MP4 copy for sharing (fix round 1, group 3): each video file's
   * picture at its place, and the sound from the segments given, each stretch once. Android never
   * re-encodes; iPhone re-encodes only if it can't join otherwise, and says so.
   */
  joinToMp4(request: JoinToMp4Request): Promise<JoinToMp4Result>;
  /**
   * iPhone only: the document picker for the default export folder (fix round 1, group 9).
   * Resolves with a bookmark to keep, and the folder's name, or with null if the user cancels.
   */
  pickExportFolder(): Promise<{ bookmark: string; name: string } | null>;
  /**
   * iPhone only: copies a file into the bookmarked folder as `name`, or "name (2)" if that is taken.
   * `bookmark` is set when the old one was stale; keep it in its place.
   */
  saveToExportFolder(bookmark: string, sourceUri: string, name: string): Promise<{ name: string; folder: string; bookmark?: string }>;
  /** Android: MP4 copy of an MPEG-TS file without re-encoding; returns the copy's file:// URI. */
  remuxToMp4(input: string, output: string, rotationDegrees: number | null): Promise<string>;
  /** Starts delivering `onVolumeUp` events and stops the volume buttons changing the volume. */
  volumeKeysStart(): Promise<void>;
  volumeKeysStop(): Promise<void>;
  /**
   * iPhone only: `volumeKeysStart` for the unlock practice, with the camera running (not recording),
   * because iOS sends button presses only to an app that is using the camera. On Android, use
   * `volumeKeysStart` and `volumeKeysStop`.
   */
  unlockPracticeStart(): Promise<void>;
  unlockPracticeStop(): Promise<void>;
  /** Dims the screen to its minimum, or puts it back. */
  setScreenDimmed(dimmed: boolean): Promise<void>;
}

/** Null where the native module isn't built in (unit tests, Expo Go). */
export default requireOptionalNativeModule<SaakshiEvidenceModule>('SaakshiEvidence');
