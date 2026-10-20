import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function GuidesLayout() {
  const { t } = useTranslation('guides');
  return (
    <Stack screenOptions={{ headerLargeTitle: true }}>
      <Stack.Screen name="index" options={{ title: t('title') }} />
    </Stack>
  );
}
