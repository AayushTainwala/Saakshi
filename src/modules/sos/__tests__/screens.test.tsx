import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import { initI18n } from '@/i18n';
import { liveShare } from '@/modules/location';
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

  /** Lays out a swipe control (343 points wide) and swipes it all the way. */
  async function swipe(testID: string) {
    await fireEvent(screen.getByTestId(testID), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 343, height: 76 } } });
    const handle = screen.getByTestId(`${testID}-handle`);
    const call = (name: string, x: number, previous: number, time: number) =>
      (handle.props[name] as (e: unknown) => unknown)({
        nativeEvent: { touches: [{ pageX: x, pageY: 0 }], changedTouches: [] },
        touchHistory: {
          numberActiveTouches: 1,
          indexOfSingleActiveTouch: 0,
          mostRecentTimeStamp: time,
          touchBank: [
            {
              touchActive: true,
              startPageX: 0,
              startPageY: 0,
              startTimeStamp: 0,
              currentPageX: x,
              currentPageY: 0,
              currentTimeStamp: time,
              previousPageX: previous,
              previousPageY: 0,
              previousTimeStamp: time - 1,
            },
          ],
        },
      });
    await act(async () => {
      call('onStartShouldSetResponderCapture', 0, 0, 1);
      call('onStartShouldSetResponder', 0, 0, 1);
      call('onResponderGrant', 0, 0, 1);
      call('onResponderMove', 150, 0, 2);
      call('onResponderMove', 300, 150, 3);
      call('onResponderRelease', 300, 300, 4);
    });
  }

  it('has only the swipes, Share my location and the quick-trigger link at rest (round 2)', async () => {
    await render(wrap(<SosHome />));
    expect(screen.getByRole('button', { name: "Call 112. Calls India's emergency number" })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'I need help. Alerts your trusted contacts' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Share my location' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Quick trigger setup' }));
    expect(router.push).toHaveBeenCalledWith('/settings/trigger');
    // The old alert button and code pad are gone.
    expect(screen.queryByRole('button', { name: 'Alert my trusted contacts' })).toBeNull();
  });

  it('calls 112 on a full swipe', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await render(wrap(<SosHome />));
    await swipe('swipe-112');
    expect(openURL).toHaveBeenCalledWith('tel:112');
  });

  it('asks for trusted contacts when "I need help" is swiped with nobody to alert', async () => {
    await render(wrap(<SosHome />));
    const start = jest.spyOn(liveShare, 'start');
    await swipe('swipe-help');
    expect(await screen.findByText('You have no trusted contacts for SOS alerts yet.')).toBeTruthy();
    // No location is shared with nobody told.
    expect(start).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Add trusted contacts' }));
    expect(router.push).toHaveBeenCalledWith('/settings/contacts');
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  });

  it('says who to tick when Share my location has nobody ticked for it', async () => {
    const added = contactsStore.add({ name: 'Asha', phone: '9876543210' });
    if (added.ok) contactsStore.setUse(added.contact.id, 'live', false);
    await render(wrap(<SosHome />));
    await fireEvent.press(screen.getByRole('button', { name: 'Share my location' }));
    expect(screen.getByText('Nobody is ticked for live location. Choose who gets it in Settings, Trusted contacts.')).toBeTruthy();
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
