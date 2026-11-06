/**
 * Trusted contacts and SOS by SMS (spec section 5: S1, S2; later S4 and confiscation mode). Owner:
 * Stream B.
 *
 * Public API of this module. Other code imports only from `@/modules/sos`, never from files inside
 * it.
 */
import { contactsStore } from './contacts/fileStore';
import { type ContactUse, forUse, type TrustedContact } from './contacts/store';

export { alertController, useAlertState } from './alert/instance';
export { liveInvite, startLiveLocation, stopLiveLocation } from './alert/live';
export { canTextWithoutTap, textTrustedContacts, type TextOutcome } from './alert/text';
export type { AlertOutcome, AlertState, StartOptions } from './alert/controller';
export type { ContactUse, TrustedContact } from './contacts/store';
export { useTrustedContacts } from './contacts/fileStore';
export { ContactsEditor } from './ui/ContactsEditor';
export { SosHome } from './ui/SosHome';

/**
 * The user's trusted contacts, as stored on the phone, for other features that message them (such
 * as the witness message, E2): all of them, or those ticked for one use (fix round 1, group 6).
 * Phones are in international form, such as +919876543210.
 */
export async function getTrustedContacts(use?: ContactUse): Promise<TrustedContact[]> {
  const all = contactsStore.list();
  return use ? forUse(all, use) : [...all];
}
