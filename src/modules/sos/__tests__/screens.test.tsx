import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import { contactsStore } from '../contacts/fileStore';
import { ContactsEditor } from '../ui/ContactsEditor';
import { SosHome } from '../ui/SosHome';

// Contacts in memory instead of a file on the phone.
jest.mock('../contacts/fileStore', () => {
  const { useSyncExternalStore } = jest.requireActual('react');
  const { ContactsStore } = jest.requireActual('../contacts/store');
  let text: string | null = null;
  let n = 0;
  const store = new ContactsStore({ read: () => text, write: (value: string) => void (text = value) }, () => `id-${++n}`);
  return {
    contactsStore: store,
    useTrustedContacts: () => useSyncExternalStore(store.subscribe, store.list),
  };
});

// Screens are rendered without a navigator.
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    router: { push: jest.fn() },
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});

function wrap(children: React.ReactNode) {
  return <PreferencesProvider initial={{ language: 'en', theme: 'light' }}>{children}</PreferencesProvider>;
}

describe('SOS screens', () => {
  beforeAll(() => {
    initI18n('en');
  });

  beforeEach(() => {
    for (const contact of contactsStore.list()) contactsStore.remove(contact.id);
  });

  it('always offers 112, and asks for contacts before the first alert', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await render(wrap(<SosHome />));
    await fireEvent.press(screen.getByRole('button', { name: 'Call 112' }));
    expect(openURL).toHaveBeenCalledWith('tel:112');
    expect(screen.getByRole('button', { name: 'Add trusted contacts' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Alert my trusted contacts' })).toBeNull();
  });

  it('shows the alert button once someone is added', async () => {
    contactsStore.add({ name: 'Asha', phone: '9876543210' });
    await render(wrap(<SosHome />));
    expect(screen.getByRole('button', { name: 'Alert my trusted contacts' })).toBeTruthy();
    expect(screen.getByText('1 trusted contact: Asha')).toBeTruthy();
  });

  it('adds a typed number, refuses a bad one, and removes', async () => {
    await render(wrap(<ContactsEditor />));

    await fireEvent.changeText(screen.getByLabelText('Phone number'), '12345');
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText("That doesn't look like a phone number.")).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Name (optional)'), 'Asha');
    await fireEvent.changeText(screen.getByLabelText('Phone number'), '98765 43210');
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Asha')).toBeTruthy();
    expect(screen.getByText('+91 98765 43210')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Remove Asha' }));
    expect(screen.queryByText('Asha')).toBeNull();
  });
});
