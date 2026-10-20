import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { DirectSmsResult, PickedPhone } from './SaakshiSos.types';

declare class SaakshiSosModule extends NativeModule {
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
}

/** Null where the native module isn't built in (unit tests, Expo Go). */
export default requireOptionalNativeModule<SaakshiSosModule>('SaakshiSos');
