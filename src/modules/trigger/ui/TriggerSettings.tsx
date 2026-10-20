import SaakshiSos from '@native/saakshi-sos';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PermissionsAndroid, Platform } from 'react-native';

import { AppText, Button, Card, OptionGroup, Screen, TextField } from '@/components';

import { triggerSettings, type TriggerAction, useTriggerSettings } from '../settings';
import { quickNotificationText } from '../listener';

/** Setting the code, what it does, and how to open the pad on this phone (spec S4). */
export function TriggerSettings() {
  const { t } = useTranslation('sos');
  const settings = useTriggerSettings();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const save = () => {
    const problem = triggerSettings.setCode(code.trim());
    if (problem) return setMessage({ text: problem === 'format' ? t('trigger.format') : t('trigger.emergency'), error: true });
    setCode('');
    setMessage({ text: t('trigger.saved'), error: false });
  };

  return (
    <Screen>
      <AppText>{t('trigger.intro')}</AppText>

      <Card>
        <AppText variant="heading">{t('trigger.codeHeading')}</AppText>
        {settings.code ? <AppText>{t('trigger.codeSet')}</AppText> : null}
        <TextField
          label={t('trigger.codeLabel')}
          hint={t('trigger.codeHint')}
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 3))}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={3}
          onSubmitEditing={save}
        />
        <Button label={t('trigger.save')} disabled={code.length === 0} onPress={save} />
        {settings.code ? (
          <Button variant="secondary" label={t('trigger.remove')} onPress={() => triggerSettings.clearCode()} />
        ) : null}
        {message ? (
          <AppText color={message.error ? 'danger' : 'success'} accessibilityLiveRegion="polite">
            {message.text}
          </AppText>
        ) : null}
      </Card>

      <OptionGroup<TriggerAction>
        label={t('trigger.actionHeading')}
        options={[
          { value: 'alert', label: t('trigger.actionAlert') },
          { value: 'confiscation', label: t('trigger.actionConfiscation') },
        ]}
        value={settings.action}
        onChange={(action) => triggerSettings.setAction(action)}
      />

      <Card>
        <AppText variant="heading">{t('trigger.openHeading')}</AppText>
        {Platform.OS === 'ios' ? <IosInstructions /> : <AndroidTriggers />}
        <Button variant="secondary" label={t('trigger.try')} onPress={() => router.push('/codepad')} />
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
      <AppText color="textMuted">{t('trigger.iosFaceId')}</AppText>
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
