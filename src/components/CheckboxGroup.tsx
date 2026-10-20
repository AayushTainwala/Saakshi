import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, touchTarget, useTheme } from '@/theme';

import { AppText } from './AppText';
import type { Option } from './OptionGroup';

/** A multiple-choice list with full-width rows. */
export function CheckboxGroup<T extends string>({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: readonly Option<T>[];
  values: readonly T[];
  onChange: (values: T[]) => void;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityLabel={label} style={styles.group}>
      {options.map((option) => {
        const checked = values.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={option.label}
            onPress={() =>
              onChange(checked ? values.filter((v) => v !== option.value) : [...values, option.value])
            }
            style={({ pressed }) => [
              styles.row,
              {
                borderColor: checked ? colors.primary : colors.border,
                backgroundColor: pressed ? colors.surfaceRaised : colors.background,
              },
            ]}>
            <View
              style={[
                styles.box,
                { borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? colors.primary : 'transparent' },
              ]}>
              {checked ? (
                <AppText variant="label" style={{ color: colors.onPrimary, lineHeight: 20 }}>
                  ✓
                </AppText>
              ) : null}
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
  box: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
