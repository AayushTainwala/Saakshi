import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CertificateProfile } from '@/modules/evidence';

/** "Your details for certificates", opened from a record's certificate screen. */
export default function CertificateProfileFromRecord() {
  const { t } = useTranslation('record');
  return (
    <>
      <Stack.Screen options={{ title: t('profile.title'), headerLargeTitle: false }} />
      <CertificateProfile />
    </>
  );
}
