import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components';
import { radius, spacing, useTheme } from '@/theme';

import { CODE_LENGTH } from '../code';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'] as const;

/**
 * Four dots and a number pad. Calls `onComplete` with the four digits as soon as the fourth is
 * typed, and empties itself. With `disabled` (while a wait runs, or a code is being checked) the
 * keys do nothing.
 */
export function CodeKeys({ onComplete, disabled = false }: { onComplete: (code: string) => void; disabled?: boolean }) {
  const { t } = useTranslation('secretcode');
  const { colors } = useTheme();
  const [entered, setEntered] = useState('');

  const press = (key: (typeof KEYS)[number]) => {
    if (disabled) return;
    if (key === 'delete') return setEntered((value) => value.slice(0, -1));
    const value = entered + key;
    if (value.length < CODE_LENGTH) return setEntered(value);
    setEntered('');
    onComplete(value);
  };

  return (
    <View style={styles.pad}>
      <View
        style={styles.dots}
        accessible
        accessibilityLabel={t('entered', { count: entered.length, total: CODE_LENGTH })}
        accessibilityLiveRegion="polite">
        {Array.from({ length: CODE_LENGTH }, (_, i) => (
          <View
            key={i}
            style={[styles.dot, { borderColor: colors.text, backgroundColor: i < entered.length ? colors.text : 'transparent' }]}
          />
        ))}
      </View>
      <View style={styles.keys}>
        {KEYS.map((key, i) =>
          key === '' ? (
            <View key={i} style={styles.key} />
          ) : (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={key === 'delete' ? t('delete') : key}
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => press(key)}
              style={({ pressed }) => [
                styles.key,
                { backgroundColor: pressed ? colors.surfaceRaised : colors.surface, opacity: disabled ? 0.5 : 1 },
              ]}>
              <AppText variant="title">{key === 'delete' ? '⌫' : key}</AppText>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { alignItems: 'center', gap: spacing.md },
  dots: { flexDirection: 'row', gap: spacing.lg, paddingVertical: spacing.md },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  keys: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md, maxWidth: 360 },
  key: { width: 96, height: 72, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
});
