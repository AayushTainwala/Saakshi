import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { BugRecorderOptions, DirectSmsResult, PickedPhone, SaakshiSosEvents } from './SaakshiSos.types';

declare class SaakshiSosModule extends NativeModule<SaakshiSosEvents> {
  /**
   * Opens the phone's contact picker for one phone number. Needs no contacts permission: Android
   * grants read access to the picked number only, and iOS runs the picker outside the app.
   * Resolves null if the user cancels.
   */
  pickPhoneNumber(): Promise<PickedPhone | null>;
  /**
   * Android only: true when this build declares SEND_SMS (the APK; spec S2) and the phone can send
   * text messages. Always false on iPhone, which never lets an app send SMS by itself.
   */
  canSendDirectly(): boolean;
  /** Android only: sends the message to each number through SmsManager. Needs SEND_SMS granted. */
  sendDirect(phones: string[], message: string): Promise<DirectSmsResult[]>;

  /** Android: the ongoing notification that opens the code pad (spec S4); kept across restarts. */
  quickNotificationShow(title: string, text: string, action: string): void;
  quickNotificationHide(): void;
  quickNotificationEnabled(): boolean;
  /** iPhone: true once if a control, the Action Button or a Shortcut asked for the code pad. */
  consumeCodePadRequest(): boolean;

  /** Android: bug mode's recorder in a microphone foreground service (spec E8). */
  bugRecorderStart(options: BugRecorderOptions): Promise<void>;
  bugRecorderStop(): Promise<void>;
  bugRecorderRunning(): boolean;

  /**
   * iPhone: marks a folder and everything in it as excluded from iCloud device backup (or not).
   * Resolves to how many items were marked. Android: does nothing (backup is off app-wide).
   */
  setExcludedFromBackup(uri: string, excluded: boolean): Promise<number>;

  /** iPhone: bug mode's Live Activity. Resolves false where Live Activities are off. */
  liveActivityStart(title: string, detail: string): Promise<boolean>;
  liveActivityUpdate(detail: string): Promise<void>;
  liveActivityEnd(): Promise<void>;
}

/** Null where the native module isn't built in (unit tests, Expo Go). */
export default requireOptionalNativeModule<SaakshiSosModule>('SaakshiSos');
