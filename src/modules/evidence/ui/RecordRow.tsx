import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Card } from '@/components';
import { radius, spacing, useTheme } from '@/theme';

import { isActive } from '../locker/active';
import { recordModeOf } from '../locker/records';
import { summarize } from '../locker/summary';
import { useThumbnail } from '../locker/thumbnails';
import type { EvidenceItem, SessionState } from '../types';
import { formatIST } from './format';
import { kindLabel, lengthLabel } from './labels';

const SIZE = 64;

/** A photo or a video's first frame, turned upright (Android .ts files carry their turn in the record). */
export function Thumbnail({ sessionId, item, size = SIZE }: { sessionId: string; item: EvidenceItem | null; size?: number }) {
  const { colors } = useTheme();
  const uri = useThumbnail(sessionId, item);
  const turn = item?.kind === 'video' && item.rotationDegrees ? item.rotationDegrees : 0;
  return (
    <View style={[styles.thumb, { width: size, height: size, backgroundColor: colors.surfaceRaised }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, turn ? { transform: [{ rotate: `${turn}deg` }] } : null]}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

/** One record in the Record tab's list (fix round 1, group 3): what it is, its picture, start and length. */
export function RecordRow({ session, pressed }: { session: SessionState; pressed: boolean }) {
  const { t } = useTranslation('record');
  const { colors } = useTheme();
  const summary = summarize(session, (item) => recordModeOf(session.id, item));
  const recording = isActive(session.id);
  const kind = kindLabel(t, summary);
  const title = summary.lengthMs !== null && !recording ? t('list.summary', { kind, length: lengthLabel(t, summary.lengthMs) }) : kind;
  return (
    <Card style={[styles.card, pressed && { backgroundColor: colors.surfaceRaised }]}>
      {summary.kind === 'bug' ? null : <Thumbnail sessionId={session.id} item={summary.thumbnail} />}
      <View style={styles.text}>
        <AppText variant="label">{title}</AppText>
        <AppText color="textMuted">{t('list.started', { time: formatIST(summary.startedAt) })}</AppText>
        {recording ? <AppText color="warning">{t('list.recording')}</AppText> : null}
      </View>
      <AppText variant="label" color="textMuted">
        ›
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: spacing.xs },
  thumb: { borderRadius: radius.sm, overflow: 'hidden' },
});
