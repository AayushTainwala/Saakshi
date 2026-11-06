import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function SOSLayout() {
  const { t } = useTranslation('sos');
  return (
    <Stack screenOptions={{ headerLargeTitle: true }}>
      <Stack.Screen name="index" options={{ title: t('title') }} />
      <Stack.Screen name="bugmode" options={{ title: t('bug.title'), headerLargeTitle: false }} />
    </Stack>
  );
}
