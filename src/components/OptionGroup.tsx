import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, touchTarget, useTheme } from '@/theme';

import { AppText } from './AppText';

export type Option<T extends string> = { value: T; label: string };

/** A single-choice list (radio group) with full-width rows. */
export function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.row,
              {
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: pressed ? colors.surfaceRaised : colors.background,
              },
            ]}>
            <View
              style={[
                styles.dot,
                { borderColor: selected ? colors.primary : colors.border },
              ]}>
              {selected ? <View style={[styles.dotInner, { backgroundColor: colors.primary }]} /> : null}
            </View>
            <AppText variant="label">{option.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  row: {
    minHeight: touchTarget,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: { width: 12, height: 12, borderRadius: 6 },
});
