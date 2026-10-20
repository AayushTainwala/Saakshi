import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components';
import { spacing, touchTarget, useTheme } from '@/theme';

import { useSessions } from '../locker/useSessions';
import { formatIST } from './format';

export function RecordHome() {
  const { t } = useTranslation('record');
  const { colors } = useTheme();
  const sessions = useSessions();

  return (
    <Screen>
      <AppText>{t('intro')}</AppText>
      <Button label={t('openCamera')} onPress={() => router.push('/capture')} />

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
