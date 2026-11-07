import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card } from '@/components';
import { LocationDeniedError, useLiveLength, useLiveShare } from '@/modules/location';

import { liveInvite, startLiveLocation, stopLiveLocation } from '../alert/live';
import { textTrustedContacts } from '../alert/text';
import { formatTimeIST } from '../alert/time';
import { useTrustedContacts } from '../contacts/fileStore';
import { forUse } from '../contacts/store';

/**
 * Share my location (SPEC 5.1, 5.2): a plain button under the swipes (built so) that starts live
 * location for the Settings length and texts the link to the people ticked for live location. While
 * a share runs, it shows what is running, sends the link again, and stops it.
 */
export function LiveLocationCard() {
  const { t } = useTranslation('sos');
  const share = useLiveShare();
  const contacts = useTrustedContacts();
  // Settings → Live-location length (SPEC 5.8), 4 hours by default.
  const hours = useLiveLength();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'none-ticked' | string | null>(null);
  const ticked = forUse(contacts, 'live');

  const start = async () => {
    setError(null);
    if (ticked.length === 0) return setError('none-ticked');
    setBusy(true);
    try {
      await startLiveLocation(hours);
    } catch (e) {
      setError(
        e instanceof LocationDeniedError ? t('live.denied') : t('live.failed', { detail: e instanceof Error ? e.message : String(e) }),
      );
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    await stopLiveLocation().finally(() => setBusy(false));
  };

  const problem =
    error === 'none-ticked' ? (
      <>
        <AppText color="danger" accessibilityLiveRegion="polite">
          {t('home.noLive')}
        </AppText>
        <Button variant="secondary" label={t('contacts.title')} onPress={() => router.push('/settings/contacts')} />
      </>
    ) : error ? (
      <AppText color="danger" accessibilityLiveRegion="polite">
        {error}
      </AppText>
    ) : null;

  if (!share) {
    return (
      <>
        <Button variant="secondary" label={busy ? t('live.starting') : t('home.share')} busy={busy} onPress={() => void start()} />
        {problem}
      </>
    );
  }

  return (
    <Card>
      <AppText variant="heading">{t('live.heading')}</AppText>
      <AppText variant="label">{t('live.active', { time: formatTimeIST(share.expiresAt) })}</AppText>
      <AppText>{share.lastSentAt ? t('live.lastSent', { time: formatTimeIST(share.lastSentAt) }) : t('live.waiting')}</AppText>
      {share.pending.length > 0 ? <AppText color="textMuted">{t('live.pending', { count: share.pending.length })}</AppText> : null}
      <Button
        variant="secondary"
        label={t('live.sendLink')}
        disabled={ticked.length === 0}
        onPress={() => void textTrustedContacts(liveInvite(share), { use: 'live' })}
      />
      <Button variant="danger" label={t('live.stop')} busy={busy} onPress={() => void stop()} />
      {problem}
    </Card>
  );
}
