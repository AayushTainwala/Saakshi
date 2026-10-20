import { Stack } from 'expo-router';

import { CodePad } from '@/modules/trigger';

/** Full screen, without the tab bar, so a trigger opens straight onto the pad. */
export default function CodePadScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false, animation: 'none' }} />
      <CodePad />
    </>
  );
}
