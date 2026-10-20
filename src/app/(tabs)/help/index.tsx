import { useTranslation } from 'react-i18next';

import { AppText, Screen } from '@/components';

export default function HelpScreen() {
  const { t } = useTranslation('help');
  return (
    <Screen>
      <AppText>{t('intro')}</AppText>
    </Screen>
  );
}
