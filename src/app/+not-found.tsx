import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Screen } from '@/components';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <Screen>
      <AppText variant="title">{t('notFound.title')}</AppText>
      <Button label={t('notFound.back')} onPress={() => router.replace('/record')} />
    </Screen>
  );
}
