import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { spacing, useTheme } from '@/theme';

/** A scrolling page with the app's background and gutters. */
export function Screen({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
});
