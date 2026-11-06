import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components';
import { getTrustedContacts } from '@/modules/sos';
import { spacing } from '@/theme';

import { lastLink } from '../capture/pipeline';
import { BundleBusyError, shareBundle } from '../export/bundle';
import { type ExportFolder, exportToFolder, pickExportFolder, readExportFolder, saveExportFolder } from '../export/folder';
import { JoinError } from '../export/joinedCopy';
import { shareKind, shareTarget } from '../export/shareTarget';
import { needsCopy, playVideo, shareFile, shareJoinedCopy } from '../export/videoActions';
import { runCheck } from '../locker/actions';
import { deleteSession, SessionBusyError } from '../locker/delete';
import { fileLocker } from '../locker/store';
import { recordModeOf } from '../locker/records';
import { summarize } from '../locker/summary';
import { useSession } from '../locker/useSessions';
import { sendWitnessMessage, SmsUnavailableError } from '../witness/send';
import type { EvidenceItem, MediaKind, SessionState } from '../types';
import { formatBytes, formatIST } from './format';
import { endReasonLabel } from './endReasons';
import { kindLabel, lengthLabel } from './labels';
import { RecordingPlayer } from './RecordingPlayer';
import { Thumbnail } from './RecordRow';

export function chainHeadOf(session: SessionState): string | null {
  return lastLink(session)?.recordSha256 ?? null;
}

const SHARE_WORD = { video: 'share.video', photo: 'share.photo', audio: 'share.sound' } as const satisfies Record<MediaKind, string>;

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

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

function ItemCard({ item, session }: { item: EvidenceItem; session: SessionState }) {
  const { t } = useTranslation('record');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const copy = session.copies?.[String(item.sequence)];
  const isVideo = item.kind === 'video' && item.status === 'sealed';
  const inLocker = item.status === 'sealed' || item.status === 'hashed';
  const ended = item.kind === 'photo' ? null : endReasonLabel(t, item);
  const openPhoto = () => router.push({ pathname: '/photo', params: { session: session.id, sequence: String(item.sequence) } });

  const [sharing, setSharing] = useState(false);
  const run = async (action: () => Promise<void>, setRunning: (running: boolean) => void = setBusy) => {
    setRunning(true);
    try {
      await action();
    } catch (error) {
      Alert.alert(t('locker.errorTitle'), message(error));
    } finally {
      setRunning(false);
    }
  };

  // A playable file through the share sheet: the original, or an Android video's MP4 copy (group 9).
  const shareWord = t(SHARE_WORD[item.kind]);
  const shareButton =
    item.status === 'sealed' ? (
      <Button
        variant="secondary"
        label={shareWord}
        busy={sharing}
        disabled={busy}
        onPress={() => void run(() => shareFile(session.id, item, shareWord), setSharing)}
      />
    ) : null;

  const status =
    item.status === 'sealed'
      ? t('locker.itemSealed')
      : item.status === 'failed'
        ? t('locker.itemFailed', { error: item.error ?? '' })
        : t('locker.itemPending');
  return (
    <Card>
      {inLocker && (item.kind === 'photo' || item.kind === 'video') ? (
        item.kind === 'photo' ? (
          <Pressable accessibilityRole="imagebutton" accessibilityLabel={t('photo.open')} onPress={openPhoto}>
            <Thumbnail sessionId={session.id} item={item} size={96} />
          </Pressable>
        ) : (
          <Thumbnail sessionId={session.id} item={item} size={96} />
        )
      ) : null}
      <AppText variant="label">
        {item.segment
          ? t(item.kind === 'audio' ? 'locker.audioSegment' : 'locker.segment', {
              clip: item.segment.clip + 1,
              index: item.segment.index + 1,
            })
          : t(item.kind === 'video' ? 'locker.video' : item.kind === 'audio' ? 'locker.audio' : 'locker.photo')}
      </AppText>
      <AppText color="textMuted">
        {formatIST(item.startedAt, true)}
        {item.digests ? ` · ${formatBytes(item.digests.size)}` : ''}
      </AppText>
      <AppText color={item.status === 'failed' ? 'danger' : item.status === 'sealed' ? 'success' : 'textMuted'}>
        {status}
      </AppText>
      {ended ? <AppText color={item.interrupted ? 'warning' : 'textMuted'}>{t('ended.label', { reason: ended })}</AppText> : null}
      {item.digests ? (
        <AppText variant="mono" selectable accessibilityLabel={t('locker.sha256')}>
          SHA-256 {item.digests.sha256}
        </AppText>
      ) : null}
      {copy ? (
        <AppText color="textMuted" selectable>
          {t('video.copyMade', { sha256: copy.sha256 })}
        </AppText>
      ) : null}
      {item.kind === 'photo' && inLocker ? <Button variant="secondary" label={t('photo.open')} onPress={openPhoto} /> : null}
      {item.kind === 'photo' ? shareButton : null}
      {item.kind === 'audio' && inLocker ? (
        listening ? (
          <View style={styles.videoButtons}>
            <RecordingPlayer sessionId={session.id} items={[item]} autoPlay showParts={false} />
            <Button variant="secondary" label={t('player.closeSound')} onPress={() => setListening(false)} />
          </View>
        ) : (
          <Button variant="secondary" label={t('player.playSound')} onPress={() => setListening(true)} />
        )
      ) : null}
      {item.kind === 'audio' ? shareButton : null}
      {isVideo ? (
        <View style={styles.videoButtons}>
          <Button
            variant="secondary"
            label={needsCopy(item) ? t('video.playCopy') : t('video.play')}
            busy={busy}
            disabled={sharing}
            onPress={() => void run(() => playVideo(session.id, item, t('video.play')))}
          />
          {shareButton}
        </View>
      ) : null}
    </Card>
  );
}

export function SessionDetail({ id }: { id: string }) {
  const { t } = useTranslation('record');
  const session = useSession(id);
  const [checking, setChecking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [witnessing, setWitnessing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [folder, setFolder] = useState<ExportFolder | null>(readExportFolder);

  if (!session) {
    return (
      <Screen>
        <AppText>{t('locker.missing')}</AppText>
      </Screen>
    );
  }

  const sealed = session.items.filter((item) => item.status === 'sealed').length;
  const summary = summarize(session, (item) => recordModeOf(session.id, item));
  const kind = kindLabel(t, summary);
  // How the recording as a whole ended: its last file's reason.
  const last = [...session.items].filter((i) => i.kind !== 'photo').sort((a, b) => Date.parse(a.endedAt) - Date.parse(b.endedAt)).at(-1);
  const endedHow = last ? endReasonLabel(t, last) : null;
  const head = chainHeadOf(session);
  const lastWitness = session.witness.filter((w) => w.result !== 'cancelled').at(-1);

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

  const witness = async () => {
    setWitnessing(true);
    try {
      // The people ticked for witness messages are filled in (fix round 1, group 6).
      const recipients = (await getTrustedContacts('witness')).map((c) => c.phone);
      await sendWitnessMessage(
        id,
        {
          record: t('witness.record'),
          started: t('witness.started'),
          ended: t('witness.ended'),
          length: t('witness.length'),
          place: t('witness.place'),
          noPlace: t('witness.noPlace'),
          accuracy: (m) => t('witness.accuracy', { m }),
          map: t('witness.map'),
          files: t('witness.files'),
          chainHead: t('witness.chainHead'),
          app: t('witness.app'),
          id: t('witness.id'),
          kindWord: (kind) => t(kind === 'video' ? 'witness.kindVideo' : kind === 'audio' ? 'witness.kindAudio' : 'witness.kindPhoto'),
        },
        recipients,
      );
    } catch (error) {
      Alert.alert(
        t('locker.errorTitle'),
        error instanceof SmsUnavailableError ? t('witness.unavailable') : error instanceof Error ? error.message : String(error),
      );
    } finally {
      setWitnessing(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(t('locker.deleteTitle'), t('locker.deleteBody', { count: session.items.length }), [
      { text: t('locker.deleteCancel'), style: 'cancel' },
      {
        text: t('locker.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          try {
            deleteSession(fileLocker, id);
            router.back();
          } catch (error) {
            Alert.alert(
              t('locker.errorTitle'),
              error instanceof SessionBusyError ? t('locker.deleteBusy') : error instanceof Error ? error.message : String(error),
            );
          }
        },
      },
    ]);
  };

  // The record's two actions (fix round 1, group 9): share a playable copy, or export the bundle.
  const target = shareTarget(session, summary.kind);
  const word = shareKind(target);
  const shareLabel = word ? t(SHARE_WORD[word]) : null;
  const shareHelp = !target
    ? null
    : target.kind === 'each'
      ? t('share.each')
      : target.kind === 'joined'
        ? t('share.helpJoined')
        : needsCopy(target.item)
          ? t('share.helpCopy')
          : t('share.helpFile');

  const shareRecord = async () => {
    if (!target || target.kind === 'each' || !shareLabel) return;
    setSharing(true);
    try {
      if (target.kind === 'joined') await shareJoinedCopy(id, shareLabel);
      else await shareFile(id, target.item, shareLabel);
    } catch (error) {
      Alert.alert(t('locker.errorTitle'), error instanceof JoinError ? t(`joined.error.${error.code}`) : message(error));
    } finally {
      setSharing(false);
    }
  };

  const bundleError = (error: unknown) => (error instanceof BundleBusyError ? t('export.recording') : message(error));
  const folderName = (f: ExportFolder) => f.name ?? t('export.someFolder');

  const shareBundleNow = async () => {
    setExporting(true);
    try {
      await shareBundle(id, t('locker.exportDialog'));
    } catch (error) {
      Alert.alert(t('locker.errorTitle'), bundleError(error));
    } finally {
      setExporting(false);
    }
  };

  /** The folder picker; the folder chosen is kept for next time. Null if the user cancels. */
  const chooseFolder = async (): Promise<ExportFolder | null> => {
    try {
      const picked = await pickExportFolder();
      if (picked) {
        saveExportFolder(picked);
        setFolder(picked);
      }
      return picked;
    } catch (error) {
      Alert.alert(t('locker.errorTitle'), message(error));
      return null;
    }
  };

  const exportBundle = async () => {
    setExporting(true);
    try {
      const into = folder ?? (await chooseFolder());
      if (!into) return;
      try {
        const saved = await exportToFolder(id, into);
        if (JSON.stringify(saved.folder) !== JSON.stringify(into)) {
          saveExportFolder(saved.folder);
          setFolder(saved.folder);
        }
        const where = folderName(saved.folder);
        Alert.alert(
          t('export.savedTitle'),
          saved.fileName ? t('export.savedBody', { file: saved.fileName, folder: where }) : t('export.savedBodyNoName', { folder: where }),
        );
      } catch (error) {
        if (error instanceof BundleBusyError) {
          Alert.alert(t('locker.errorTitle'), t('export.recording'));
          return;
        }
        Alert.alert(t('export.failedTitle'), t('export.failedBody', { folder: folderName(into), error: message(error) }), [
          { text: t('export.cancel'), style: 'cancel' },
          { text: t('export.choose'), onPress: () => void chooseFolder() },
          { text: t('export.shareInstead'), onPress: () => void shareBundleNow() },
        ]);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen>
      <AppText variant="heading">
        {summary.lengthMs !== null ? t('list.summary', { kind, length: lengthLabel(t, summary.lengthMs) }) : kind}
      </AppText>
      <AppText color="textMuted">{t('list.started', { time: formatIST(summary.startedAt, true) })}</AppText>
      {endedHow && summary.kind !== 'camera' ? (
        <AppText color={last?.interrupted ? 'warning' : 'textMuted'}>{t('ended.label', { reason: endedHow })}</AppText>
      ) : null}

      {summary.kind !== 'camera' && summary.videos + summary.sounds > 0 ? (
        <Card>
          <AppText variant="label">{t('player.heading')}</AppText>
          <AppText color="textMuted">{t('player.help')}</AppText>
          <RecordingPlayer sessionId={id} items={session.items} />
        </Card>
      ) : null}

      {target ? (
        <Card>
          {shareLabel ? (
            <Button
              label={sharing && target.kind === 'joined' ? t('joined.making') : shareLabel}
              busy={sharing}
              disabled={exporting}
              onPress={() => void shareRecord()}
            />
          ) : null}
          {shareHelp ? <AppText color="textMuted">{shareHelp}</AppText> : null}
          {target.kind === 'joined' && session.joined ? (
            <AppText color="textMuted" selectable>
              {t(session.joined.reencoded ? 'joined.madeReencoded' : 'joined.made', { sha256: session.joined.sha256 })}
            </AppText>
          ) : null}

          <Button variant="secondary" label={t('export.button')} busy={exporting} disabled={sharing} onPress={() => void exportBundle()} />
          <AppText color="textMuted">{t('export.help')}</AppText>
          <AppText color="textMuted">{folder ? t('export.savesTo', { folder: folderName(folder) }) : t('export.firstTime')}</AppText>
          <View style={styles.links}>
            {folder ? (
              <Button variant="secondary" label={t('export.change')} disabled={exporting} onPress={() => void chooseFolder()} />
            ) : null}
            <Button variant="secondary" label={t('export.shareInstead')} disabled={exporting || sharing} onPress={() => void shareBundleNow()} />
          </View>
        </Card>
      ) : null}

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

      <Button label={t('witness.send')} busy={witnessing} disabled={sealed === 0} onPress={witness} />
      <AppText color="textMuted">{t('witness.help')}</AppText>
      <Button
        variant="secondary"
        label={session.certificate ? t('certificate.openAgain') : t('certificate.open')}
        disabled={sealed === 0}
        onPress={() => router.push({ pathname: '/record/certificate', params: { session: id } })}
      />
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
        <ItemCard key={item.sequence} item={item} session={session} />
      ))}

      <Button variant="danger" label={t('locker.delete')} onPress={confirmDelete} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingVertical: spacing.xs },
  mark: { width: 24, textAlign: 'center' },
  statusText: { flex: 1, gap: 2 },
  videoButtons: { gap: spacing.sm, marginTop: spacing.sm },
  links: { gap: spacing.sm },
});
