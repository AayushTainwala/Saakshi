import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components';
import { palettes, radius, spacing, touchTarget } from '@/theme';

import { RIGHTS_PROMPTS } from './prompts';

const colors = palettes.dark;

/**
 * Prompts drawn over the camera preview. They are ordinary views above the preview; the camera
 * records only what its sensor sees, so nothing here ends up in the photo or video.
 */
export function RightsOverlay() {
  const { t } = useTranslation('record');
  const [visible, setVisible] = useState(true);
  const [index, setIndex] = useState(0);

  if (!visible) {
    return (
      <Pressable accessibilityRole="button" onPress={() => setVisible(true)} style={styles.showButton}>
        <AppText variant="label" style={{ color: colors.text }}>
          {t('rights.show')}
        </AppText>
      </Pressable>
    );
  }

  const prompt = RIGHTS_PROMPTS[index];
  const total = RIGHTS_PROMPTS.length;
  const text = t(`rights.${prompt.id}.text`);
  const why = t(`rights.${prompt.id}.why`);
  const source = prompt.id === 'statement' ? null : t(`rights.${prompt.id}.source`);

  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <View style={styles.header}>
        <AppText variant="small" style={{ color: colors.textMuted }}>
          {t(prompt.kind === 'say' ? 'rights.say' : 'rights.do')} · {t('rights.position', { index: index + 1, total })}
        </AppText>
        <Pressable accessibilityRole="button" onPress={() => setVisible(false)} style={styles.smallButton}>
          <AppText variant="label" style={{ color: colors.text }}>
            {t('rights.hide')}
          </AppText>
        </Pressable>
      </View>
      <AppText variant="heading" style={{ color: colors.text }}>
        {text}
      </AppText>
      <AppText variant="small" style={{ color: colors.text }}>
        {why}
      </AppText>
      {source ? (
        <AppText variant="small" style={{ color: colors.textMuted }}>
          {source}
        </AppText>
      ) : null}
      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('rights.previous')}
          disabled={index === 0}
          onPress={() => setIndex((i) => Math.max(0, i - 1))}
          style={[styles.navButton, index === 0 && styles.disabled]}>
          <AppText variant="label" style={{ color: colors.text }}>
            ‹ {t('rights.previous')}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('rights.next')}
          disabled={index === total - 1}
          onPress={() => setIndex((i) => Math.min(total - 1, i + 1))}
          style={[styles.navButton, index === total - 1 && styles.disabled]}>
          <AppText variant="label" style={{ color: colors.text }}>
            {t('rights.next')} ›
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.overlay,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginHorizontal: spacing.md,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  navButton: {
    minHeight: touchTarget,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  smallButton: { minHeight: touchTarget, minWidth: touchTarget, alignItems: 'flex-end', justifyContent: 'center' },
  showButton: {
    alignSelf: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.overlay,
  },
  disabled: { opacity: 0.4 },
});
