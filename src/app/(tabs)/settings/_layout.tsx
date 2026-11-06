import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function SettingsLayout() {
  const { t } = useTranslation(['settings', 'sos']);
  return (
    <Stack screenOptions={{ headerLargeTitle: true }}>
      <Stack.Screen name="index" options={{ title: t('title') }} />
      {/* Moved from the SOS tab in round 2 (SPEC 5.8). */}
      <Stack.Screen name="contacts" options={{ title: t('contacts.title', { ns: 'sos' }), headerLargeTitle: false }} />
      <Stack.Screen name="trigger" options={{ title: t('trigger.title', { ns: 'sos' }), headerLargeTitle: false }} />
    </Stack>
  );
}
