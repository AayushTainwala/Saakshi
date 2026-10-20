import type { DirectSmsResult } from '@native/saakshi-sos';

import { contactsStore } from '../contacts/fileStore';
import type { TrustedContact } from '../contacts/store';
import { type ComposerResult, phoneChannels, type SmsChannels } from './channels';

export type TextOutcome =
  | { channel: 'direct'; results: DirectSmsResult[] }
  | { channel: 'composer'; result: ComposerResult }
  | { channel: 'none'; reason: 'no-contacts' | 'no-sms' | 'needs-tap' };

/**
 * Texts every trusted contact: by itself where the build and the user allow it (Android APK),
 * otherwise through the Messages app, unless `directOnly` (for texts sent while the screen is
 * locked, such as bug mode's witness messages, where nobody can tap Send).
 */
export async function textTrustedContacts(
  message: string,
  options: { directOnly?: boolean } = {},
  deps: { contacts: () => readonly TrustedContact[]; channels: SmsChannels } = {
    contacts: contactsStore.list,
    channels: phoneChannels,
  },
): Promise<TextOutcome> {
  const phones = deps.contacts().map((c) => c.phone);
  if (phones.length === 0) return { channel: 'none', reason: 'no-contacts' };
  if (await deps.channels.direct.allowed().catch(() => false)) {
    try {
      return { channel: 'direct', results: await deps.channels.direct.send(phones, message) };
    } catch {
      // Fall through to the Messages app.
    }
  }
  if (options.directOnly) return { channel: 'none', reason: 'needs-tap' };
  if (!(await deps.channels.composer.available())) return { channel: 'none', reason: 'no-sms' };
  return { channel: 'composer', result: await deps.channels.composer.send(phones, message) };
}

/** Whether texts can go out with no tap (the Android APK, with SEND_SMS allowed). */
export function canTextWithoutTap(): Promise<boolean> {
  return phoneChannels.direct.allowed().catch(() => false);
}
