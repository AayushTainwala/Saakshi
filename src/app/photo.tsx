import { Stack, useLocalSearchParams } from 'expo-router';

import { PhotoViewer } from '@/modules/evidence';

export default function Photo() {
  const { session, sequence } = useLocalSearchParams<{ session: string; sequence: string }>();
  return (
    <>
      <Stack.Screen options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <PhotoViewer sessionId={session} sequence={Number(sequence)} />
    </>
  );
}
