import { Linking } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Screen } from '@/components';

export default function SOSScreen() {
  const { t } = useTranslation('sos');
  return (
    <Screen>
      <AppText>{t('intro')}</AppText>
      <Button
        variant="danger"
        label={t('call112')}
        accessibilityHint={t('call112Hint')}
        onPress={() => Linking.openURL('tel:112')}
      />
    </Screen>
  );
}
