import { Stack } from 'expo-router';

import { CaptureScreen } from '@/modules/evidence';

export default function Capture() {
  return (
    <>
      <Stack.Screen options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <CaptureScreen />
    </>
  );
}
