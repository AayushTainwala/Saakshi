import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';

import { AppText, Card, OptionGroup, Screen } from '@/components';
import { usePreferences } from '@/preferences/PreferencesProvider';
import type { LanguagePreference, ThemePreference } from '@/preferences/store';

export default function SettingsScreen() {
  const { t } = useTranslation('settings');
  const { preferences, setLanguage, setTheme } = usePreferences();

  const languages: { value: LanguagePreference; label: string }[] = [
    { value: 'system', label: t('language.system') },
    { value: 'en', label: t('language.en') },
    { value: 'hi', label: t('language.hi') },
  ];
  const themes: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: t('theme.system') },
    { value: 'light', label: t('theme.light') },
    { value: 'dark', label: t('theme.dark') },
  ];

  return (
    <Screen>
      <AppText variant="heading">{t('language.heading')}</AppText>
      <OptionGroup
        label={t('language.heading')}
        options={languages}
        value={preferences.language}
        onChange={setLanguage}
      />

      <AppText variant="heading">{t('theme.heading')}</AppText>
      <OptionGroup
        label={t('theme.heading')}
        options={themes}
        value={preferences.theme}
        onChange={setTheme}
      />

      <AppText variant="heading">{t('about.heading')}</AppText>
      <Card>
        <AppText>{t('about.version', { version: Constants.expoConfig?.version ?? '' })}</AppText>
        <AppText color="textMuted">{t('about.licence')}</AppText>
      </Card>
    </Screen>
  );
}
