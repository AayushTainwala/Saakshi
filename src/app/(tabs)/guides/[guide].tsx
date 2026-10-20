import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { findGuide, GuideDetail } from '@/modules/guides';

export default function GuideScreen() {
  const { guide } = useLocalSearchParams<{ guide: string }>();
  const { t, i18n } = useTranslation('guides');
  const found = findGuide(guide);
  const title = found ? (i18n.language === 'hi' ? found.title.hi : found.title.en) : t('title');
  return (
    <>
      <Stack.Screen options={{ title, headerLargeTitle: false }} />
      <GuideDetail id={guide} />
    </>
  );
}
