import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Keyboard, type KeyboardEventName, Platform, ScrollView, TextInput } from 'react-native';

import * as keyboardModule from '@/components/keyboard';
import { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import { contactsStore } from '../contacts/fileStore';
import { ContactsEditor } from '../ui/ContactsEditor';

// Round 2, group 1.1: on the trusted-contacts screen the keyboard covered the name and number
// fields and the Add button. These tests play a small phone: the page from y = 64 to 618, and the
// keyboard's top at 451 (the number pad).

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

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    router: { push: jest.fn() },
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});

type Handler = (event: { endCoordinates: { screenY: number; height: number; screenX: number; width: number } }) => void;
type HostNode = { type: string; props: Record<string, unknown>; children: (HostNode | string)[] };

const page = { y: 64, height: 554 };
const keyboard = { endCoordinates: { screenY: 451, height: 216, screenX: 0, width: 375 } };
// Where the form sits in the page's content (as measured on a phone): the whole group, from its
// heading to Add, and the number field.
const form = { y: 900, height: 344 };
const numberField = { y: 1042, height: 130 };

let handlers: Partial<Record<KeyboardEventName, Handler>>;
let scrollTo: jest.SpyInstance;

function wrap(children: React.ReactNode) {
  return <PreferencesProvider initial={{ language: 'en', theme: 'light' }}>{children}</PreferencesProvider>;
}

function scrollView(): HostNode {
  const find = (node: HostNode | string): HostNode | null => {
    if (typeof node === 'string') return null;
    if (node.type === 'RCTScrollView') return node;
    for (const child of node.children) {
      const found = find(child);
      if (found) return found;
    }
    return null;
  };
  const found = find(screen.root as unknown as HostNode);
  if (!found) throw new Error('no scroll view');
  return found;
}

function bottomPadding(): number {
  const styles = [scrollView().props.contentContainerStyle].flat(Infinity) as ({ paddingBottom?: number } | null)[];
  return styles.reduce<number>((padding, style) => style?.paddingBottom ?? padding, 0);
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

/** Renders the screen; measuring gives a phone's numbers (see `beforeEach`). */
async function renderOnPhone() {
  await render(wrap(<ContactsEditor />));
}

describe('trusted contacts with the keyboard up', () => {
  const realOS = Platform.OS;

  beforeAll(() => {
    initI18n('en');
  });

  beforeEach(() => {
    for (const contact of contactsStore.list()) contactsStore.remove(contact.id);
    handlers = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation((event, handler) => {
      handlers[event] = handler as unknown as Handler;
      return { remove: jest.fn() } as unknown as ReturnType<typeof Keyboard.addListener>;
    });
    const proto = ScrollView.prototype as unknown as Record<string, unknown>;
    jest.spyOn(proto as { getNativeScrollRef: () => unknown }, 'getNativeScrollRef').mockReturnValue({
      measureInWindow: (done: (x: number, y: number, w: number, h: number) => void) => done(0, page.y, 375, page.height),
    });
    jest.spyOn(proto as { getInnerViewRef: () => unknown }, 'getInnerViewRef').mockReturnValue({});
    scrollTo = jest.spyOn(proto as { scrollTo: () => void }, 'scrollTo').mockImplementation(() => undefined);
    // The focused field is the number field; anything else measured is the form's group.
    const focusedInput = { focused: true };
    jest
      .spyOn(TextInput.State, 'currentlyFocusedInput')
      .mockReturnValue(focusedInput as unknown as ReturnType<typeof TextInput.State.currentlyFocusedInput>);
    jest
      .spyOn(keyboardModule, 'measureInContent')
      .mockImplementation(async (node) => ((node as unknown) === focusedInput ? numberField : form));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(Platform, 'OS', { value: realOS, configurable: true });
  });

  for (const os of ['ios', 'android'] as const) {
    it(`scrolls the number field and Add above the number pad, and pads the page (${os})`, async () => {
      Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
      await renderOnPhone();
      expect(bottomPadding()).toBe(0);

      await fireEvent(screen.getByLabelText('Phone number'), 'focus');
      await act(async () => {
        handlers.keyboardWillShow?.(keyboard);
        handlers.keyboardDidShow?.(keyboard);
      });
      await settle();

      // The keyboard covers 167 points of the page, so the page's end is padded by that much (on top
      // of its usual 16), and every contact above can still be scrolled to.
      expect(bottomPadding()).toBe(16 + 167);
      // The form's end (Add) is 16 points above the keyboard, and the number field below the header.
      expect(scrollTo).toHaveBeenLastCalledWith({ y: form.y + form.height + 16 - (keyboard.endCoordinates.screenY - page.y), animated: true });
      const to = (scrollTo.mock.calls.at(-1)?.[0] as { y: number }).y;
      expect(page.y + numberField.y - to).toBeGreaterThanOrEqual(page.y);

      await act(async () => {
        handlers.keyboardWillHide?.(keyboard);
        handlers.keyboardDidHide?.(keyboard);
      });
      expect(bottomPadding()).toBe(0);
    });
  }

  it('lets Add be pressed while the keyboard is up, the first time', async () => {
    await renderOnPhone();
    // Without this, a tap with the keyboard up only closes the keyboard.
    expect(scrollView().props.keyboardShouldPersistTaps).toBe('handled');

    await fireEvent(screen.getByLabelText('Phone number'), 'focus');
    await act(async () => {
      handlers.keyboardWillShow?.(keyboard);
      handlers.keyboardDidShow?.(keyboard);
    });
    await fireEvent.changeText(screen.getByLabelText('Phone number'), '98765 43210');
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('+91 98765 43210')).toBeTruthy();
  });

  it('scrolls again when moving to the next field with the keyboard already up', async () => {
    await renderOnPhone();
    await act(async () => {
      handlers.keyboardWillShow?.(keyboard);
      handlers.keyboardDidShow?.(keyboard);
    });
    await settle();
    scrollTo.mockClear();

    await fireEvent(screen.getByLabelText('Phone number'), 'focus');
    await settle();
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('keeps the form above the keyboard in Hindi too', async () => {
    initI18n('hi');
    try {
      await render(
        <PreferencesProvider initial={{ language: 'hi', theme: 'light' }}>
          <ContactsEditor />
        </PreferencesProvider>,
      );
      await act(async () => {
        handlers.keyboardWillShow?.(keyboard);
        handlers.keyboardDidShow?.(keyboard);
      });
      await settle();
      expect(bottomPadding()).toBe(16 + 167);
      expect(scrollTo).toHaveBeenCalled();
    } finally {
      initI18n('en');
    }
  });
});
