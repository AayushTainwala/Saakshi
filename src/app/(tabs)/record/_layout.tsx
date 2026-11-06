import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function RecordLayout() {
  const { t } = useTranslation(['record', 'sos']);
  return (
    <Stack screenOptions={{ headerLargeTitle: true }}>
      <Stack.Screen name="index" options={{ title: t('title') }} />
      {/* Moved from the SOS tab in round 2 (SPEC E8). */}
      <Stack.Screen name="pocket" options={{ title: t('bug.title', { ns: 'sos' }), headerLargeTitle: false }} />
    </Stack>
  );
}
