import { useTranslation } from 'react-i18next';

import { AppText, Screen } from '@/components';

export default function RecordScreen() {
  const { t } = useTranslation('record');
  return (
    <Screen>
      <AppText>{t('intro')}</AppText>
    </Screen>
  );
}
