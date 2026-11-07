import { act, fireEvent, render, screen } from '@testing-library/react-native';

import SettingsScreen from '@/app/(tabs)/settings';
import i18n, { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));

// The live-location length in memory instead of a file.
jest.mock('@/modules/location', () => {
  const actual = jest.requireActual('@/modules/location');
  const { useSyncExternalStore } = jest.requireActual('react');
  let text: string | null = null;
  const store = new actual.LiveLengthStore({ read: () => text, write: (value: string) => void (text = value) });
  return { ...actual, liveLength: store, useLiveLength: () => useSyncExternalStore(store.subscribe, store.get) };
});

describe('Settings screen', () => {
  beforeAll(() => {
    initI18n('en');
  });

  afterEach(async () => {
    await act(() => i18n.changeLanguage('en'));
  });

  it('switches the whole app to Hindi and back', async () => {
    await render(
      <PreferencesProvider initial={{ language: 'en', theme: 'system' }}>
        <SettingsScreen />
      </PreferencesProvider>,
    );

    expect(screen.getByText('Language')).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: 'हिन्दी' }));
    expect(i18n.language).toBe('hi');
    expect(screen.getByText('भाषा')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'हिन्दी' }).props.accessibilityState.checked).toBe(true);

    await fireEvent.press(screen.getByRole('radio', { name: 'English' }));
    expect(screen.getByText('Language')).toBeTruthy();
  });

  it('switches the theme', async () => {
    await render(
      <PreferencesProvider initial={{ language: 'en', theme: 'system' }}>
        <SettingsScreen />
      </PreferencesProvider>,
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByRole('radio', { name: 'Dark' }).props.accessibilityState.checked).toBe(true);
  });

  it('holds trusted contacts, the live-location length, the secret code and the quick trigger above the rest (round 2)', async () => {
    const { liveLength } = jest.requireMock('@/modules/location') as { liveLength: { get(): number } };
    await render(
      <PreferencesProvider initial={{ language: 'en', theme: 'system' }}>
        <SettingsScreen />
      </PreferencesProvider>,
    );
    const headings = screen.getAllByRole('header').map((h) => h.props.children);
    expect(headings.slice(0, 5)).toEqual(['Trusted contacts', 'Live-location length', 'Secret code', 'Quick trigger', 'Language']);

    await fireEvent.press(screen.getByRole('button', { name: 'Manage trusted contacts' }));
    expect(mockPush).toHaveBeenLastCalledWith('/settings/contacts');
    await fireEvent.press(screen.getByRole('button', { name: 'Set up the quick trigger' }));
    expect(mockPush).toHaveBeenLastCalledWith('/settings/trigger');

    // Four hours unless changed; the choice is kept.
    expect(screen.getByRole('radio', { name: '4 hours' }).props.accessibilityState.checked).toBe(true);
    await fireEvent.press(screen.getByRole('radio', { name: '8 hours' }));
    expect(screen.getByRole('radio', { name: '8 hours' }).props.accessibilityState.checked).toBe(true);
    expect(liveLength.get()).toBe(8);
  });
});
