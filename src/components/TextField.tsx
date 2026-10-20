import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { radius, spacing, touchTarget, typography, useTheme } from '@/theme';

import { AppText } from './AppText';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  hint?: string;
};

export function TextField({ label, hint, multiline, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      {hint ? <AppText color="textMuted">{hint}</AppText> : null}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        style={[
          styles.input,
          typography.body,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.background,
            minHeight: multiline ? touchTarget * 2 : touchTarget,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  input: {
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
