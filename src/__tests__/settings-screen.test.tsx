import { act, fireEvent, render, screen } from '@testing-library/react-native';

import SettingsScreen from '@/app/(tabs)/settings';
import i18n, { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

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
});
