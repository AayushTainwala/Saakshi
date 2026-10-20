import { Platform, Text, type TextProps } from 'react-native';

import { type Palette, typography, type TypographyVariant, useTheme } from '@/theme';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: keyof Palette;
};

/** Text in the app's type scale. Font scaling from the phone's accessibility settings stays on. */
export function AppText({ variant = 'body', color = 'text', style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      style={[typography[variant], { color: colors[color] }, variant === 'mono' && { fontFamily: MONO }, style]}
      accessibilityRole={variant === 'title' || variant === 'heading' ? 'header' : undefined}
      {...rest}
    />
  );
}

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
