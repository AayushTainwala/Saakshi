import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Screen } from '@/components';

import { lockSetting, useLockSetting } from '../lockScreenInstance';

/** The explanation on Saakshi's screen, also handed to Android's own screen (EXTRA_ADD_EXPLANATION). */
const EXPLANATION = ['lock.what', 'lock.nothingElse', 'lock.deleting', 'lock.offHere'] as const;

/**
 * Settings → "Lock the phone when 'My phone is being taken' starts" (SPEC 5.4; round 2, group
 * 1.7). Android only: a plain explanation, then Android's own "Activate device admin app?" screen;
 * switched off here in one step. The real state is read again whenever the page is shown and when
 * Saakshi comes back to the screen, so switching it off in Android's settings shows here as off.
 *
 * The panel without its page is for the first-open walkthrough's phone-protections page (Part 4).
 */
export function LockSettingsPanel() {
  const { t } = useTranslation('sos');
  const state = useLockSetting();

  // Read again when shown; coming back from Android's settings is handled where AppState is watched.
  useEffect(() => lockSetting.refresh(), []);

  if (!state.supported) return null;

  const explanation = EXPLANATION.map((key) => t(key)).join('\n\n');

  return (
    <>
      <AppText variant="heading">{t('lock.heading')}</AppText>
      {EXPLANATION.map((key) => (
        <AppText key={key}>{t(key)}</AppText>
      ))}
      <Card accessibilityLiveRegion="polite">
        <AppText variant="label">{state.on ? t('lock.on') : t('lock.off')}</AppText>
        {state.on ? (
          <Button
            variant="secondary"
            label={t('lock.switchOff')}
            busy={state.busy}
            onPress={() => void lockSetting.switchOff()}
          />
        ) : (
          <>
            <AppText color="textMuted">{t('lock.androidScreen')}</AppText>
            <Button label={t('lock.switchOn')} busy={state.busy} onPress={() => void lockSetting.switchOn(explanation)} />
          </>
        )}
        {state.failed ? <AppText color="danger">{t('lock.failed')}</AppText> : null}
      </Card>
    </>
  );
}

export function LockSettings() {
  return (
    <Screen>
      <LockSettingsPanel />
    </Screen>
  );
}

/** The item in Settings: what it is, whether it is on, and the way in. Nothing on iPhone. */
export function LockSettingsCard() {
  const { t } = useTranslation('sos');
  const state = useLockSetting();

  // Read again when shown; coming back from Android's settings is handled where AppState is watched.
  useEffect(() => lockSetting.refresh(), []);

  if (!state.supported) return null;
  return (
    <Card>
      <AppText variant="heading">{t('lock.heading')}</AppText>
      <AppText>{state.on ? t('lock.on') : t('lock.off')}</AppText>
      <Button variant="secondary" label={t('lock.open')} onPress={() => router.push('/settings/lock')} />
    </Card>
  );
}
