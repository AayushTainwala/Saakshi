import { router, Stack, useLocalSearchParams } from 'expo-router';

import { type CodeScreenMode, type Protected, SecretCodeRoute } from '@/modules/secretcode';

const MODES: readonly CodeScreenMode[] = ['confirm', 'set', 'change', 'remove'];
const PROTECTED: readonly Protected[] = ['body-cam', 'pocket-recording', 'live-location', 'phone-taken'];

/** The one code screen (round 2, group 1.2), full screen without the tab bar. */
export default function SecretCodeScreen() {
  const params = useLocalSearchParams<{ mode?: string; reason?: string; request?: string }>();
  const mode = MODES.includes(params.mode as CodeScreenMode) ? (params.mode as CodeScreenMode) : 'confirm';
  const reason = PROTECTED.includes(params.reason as Protected) ? (params.reason as Protected) : undefined;
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SecretCodeRoute
        mode={mode}
        reason={reason}
        request={params.request}
        close={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
      />
    </>
  );
}
