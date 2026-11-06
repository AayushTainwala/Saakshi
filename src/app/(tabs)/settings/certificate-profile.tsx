import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CertificateProfile } from '@/modules/evidence';

/** "Your details for certificates", in Settings. */
export default function CertificateProfileInSettings() {
  const { t } = useTranslation('record');
  return (
    <>
      <Stack.Screen options={{ title: t('profile.title'), headerLargeTitle: false }} />
      <CertificateProfile />
    </>
  );
}
