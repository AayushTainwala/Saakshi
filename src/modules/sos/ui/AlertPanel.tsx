import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText, Button, Card } from '@/components';
import { spacing, useTheme } from '@/theme';

import type { TrustedContact } from '../contacts/store';
import { phoneChannels } from '../alert/channels';
import type { AlertController, AlertOutcome, AlertState } from '../alert/controller';

type Props = {
  controller: AlertController;
  state: AlertState;
  contacts: readonly TrustedContact[];
};

/** The alert button, and what happens after it is pressed. */
export function AlertPanel({ controller, state, contacts }: Props) {
  const { t } = useTranslation('sos');
  const direct = useDirectAllowed(state.phase);

  switch (state.phase) {
    case 'idle':
      return (
        <View style={styles.block}>
          <Button
            variant="primary"
            label={t('alert.button')}
            accessibilityHint={
              direct
                ? t('alert.hintDirect', { count: contacts.length })
                : t('alert.hintComposer', { count: contacts.length })
            }
            onPress={() => void controller.start()}
          />
          <AppText color="textMuted">
            {direct
              ? t('alert.hintDirect', { count: contacts.length })
              : t('alert.hintComposer', { count: contacts.length })}
          </AppText>
        </View>
      );
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
            {state.error === 'no-sms'
              ? t('alert.noSms')
              : t('alert.unexpected', { detail: state.detail ?? '' })}
          </AppText>
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

/** Whether the next alert will send itself; checked on focus and each time the panel is at rest. */
function useDirectAllowed(phase: AlertState['phase']): boolean {
  const [allowed, setAllowed] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (phase !== 'idle') return;
      let live = true;
      phoneChannels.direct
        .allowed()
        .then((value) => live && setAllowed(value))
        .catch(() => undefined);
      return () => {
        live = false;
      };
    }, [phase]),
  );
  return allowed;
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
