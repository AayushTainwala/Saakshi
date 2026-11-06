import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card } from '@/components';
import { LocationDeniedError, useLiveLength, useLiveShare } from '@/modules/location';

import { liveInvite, startLiveLocation, stopLiveLocation } from '../alert/live';
import { textTrustedContacts } from '../alert/text';
import { formatTimeIST } from '../alert/time';

/** Live location by link (S3): start, see its state, send the link again, stop. */
export function LiveLocationCard({ hasContacts }: { hasContacts: boolean }) {
  const { t } = useTranslation('sos');
  const share = useLiveShare();
  // Settings → Live-location length (SPEC 5.8), 4 hours by default.
  const hours = useLiveLength();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await startLiveLocation(hours);
    } catch (e) {
      setError(
        e instanceof LocationDeniedError
          ? t('live.denied')
          : t('live.failed', { detail: e instanceof Error ? e.message : String(e) }),
      );
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    await stopLiveLocation().finally(() => setBusy(false));
  };

  return (
    <Card>
      <AppText variant="heading">{t('live.heading')}</AppText>
      {share ? (
        <>
          <AppText variant="label">{t('live.active', { time: formatTimeIST(share.expiresAt) })}</AppText>
          <AppText>{share.lastSentAt ? t('live.lastSent', { time: formatTimeIST(share.lastSentAt) }) : t('live.waiting')}</AppText>
          {share.pending.length > 0 ? (
            <AppText color="textMuted">{t('live.pending', { count: share.pending.length })}</AppText>
          ) : null}
          <Button
            variant="secondary"
            label={t('live.sendLink')}
            disabled={!hasContacts}
            onPress={() => void textTrustedContacts(liveInvite(share), { use: 'live' })}
          />
          <Button variant="danger" label={t('live.stop')} busy={busy} onPress={() => void stop()} />
        </>
      ) : (
        <>
          <AppText>{t('live.body')}</AppText>
          <AppText color="textMuted">{t('live.length', { hours: t('live.hours', { count: hours }) })}</AppText>
          <Button label={busy ? t('live.starting') : t('live.start')} busy={busy} disabled={!hasContacts} onPress={() => void start()} />
        </>
      )}
      {error ? (
        <AppText color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </Card>
  );
}
