import { useContext } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { radius, spacing, touchTarget, typography, useTheme } from '@/theme';

import { AppText } from './AppText';
import { KeyboardRevealContext } from './keyboard';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  hint?: string;
};

export function TextField({ label, hint, multiline, onFocus, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  const keyboard = useContext(KeyboardRevealContext);
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
        onFocus={(event) => {
          // The page keeps this field above the keyboard (`Screen`).
          keyboard?.focused(null);
          onFocus?.(event);
        }}
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
