import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';

import { initI18n } from '@/i18n';
import { useBackupExclusion } from '@/modules/backup';
import { registerLiveLocationTask } from '@/modules/location';
import { useQuickTriggers } from '@/modules/trigger';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';
import { loadPreferences } from '@/preferences/store';
import { useTheme } from '@/theme';

const initialPreferences = loadPreferences();
initI18n(initialPreferences.language);
// Live location's background task must exist before the system delivers positions to it.
registerLiveLocationTask();

export default function RootLayout() {
  return (
    <PreferencesProvider initial={initialPreferences}>
      <ThemedStack />
    </PreferencesProvider>
  );
}

function ThemedStack() {
  const { scheme, colors } = useTheme();
  // The code pad opens from the iPhone controls and Action Button, and Android's notification.
  useQuickTriggers();
  // Nothing goes into iCloud device backup until the user chooses (spec section 2).
  useBackupExclusion();
  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [scheme, colors]);

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
