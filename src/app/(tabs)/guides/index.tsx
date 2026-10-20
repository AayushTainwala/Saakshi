import { useTranslation } from 'react-i18next';

import { AppText, Screen } from '@/components';

export default function GuidesScreen() {
  const { t } = useTranslation('guides');
  return (
    <Screen>
      <AppText>{t('intro')}</AppText>
    </Screen>
  );
}
