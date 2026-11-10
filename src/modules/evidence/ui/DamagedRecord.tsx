import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components';

import { shareOriginal } from '../export/videoActions';
import { deleteSession, SessionBusyError } from '../locker/delete';
import { fileLocker } from '../locker/store';
import type { LooseFile, SessionState } from '../types';
import { formatBytes, formatIST } from './format';

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * A recording whose index can't be read and can't be made again (repair round A, group 1). It is
 * still listed, and the recorded files found in its folder can each be shared out as they are.
 */
export function DamagedRecord({ session }: { session: SessionState }) {
  const { t } = useTranslation('record');
  const [sharing, setSharing] = useState<string | null>(null);
  const files = session.damaged?.files ?? [];

  const share = async (file: LooseFile) => {
    setSharing(file.name);
    try {
      await shareOriginal(fileLocker.sessionFileUri(session.id, `${file.folder}/${file.name}`), t('damaged.share'));
    } catch (error) {
      Alert.alert(t('locker.errorTitle'), message(error));
    } finally {
      setSharing(null);
    }
  };

  const confirmDelete = () => {
    Alert.alert(t('locker.deleteTitle'), t('locker.deleteBody', { count: files.length }), [
      { text: t('locker.deleteCancel'), style: 'cancel' },
      {
        text: t('locker.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          try {
            deleteSession(fileLocker, session.id);
            router.back();
          } catch (error) {
            Alert.alert(t('locker.errorTitle'), error instanceof SessionBusyError ? t('locker.deleteBusy') : message(error));
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <AppText variant="heading">{t('damaged.title')}</AppText>
      <AppText>{t('damaged.body')}</AppText>
      {files.length === 0 ? <AppText color="textMuted">{t('damaged.none')}</AppText> : null}
      {files.map((file) => (
        <Card key={`${file.folder}/${file.name}`}>
          <AppText variant="label" selectable>
            {file.name}
          </AppText>
          <AppText color="textMuted">{t('damaged.fileWritten', { time: formatIST(new Date(file.modifiedAt).toISOString(), true), size: formatBytes(file.size) })}</AppText>
          <Button variant="secondary" label={t('damaged.share')} busy={sharing === file.name} disabled={sharing !== null} onPress={() => void share(file)} />
        </Card>
      ))}
      <Button variant="danger" label={t('locker.delete')} onPress={confirmDelete} />
    </Screen>
  );
}
