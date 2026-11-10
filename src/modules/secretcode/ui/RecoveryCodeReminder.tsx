import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card } from '@/components';

import { useRecoveryWhy, useResetMethod, useSecretCode } from '../instance';
import { openCodeScreen } from '../request';
import { whatIsRunning } from '../running';

/** "Not now" lasts until Saakshi next opens. */
let dismissed = false;

/**
 * Asks for a recovery code to be made (SPEC 5.3; round 2, group 1.6) when a code is set on a phone
 * that resets with one (no screen lock, or Android 7 to 10, group 1.7) and none is kept: the phone
 * lost its passcode after the code was set, the code was set to start "My phone is being taken",
 * when no recovery code is shown, or it was set on Android 7 to 10 before group 1.7. A card, not a
 * dialog, so it never stands in the way, for example when the SOS screen opens from the quick
 * trigger; and not while anything runs. Shown on the Record page, where Saakshi opens.
 */
export function RecoveryCodeReminder() {
  const { t } = useTranslation('secretcode');
  const state = useSecretCode();
  const method = useResetMethod();
  const why = useRecoveryWhy();
  const [hidden, setHidden] = useState(dismissed);

  if (hidden || !state.loaded || !state.set || state.recovery || method !== 'recovery' || whatIsRunning().length > 0) return null;

  return (
    <Card>
      <AppText variant="heading">{t('reminder.heading')}</AppText>
      <AppText>{why === 'old-android' ? t('reminder.bodyOldAndroid') : t('reminder.body')}</AppText>
      <Button label={t('reminder.make')} onPress={() => void openCodeScreen('recovery')} />
      <Button
        variant="secondary"
        label={t('reminder.later')}
        onPress={() => {
          dismissed = true;
          setHidden(true);
        }}
      />
    </Card>
  );
}

/** For tests: as if Saakshi had just opened. */
export function resetRecoveryReminder(): void {
  dismissed = false;
}
