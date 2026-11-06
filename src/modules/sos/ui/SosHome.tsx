import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { Button, Screen, SwipeControl } from '@/components';

import { alertController, startNeedHelp, useAlertState } from '../alert/instance';
import { AlertPanel } from './AlertPanel';
import { LiveLocationCard } from './LiveLocationCard';

/**
 * The SOS page (SPEC 5.1; round 2): three swipes (Call 112, I need help, My phone is being taken),
 * Share my location as a plain button under them, then only what is running and a link to
 * Settings → Quick trigger. `phoneTaken` is the third swipe and `running` its state; both come from
 * the route, since "My phone is being taken" builds on this module.
 */
export function SosHome({ phoneTaken, running }: { phoneTaken?: ReactNode; running?: ReactNode }) {
  const { t } = useTranslation('sos');
  const state = useAlertState();

  return (
    <Screen>
      <SwipeControl
        testID="swipe-112"
        tone="danger"
        label={t('call112')}
        detail={t('call112Hint')}
        confirm={{ title: t('home.call112Confirm.title'), body: t('home.call112Confirm.body'), action: t('call112') }}
        onConfirm={() => void Linking.openURL('tel:112')}
      />
      <SwipeControl
        testID="swipe-help"
        tone="primary"
        label={t('home.help')}
        detail={t('home.helpDetail')}
        confirm={{ title: t('home.helpConfirm.title'), body: t('home.helpConfirm.body'), action: t('home.helpConfirm.action') }}
        // The alert with both links and the battery, and live location for the Settings length.
        onConfirm={() => void startNeedHelp()}
      />
      {phoneTaken}
      <LiveLocationCard />

      <AlertPanel controller={alertController} state={state} />
      {running}

      <Button variant="secondary" label={t('home.quickTrigger')} onPress={() => router.push('/settings/trigger')} />
    </Screen>
  );
}
