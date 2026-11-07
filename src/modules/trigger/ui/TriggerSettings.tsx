import SaakshiSos from '@native/saakshi-sos';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PermissionsAndroid, Platform } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components';

import { quickNotificationText, SOS_ROUTE } from '../listener';

/**
 * Settings → Quick trigger (SPEC 5.1): how to open the SOS screen from outside the app on this
 * phone. Every quick trigger opens the swipe screen; no code is typed to trigger.
 */
export function TriggerSettings() {
  const { t } = useTranslation('sos');
  return (
    <Screen>
      <AppText>{t('trigger.intro')}</AppText>
      <Card>
        <AppText variant="heading">{t('trigger.openHeading')}</AppText>
        {Platform.OS === 'ios' ? <IosInstructions /> : <AndroidTriggers />}
        <Button variant="secondary" label={t('trigger.try')} onPress={() => router.navigate(SOS_ROUTE)} />
      </Card>
    </Screen>
  );
}

function IosInstructions() {
  const { t } = useTranslation('sos');
  return (
    <>
      <AppText>{t('trigger.iosControl')}</AppText>
      <AppText>{t('trigger.iosAction')}</AppText>
      <AppText>{t('trigger.iosWidget')}</AppText>
      <AppText>{t('trigger.iosBackTap')}</AppText>
      <AppText color="textMuted">{t('trigger.iosLocked')}</AppText>
    </>
  );
}

function AndroidTriggers() {
  const { t } = useTranslation('sos');
  const [shown, setShown] = useState(() => !!SaakshiSos?.quickNotificationEnabled());

  const show = async () => {
    if (Number(Platform.Version) >= 33) {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (result !== PermissionsAndroid.RESULTS.GRANTED) return;
    }
    const text = quickNotificationText();
    SaakshiSos?.quickNotificationShow(text.title, text.text, text.action);
    setShown(true);
  };

  const hide = () => {
    SaakshiSos?.quickNotificationHide();
    setShown(false);
  };

  return (
    <>
      <AppText>{t('trigger.androidWidget')}</AppText>
      <AppText variant="label">{t('trigger.androidNotification')}</AppText>
      {shown ? <AppText>{t('trigger.androidNotificationOn')}</AppText> : null}
      <Button
        variant="secondary"
        label={shown ? t('trigger.androidNotificationHide') : t('trigger.androidNotificationOff')}
        onPress={() => (shown ? hide() : void show())}
      />
      <AppText color="textMuted">{t('trigger.androidLocked')}</AppText>
    </>
  );
}
