/**
 * Trusted contacts and SOS by SMS (spec section 5: S1, S2; later S4 and confiscation mode). Owner:
 * Stream B.
 *
 * Public API of this module. Other code imports only from `@/modules/sos`, never from files inside
 * it.
 */
import { contactsStore } from './contacts/fileStore';
import type { TrustedContact } from './contacts/store';

export { alertController, useAlertState } from './alert/instance';
export type { AlertOutcome, AlertState } from './alert/controller';
export type { TrustedContact } from './contacts/store';
export { useTrustedContacts } from './contacts/fileStore';
export { ContactsEditor } from './ui/ContactsEditor';
export { SosHome } from './ui/SosHome';

/**
 * The user's trusted contacts, as stored on the phone, for other features that message them (such
 * as the witness message, E2). Phones are in international form, such as +919876543210.
 */
export async function getTrustedContacts(): Promise<TrustedContact[]> {
  return [...contactsStore.list()];
}
