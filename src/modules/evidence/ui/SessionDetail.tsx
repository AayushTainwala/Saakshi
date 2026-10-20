import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, Screen } from '@/components';
import { spacing } from '@/theme';

import { useSession } from '../locker/useSessions';
import { formatIST } from './format';

export function SessionDetail({ id }: { id: string }) {
  const { t } = useTranslation('record');
  const session = useSession(id);

  if (!session) {
    return (
      <Screen>
        <AppText>{t('locker.missing')}</AppText>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="heading">{formatIST(session.createdAt)}</AppText>
      {session.items.map((item) => (
        <Card key={item.sequence}>
          <View style={styles.row}>
            <AppText variant="label">
              {item.segment
                ? t('locker.segment', { clip: item.segment.clip + 1, index: item.segment.index + 1 })
                : t('locker.photo')}
            </AppText>
            <AppText color="textMuted">{formatIST(item.startedAt, true)}</AppText>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xs },
});
