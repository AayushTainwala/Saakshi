import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BodyCamScreen } from '@/modules/evidence';

export default function BodyCam() {
  const { t } = useTranslation('record');
  // The back gesture is off from the moment the screen opens (the root layout sets it before the
  // screen is pushed); while recording, BodyCamScreen also hides the header and refuses to leave.
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('bodycam.title') }} />
      <BodyCamScreen />
    </>
  );
}
