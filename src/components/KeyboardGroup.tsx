import { type ReactNode, useContext, useMemo, useRef } from 'react';
import { type HostInstance, StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { type KeyboardReveal, KeyboardRevealContext } from './keyboard';

/**
 * Fields that belong together with their button, such as a name, a number and "Add": when any of
 * its fields is focused, the page scrolls so that the field and, as far as it fits, the rest of the
 * group below it stay above the keyboard (round 2, group 1.1).
 */
export function KeyboardGroup({ children }: { children: ReactNode }) {
  const page = useContext(KeyboardRevealContext);
  const ref = useRef<HostInstance>(null);
  const value = useMemo<KeyboardReveal | null>(() => (page ? { focused: () => page.focused(ref) } : null), [page]);
  return (
    <KeyboardRevealContext.Provider value={value}>
      <View ref={ref} collapsable={false} style={styles.group}>
        {children}
      </View>
    </KeyboardRevealContext.Provider>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.md },
});
