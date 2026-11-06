import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components';
import { spacing } from '@/theme';

import { useSession } from '../locker/useSessions';
import { fileLocker } from '../locker/store';

/**
 * A photo of a record, full screen (fix round 1, group 3). It shows the original file, which is
 * only read. On a black background in both themes, as photo viewers are.
 */
export function PhotoViewer({ sessionId, sequence }: { sessionId: string; sequence: number }) {
  const { t } = useTranslation('record');
  const session = useSession(sessionId);
  const item = session?.items.find((i) => i.sequence === sequence && i.kind === 'photo');
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.bar}>
        <Button variant="secondary" label={t('photo.close')} onPress={() => router.back()} />
      </View>
      {item ? (
        <Image
          source={{ uri: fileLocker.mediaUri(sessionId, item.media) }}
          style={styles.photo}
          contentFit="contain"
          accessibilityLabel={t('locker.photo')}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <AppText style={styles.missing}>{t('photo.missing')}</AppText>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  bar: { padding: spacing.md },
  photo: { flex: 1 },
  missing: { color: '#fff', padding: spacing.md },
});
