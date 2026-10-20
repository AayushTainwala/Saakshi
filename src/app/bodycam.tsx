import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BodyCamScreen } from '@/modules/evidence';

export default function BodyCam() {
  const { t } = useTranslation('record');
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('bodycam.title'), presentation: 'fullScreenModal', gestureEnabled: false }} />
      <BodyCamScreen />
    </>
  );
}
