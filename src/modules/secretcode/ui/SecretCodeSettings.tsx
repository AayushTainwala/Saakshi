import { useTranslation } from 'react-i18next';

import { AppText, Button, Card } from '@/components';

import { useSecretCode } from '../instance';
import { openCodeScreen } from '../request';

/**
 * Settings → Secret code: set, change or remove it (each on the code screen). It shows only what
 * is stored, so it changes the moment the code is set, changed or removed (the 6 Nov bug in the old
 * quick-trigger code setting, which kept saying "Code saved" after "Remove code", can't recur).
 */
export function SecretCodeSettings() {
  const { t } = useTranslation('secretcode');
  const state = useSecretCode();

  return (
    <Card>
      <AppText variant="heading">{t('settings.heading')}</AppText>
      <AppText>{t('settings.body')}</AppText>
      {!state.loaded ? (
        <AppText color="textMuted">{t('loading')}</AppText>
      ) : state.set ? (
        <>
          <AppText variant="label" accessibilityLiveRegion="polite">
            {t('settings.isSet')}
          </AppText>
          <Button variant="secondary" label={t('settings.change')} onPress={() => void openCodeScreen('change')} />
          <Button variant="secondary" label={t('settings.remove')} onPress={() => void openCodeScreen('remove')} />
        </>
      ) : (
        <>
          <AppText variant="label" color="warning" accessibilityLiveRegion="polite">
            {t('settings.notSet')}
          </AppText>
          <Button label={t('settings.set')} onPress={() => void openCodeScreen('set')} />
        </>
      )}
    </Card>
  );
}
