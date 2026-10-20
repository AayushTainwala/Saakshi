import { randomUUID } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';

import { ContactsStore, type TrustedContact } from './store';

const FILE_NAME = 'sos-contacts.json';

/** The app's trusted contacts, in a JSON file in its private documents directory. */
export const contactsStore = new ContactsStore(
  {
    read() {
      const file = new File(Paths.document, FILE_NAME);
      return file.exists ? file.textSync() : null;
    },
    write(text) {
      const file = new File(Paths.document, FILE_NAME);
      if (!file.exists) file.create();
      file.writeSync(text);
    },
  },
  randomUUID,
);

export function useTrustedContacts(): readonly TrustedContact[] {
  return useSyncExternalStore(contactsStore.subscribe, contactsStore.list);
}
