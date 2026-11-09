import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, SwipeControl } from '@/components';
import { useBugMode } from '@/modules/bugmode';
import { useLiveShare } from '@/modules/location';
import { openCodeScreen } from '@/modules/secretcode';

import { phoneTaken, usePhoneTaken } from '../phoneTakenInstance';

function timeIST(iso: string): string {
  const d = new Date(Date.parse(iso) + 330 * 60 * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} IST`;
}

/**
 * The third swipe on the SOS page (SPEC 5.1, 5.4). Until a secret code is set it can't start: the
 * swipe explains why and offers to set one, and once it is set, the mode starts (built so: the
 * swipe already said what the user wants).
 */
export function PhoneTakenSwipe() {
  const { t } = useTranslation('sos');
  const state = usePhoneTaken();
  const [needsCode, setNeedsCode] = useState(false);

  if (state.active) return null;

  const start = async () => {
    setNeedsCode(false);
    if ((await phoneTaken.start()) === 'no-code') setNeedsCode(true);
  };

  const setCode = async () => {
    // Set to start the mode at once: no recovery code is shown now (Saakshi asks for one later).
    if (await openCodeScreen('set', 'phone-taken')) await start();
  };

  return (
    <>
      <SwipeControl
        testID="swipe-taken"
        tone="secondary"
        label={t('taken.label')}
        detail={t('taken.detail')}
        confirm={{ title: t('taken.confirm.title'), body: t('taken.confirm.body'), action: t('taken.confirm.action') }}
        onConfirm={() => void start()}
      />
      {needsCode ? (
        <Card accessibilityLiveRegion="polite">
          <AppText variant="heading">{t('taken.needsCode.heading')}</AppText>
          <AppText>{t('taken.needsCode.body')}</AppText>
          <Button label={t('taken.needsCode.set')} onPress={() => void setCode()} />
        </Card>
      ) : null}
    </>
  );
}

/** What "My phone is being taken" is doing, in plain words, and its Stop (the code screen). */
export function PhoneTakenStatus() {
  const { t } = useTranslation('sos');
  const state = usePhoneTaken();
  const bug = useBugMode();
  const share = useLiveShare();
  const [busy, setBusy] = useState(false);

  if (!state.active) return null;

  // What is really running: a part stopped on its own (with the code) shows as stopped.
  const actual = (running: boolean, part: typeof state.pocket) => (running ? 'on' : part === 'on' ? 'off' : part);
  const pocket = actual(bug.running, state.pocket);
  const live = actual(!!share, state.live);
  const lastError = (part: 'live' | 'pocket' | 'alert') => [...state.errors].reverse().find((e) => e.part === part)?.message ?? '';

  const stop = async () => {
    setBusy(true);
    try {
      await phoneTaken.stop();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card accessibilityLiveRegion="polite">
      <AppText variant="heading">{t('taken.on')}</AppText>
      {state.startedAt ? <AppText color="textMuted">{t('taken.since', { time: timeIST(state.startedAt) })}</AppText> : null}

      <AppText>
        {pocket === 'on'
          ? t('taken.pocketOn')
          : pocket === 'failed'
            ? t('taken.pocketFailed', { detail: lastError('pocket') })
            : pocket === 'off'
              ? t('taken.pocketOff')
              : t('taken.pocketStarting')}
      </AppText>
      {pocket === 'failed' || pocket === 'off' ? <Button variant="secondary" label={t('taken.retryPocket')} onPress={() => void phoneTaken.retry('pocket')} /> : null}

      <AppText>
        {live === 'on'
          ? t('taken.liveOn')
          : live === 'failed'
            ? t('taken.liveFailed', { detail: lastError('live') })
            : live === 'off'
              ? t('taken.liveOff')
              : t('taken.liveStarting')}
      </AppText>
      {live === 'failed' || live === 'off' ? <Button variant="secondary" label={t('taken.retryLive')} onPress={() => void phoneTaken.retry('live')} /> : null}

      {state.alert ? (
        <AppText>
          {state.alert === 'sent'
            ? t('taken.alertSent')
            : state.alert === 'failed'
              ? t('taken.alertFailed', { detail: lastError('alert') })
              : t('taken.alertSending')}
        </AppText>
      ) : null}

      <AppText color="textMuted">{t('taken.stopNote')}</AppText>
      <Button variant="danger" label={t('taken.stop')} busy={busy} onPress={() => void stop()} />
    </Card>
  );
}
