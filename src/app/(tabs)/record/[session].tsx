import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SessionDetail } from '@/modules/evidence';

export default function SessionScreen() {
  const { session } = useLocalSearchParams<{ session: string }>();
  const { t } = useTranslation('record');
  return (
    <>
      <Stack.Screen options={{ title: t('locker.sessionTitle'), headerLargeTitle: false }} />
      <SessionDetail id={session} />
    </>
  );
}
