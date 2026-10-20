import { Link, router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components';
import { spacing, touchTarget, useTheme } from '@/theme';

import { recoverInterruptedRecordings } from '../capture/recoverDevice';
import { attestIfNeeded } from '../integrity/deviceKey';
import { fileLocker } from '../locker/store';
import { useSessions } from '../locker/useSessions';
import { formatIST } from './format';

export function RecordHome() {
  const { t } = useTranslation('record');
  const { colors } = useTheme();
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

      <AppText variant="heading">{t('locker.heading')}</AppText>
      {sessions.length === 0 ? <AppText color="textMuted">{t('locker.empty')}</AppText> : null}
      {sessions.map((session) => (
        <Link key={session.id} href={{ pathname: '/record/[session]', params: { session: session.id } }} asChild>
          <Pressable accessibilityRole="button" style={styles.row}>
            {({ pressed }) => (
              <Card style={[styles.card, pressed && { backgroundColor: colors.surfaceRaised }]}>
                <View style={styles.cardText}>
                  <AppText variant="label">{formatIST(session.createdAt)}</AppText>
                  <AppText color="textMuted">{t('locker.files', { count: session.items.length })}</AppText>
                </View>
                <AppText variant="label" color="textMuted">
                  ›
                </AppText>
              </Card>
            )}
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: touchTarget },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardText: { flex: 1, gap: spacing.xs },
});
