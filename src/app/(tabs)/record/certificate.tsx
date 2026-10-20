import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CertificateForm } from '@/modules/evidence';

export default function CertificateScreen() {
  const { session } = useLocalSearchParams<{ session: string }>();
  const { t } = useTranslation('record');
  return (
    <>
      <Stack.Screen options={{ title: t('certificate.title'), headerLargeTitle: false }} />
      <CertificateForm sessionId={session} />
    </>
  );
}
