import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { AppText, Button, Card } from '@/components';
import { spacing, useTheme } from '@/theme';

import type { AlertController, AlertOutcome, AlertState } from '../alert/controller';

type Props = {
  controller: AlertController;
  state: AlertState;
};

/**
 * What happens after "I need help" is swiped (round 2: the swipe replaces the alert button, so at
 * rest this shows nothing).
 */
export function AlertPanel({ controller, state }: Props) {
  const { t } = useTranslation('sos');

  switch (state.phase) {
    case 'idle':
      return null;
    case 'countdown':
      return (
        <Card accessibilityLiveRegion="assertive">
          <AppText variant="heading">{t('alert.countdown', { count: state.secondsLeft })}</AppText>
          <Button variant="primary" label={t('alert.sendNow')} onPress={() => void controller.sendNow()} />
          <Button variant="secondary" label={t('alert.cancel')} onPress={() => controller.cancel()} />
        </Card>
      );
    case 'locating':
    case 'sending':
      return (
        <Card accessibilityLiveRegion="polite" style={styles.row}>
          <Spinner />
          <AppText variant="label">{state.phase === 'locating' ? t('alert.locating') : t('alert.sending')}</AppText>
        </Card>
      );
    case 'done':
      return <Outcome controller={controller} outcome={state.outcome} />;
    case 'failed':
      return (
        <Card accessibilityLiveRegion="polite">
          <AppText>
            {state.error === 'no-contacts'
              ? t('home.noContacts')
              : state.error === 'no-sms'
                ? t('alert.noSms')
                : t('alert.unexpected', { detail: state.detail ?? '' })}
          </AppText>
          {state.error === 'no-contacts' ? (
            <Button label={t('setup.add')} onPress={() => router.push('/settings/contacts')} />
          ) : null}
          <Button variant="secondary" label={t('alert.done')} onPress={() => controller.dismiss()} />
        </Card>
      );
  }
}

function Outcome({ controller, outcome }: { controller: AlertController; outcome: AlertOutcome }) {
  const { t } = useTranslation('sos');
  const lines: string[] = [];
  let rest = 0;
  let again = false;

  if (outcome.channel === 'direct') {
    const total = outcome.sent.length + outcome.unknown.length + outcome.failed.length;
    const unconfirmed = [...outcome.failed, ...outcome.unknown];
    rest = unconfirmed.length;
    lines.push(
      rest === 0
        ? t('alert.sentAll', { count: total })
        : t('alert.sentSome', { sent: outcome.sent.length, total }),
    );
    if (rest > 0) {
      lines.push(t('alert.notConfirmed', { names: unconfirmed.map((c) => c.name ?? c.phone).join(', ') }));
    }
  } else {
    lines.push(
      outcome.result === 'sent'
        ? t('alert.composerSent')
        : outcome.result === 'cancelled'
          ? t('alert.composerCancelled')
          : t('alert.composerUnknown'),
    );
    again = outcome.result === 'cancelled';
  }
  if (!outcome.located) lines.push(t('alert.noLocation'));

  return (
    <Card accessibilityLiveRegion="polite">
      {lines.map((line) => (
        <AppText key={line}>{line}</AppText>
      ))}
      {rest > 0 ? (
        <Button variant="primary" label={t('alert.sendRest')} onPress={() => void controller.sendRestByComposer()} />
      ) : null}
      {again ? (
        <Button
          variant="primary"
          label={t('alert.again')}
          onPress={() => {
            controller.dismiss();
            void controller.start();
          }}
        />
      ) : null}
      <Button variant="secondary" label={t('alert.done')} onPress={() => controller.dismiss()} />
    </Card>
  );
}

function Spinner() {
  const { colors } = useTheme();
  return <ActivityIndicator color={colors.text} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
