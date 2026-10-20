import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components';
import { spacing } from '@/theme';

import { shareBundle } from '../export/bundle';
import { runCheck } from '../locker/actions';
import { useSession } from '../locker/useSessions';
import type { EvidenceItem, SessionState } from '../types';
import { formatBytes, formatIST } from './format';

export function chainHeadOf(session: SessionState): string | null {
  const sealed = session.items.filter((item) => item.status === 'sealed');
  return sealed.length ? (sealed[sealed.length - 1].recordSha256 ?? null) : null;
}

function StatusRow({ done, label, detail }: { done: boolean; label: string; detail?: string }) {
  return (
    <View style={styles.statusRow} accessible accessibilityLabel={[label, detail].filter(Boolean).join(', ')}>
      <AppText variant="label" color={done ? 'success' : 'textMuted'} style={styles.mark}>
        {done ? '✓' : '–'}
      </AppText>
      <View style={styles.statusText}>
        <AppText variant="label">{label}</AppText>
        {detail ? <AppText color="textMuted">{detail}</AppText> : null}
      </View>
    </View>
  );
}

function ItemCard({ item }: { item: EvidenceItem }) {
  const { t } = useTranslation('record');
  const status =
    item.status === 'sealed'
      ? t('locker.itemSealed')
      : item.status === 'failed'
        ? t('locker.itemFailed', { error: item.error ?? '' })
        : t('locker.itemPending');
  return (
    <Card>
      <AppText variant="label">
        {item.segment
          ? t('locker.segment', { clip: item.segment.clip + 1, index: item.segment.index + 1 })
          : t('locker.photo')}
      </AppText>
      <AppText color="textMuted">
        {formatIST(item.startedAt, true)}
        {item.digests ? ` · ${formatBytes(item.digests.size)}` : ''}
      </AppText>
      <AppText color={item.status === 'failed' ? 'danger' : item.status === 'sealed' ? 'success' : 'textMuted'}>
        {status}
      </AppText>
      {item.digests ? (
        <AppText variant="mono" selectable accessibilityLabel={t('locker.sha256')}>
          SHA-256 {item.digests.sha256}
        </AppText>
      ) : null}
    </Card>
  );
}

export function SessionDetail({ id }: { id: string }) {
  const { t } = useTranslation('record');
  const session = useSession(id);
  const [checking, setChecking] = useState(false);
  const [exporting, setExporting] = useState(false);

  if (!session) {
    return (
      <Screen>
        <AppText>{t('locker.missing')}</AppText>
      </Screen>
    );
  }

  const sealed = session.items.filter((item) => item.status === 'sealed').length;
  const head = chainHeadOf(session);
  const lastWitness = session.witness[session.witness.length - 1];

  const check = async () => {
    setChecking(true);
    try {
      const result = await runCheck(id);
      Alert.alert(
        result.ok ? t('locker.checkOkTitle') : t('locker.checkProblemTitle'),
        result.ok ? t('locker.checkOkBody') : t('locker.checkProblemBody', { count: result.problems.length }),
      );
    } catch (error) {
      Alert.alert(t('locker.errorTitle'), error instanceof Error ? error.message : String(error));
    } finally {
      setChecking(false);
    }
  };

  const exportBundle = async () => {
    setExporting(true);
    try {
      await shareBundle(id, t('locker.exportDialog'));
    } catch (error) {
      Alert.alert(t('locker.errorTitle'), error instanceof Error ? error.message : String(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen>
      <AppText variant="heading">{formatIST(session.createdAt)}</AppText>

      <Card>
        <StatusRow
          done={sealed > 0 && sealed === session.items.length}
          label={t('locker.statusSealed')}
          detail={t('locker.statusSealedDetail', { sealed, total: session.items.length })}
        />
        <StatusRow
          done={!!session.lastCheck?.ok}
          label={t('locker.statusChecked')}
          detail={
            session.lastCheck
              ? session.lastCheck.ok
                ? t('locker.checkedOk', { time: formatIST(session.lastCheck.at) })
                : t('locker.checkedProblems', { time: formatIST(session.lastCheck.at), count: session.lastCheck.problems.length })
              : t('locker.notYet')
          }
        />
        <StatusRow
          done={!!lastWitness}
          label={t('locker.statusWitness')}
          detail={lastWitness ? formatIST(lastWitness.sentAt) : t('locker.notYet')}
        />
        <StatusRow
          done={!!session.certificate}
          label={t('locker.statusCertificate')}
          detail={session.certificate ? formatIST(session.certificate.createdAt) : t('locker.notYet')}
        />
      </Card>

      <Button label={t('locker.export')} busy={exporting} disabled={sealed === 0} onPress={exportBundle} />
      <Button variant="secondary" label={t('locker.check')} busy={checking} disabled={sealed === 0} onPress={check} />

      {head ? (
        <Card>
          <AppText variant="label">{t('locker.chainHead')}</AppText>
          <AppText color="textMuted">{t('locker.chainHeadHelp')}</AppText>
          <AppText variant="mono" selectable>
            {head}
          </AppText>
        </Card>
      ) : null}

      <AppText variant="heading">{t('locker.filesHeading')}</AppText>
      {session.items.map((item) => (
        <ItemCard key={item.sequence} item={item} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingVertical: spacing.xs },
  mark: { width: 24, textAlign: 'center' },
  statusText: { flex: 1, gap: 2 },
});
