import { useTranslation } from 'react-i18next';

import { AppText, Button, Card } from '@/components';

import { useRecoveryWhy, useResetMethod, useSecretCode } from '../instance';
import { openCodeScreen } from '../request';
import { formatDayIST } from './day';

/**
 * Settings → Secret code: set, change or remove it (each on the code screen). It shows only what
 * is stored, so it changes the moment the code is set, changed or removed (the 6 Nov bug in the old
 * quick-trigger code setting, which kept saying "Code saved" after "Remove code", can't recur).
 *
 * On a phone with no screen lock it also shows the recovery code (round 2, group 1.6): when it was
 * made, or that there is none, and a button to make a new one, which asks for the code first.
 */
export function SecretCodeSettings() {
  const { t } = useTranslation('secretcode');
  const state = useSecretCode();
  const method = useResetMethod();
  const why = useRecoveryWhy();

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
          {method === 'recovery' ? (
            <>
              {state.recovery ? (
                <AppText accessibilityLiveRegion="polite">
                  {state.recoveryMadeAt ? t('settings.recoveryMade', { date: formatDayIST(state.recoveryMadeAt) }) : t('settings.recoveryKept')}
                </AppText>
              ) : (
                <AppText color="warning" accessibilityLiveRegion="polite">
                  {why === 'old-android' ? t('settings.recoveryMissingOldAndroid') : t('settings.recoveryMissing')}
                </AppText>
              )}
              <Button
                variant={state.recovery ? 'secondary' : 'primary'}
                label={state.recovery ? t('settings.recoveryNew') : t('settings.recoveryMake')}
                onPress={() => void openCodeScreen('recovery')}
              />
              {state.recovery ? <AppText color="textMuted">{t('settings.recoveryExplain')}</AppText> : null}
            </>
          ) : method === 'none' ? (
            <AppText color="textMuted">{t('settings.noReset')}</AppText>
          ) : null}
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
