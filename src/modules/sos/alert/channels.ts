import SaakshiSos, { type DirectSmsResult, type PickedPhone } from '@native/saakshi-sos';
import * as SMS from 'expo-sms';
import { PermissionsAndroid, Platform } from 'react-native';

export type ComposerResult = 'sent' | 'cancelled' | 'unknown';

/** The two ways an alert leaves the phone. */
export type SmsChannels = {
  /** Android APK only (spec S2): SmsManager, with no tap. */
  direct: {
    supported(): boolean;
    allowed(): Promise<boolean>;
    send(phones: string[], message: string): Promise<DirectSmsResult[]>;
  };
  /** The phone's Messages app with the text and recipients filled in; the user taps Send. */
  composer: {
    available(): Promise<boolean>;
    send(phones: string[], message: string): Promise<ComposerResult>;
  };
};

const SEND_SMS = PermissionsAndroid.PERMISSIONS.SEND_SMS;

function directSupported(): boolean {
  return Platform.OS === 'android' && !!SaakshiSos?.canSendDirectly();
}

export const phoneChannels: SmsChannels = {
  direct: {
    supported: directSupported,
    allowed: async () => directSupported() && (await PermissionsAndroid.check(SEND_SMS)),
    send: (phones, message) => {
      if (!SaakshiSos) throw new Error('Direct SMS is not built into this app');
      return SaakshiSos.sendDirect(phones, message);
    },
  },
  composer: {
    available: () => SMS.isAvailableAsync(),
    send: async (phones, message) => (await SMS.sendSMSAsync(phones, message)).result,
  },
};

/** Asks Android for SEND_SMS, so alerts go out with no tap. False where the build can't. */
export async function requestDirectSms(rationale?: { title: string; message: string; buttonPositive: string }) {
  if (!directSupported()) return false;
  return (await PermissionsAndroid.request(SEND_SMS, rationale)) === PermissionsAndroid.RESULTS.GRANTED;
}

/** Opens the phone's contact picker for one number, without contacts permission. */
export async function pickPhoneNumber(): Promise<PickedPhone | null> {
  if (!SaakshiSos) throw new Error('The contact picker is not built into this app');
  const picked = await SaakshiSos.pickPhoneNumber();
  return picked ? { phone: picked.phone, name: picked.name ?? null } : null;
}
