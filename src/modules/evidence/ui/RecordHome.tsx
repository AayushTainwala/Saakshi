import { Link, router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { AppText, Button, Screen } from '@/components';
import { RecoveryCodeReminder } from '@/modules/secretcode';
import { touchTarget } from '@/theme';

import { recoverInterruptedRecordings } from '../capture/recoverDevice';
import { attestIfNeeded } from '../integrity/deviceKey';
import { fileLocker } from '../locker/store';
import { useSessions } from '../locker/useSessions';
import { RecordRow } from './RecordRow';

export function RecordHome() {
  const { t } = useTranslation('record');
  const sessions = useSessions();

  // Create the signing key ahead of the first recording and, on iPhone, retry App Attest until it
  // succeeds (it needs the internet once). Failures are kept in device-key.json, never shown here.
  useEffect(() => {
    attestIfNeeded(fileLocker).catch(() => undefined);
    // Seal anything a crash or forced power-off cut off last time (spec E1).
    recoverInterruptedRecordings().catch(() => undefined);
  }, []);

  return (
    <Screen>
      <AppText>{t('intro')}</AppText>
      <Button label={t('openCamera')} onPress={() => router.push('/capture')} />
      <Button variant="secondary" label={t('bodycam.open')} onPress={() => router.push('/bodycam')} />
      <AppText color="textMuted">{t('bodycam.openHint')}</AppText>
      {/* Pocket recording, sound only, beside body-cam (round 2; it was bug mode on the SOS tab). */}
      <Button variant="secondary" label={t('pocket.open')} onPress={() => router.push('/record/pocket')} />
      <AppText color="textMuted">{t('pocket.openHint')}</AppText>
      {/* On a phone with no screen lock and no recovery code yet, Saakshi asks for one (group 1.6). */}
      <RecoveryCodeReminder />

      <AppText variant="heading">{t('locker.heading')}</AppText>
      {sessions.length === 0 ? <AppText color="textMuted">{t('locker.empty')}</AppText> : null}
      {sessions.map((session) => (
        <Link key={session.id} href={{ pathname: '/record/[session]', params: { session: session.id } }} asChild>
          <Pressable accessibilityRole="button" style={styles.row}>
            {({ pressed }) => <RecordRow session={session} pressed={pressed} />}
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: touchTarget },
});
