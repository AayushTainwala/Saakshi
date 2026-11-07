import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';

import { initI18n } from '@/i18n';
import { useBackupExclusion } from '@/modules/backup';
import { bugMode } from '@/modules/bugmode';
import { isBodyCamRunning } from '@/modules/evidence';
import { liveShare, registerLiveLocationTask } from '@/modules/location';
import { registerRunningCheck } from '@/modules/secretcode';
import { phoneTaken, removeOldCodePadSetting, useQuickTriggers } from '@/modules/trigger';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';
import { loadPreferences } from '@/preferences/store';
import { useTheme } from '@/theme';

const initialPreferences = loadPreferences();
initI18n(initialPreferences.language);
// Live location's background task must exist before the system delivers positions to it.
registerLiveLocationTask();
// What the secret code protects (SPEC 5.3). Its reset with the phone's passcode is offered only
// while none of these runs.
registerRunningCheck('body-cam', isBodyCamRunning);
registerRunningCheck('pocket-recording', () => bugMode.getState().running);
registerRunningCheck('live-location', () => liveShare.getShare() !== null);
registerRunningCheck('phone-taken', phoneTaken.isRunning);
// "My phone is being taken" carries on after a restart: its heartbeat resumes (group 3.5).
phoneTaken.resume();
// Round 2 removed the 3-digit code pad: its old setting, with the code in it, is deleted.
removeOldCodePadSetting();

export default function RootLayout() {
  return (
    <PreferencesProvider initial={initialPreferences}>
      <ThemedStack />
    </PreferencesProvider>
  );
}

function ThemedStack() {
  const { scheme, colors } = useTheme();
  // The SOS screen opens from the iPhone controls and Action Button (Android opens saakshi://sos).
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
      <Stack screenOptions={{ headerShown: false }}>
        {/*
          Set here, before the screen is pushed, rather than from inside it: body-cam must never be
          left by a swipe while it records (fix round 1, C2). BodyCamScreen also refuses removal.
        */}
        <Stack.Screen name="bodycam" options={{ presentation: 'card', gestureEnabled: false, fullScreenGestureEnabled: false }} />
        {/* The one code screen (round 2, group 1.2): over everything, left only by Cancel or the right code. */}
        <Stack.Screen name="secret-code" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      </Stack>
    </ThemeProvider>
  );
}
