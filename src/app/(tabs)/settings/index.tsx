import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, OptionGroup, Screen } from '@/components';
import { LIVE_HOURS_CHOICES, type LiveHours, liveLength, useLiveLength } from '@/modules/location';
import { SecretCodeSettings } from '@/modules/secretcode';
import { useTrustedContacts } from '@/modules/sos';
import { usePreferences } from '@/preferences/PreferencesProvider';
import type { LanguagePreference, ThemePreference } from '@/preferences/store';

/**
 * Settings (SPEC 5.8; round 2, group 1.2): trusted contacts (moved from the SOS tab), the
 * live-location length, the secret code and the quick trigger, above the items that were here.
 */
export default function SettingsScreen() {
  const { t } = useTranslation(['settings', 'sos']);
  const { preferences, setLanguage, setTheme } = usePreferences();
  const contacts = useTrustedContacts();
  const hours = useLiveLength();

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
      <Card>
        <AppText variant="heading">{t('contacts.heading')}</AppText>
        <AppText>
          {contacts.length > 0
            ? t('contacts.summary', { ns: 'sos', count: contacts.length, names: contacts.map((c) => c.name ?? c.phone).join(', ') })
            : t('contacts.none')}
        </AppText>
        <Button variant="secondary" label={t('contacts.manage', { ns: 'sos' })} onPress={() => router.push('/settings/contacts')} />
      </Card>

      <AppText variant="heading">{t('live.heading')}</AppText>
      <AppText color="textMuted">{t('live.body')}</AppText>
      <OptionGroup<`${LiveHours}`>
        label={t('live.heading')}
        options={LIVE_HOURS_CHOICES.map((h) => ({ value: `${h}`, label: t('live.hours', { ns: 'sos', count: h }) }))}
        value={`${hours}`}
        onChange={(value) => liveLength.set(Number(value) as LiveHours)}
      />

      <SecretCodeSettings />

      <Card>
        <AppText variant="heading">{t('trigger.heading')}</AppText>
        <AppText>{t('trigger.body')}</AppText>
        <Button variant="secondary" label={t('trigger.open')} onPress={() => router.push('/settings/trigger')} />
      </Card>

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

      <AppText variant="heading">{t('certificates.heading')}</AppText>
      <AppText color="textMuted">{t('certificates.body')}</AppText>
      <Button variant="secondary" label={t('certificates.open')} onPress={() => router.push('/settings/certificate-profile')} />

      <AppText variant="heading">{t('about.heading')}</AppText>
      <Card>
        <AppText>{t('about.version', { version: Constants.expoConfig?.version ?? '' })}</AppText>
        <AppText color="textMuted">{t('about.licence')}</AppText>
      </Card>
    </Screen>
  );
}
