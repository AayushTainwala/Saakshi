import { useColorScheme } from 'react-native';

import { usePreferences } from '@/preferences/PreferencesProvider';
import type { ThemePreference } from '@/preferences/store';

import { type ColorScheme, palettes, type Theme } from './tokens';

export * from './tokens';

export function resolveScheme(
  preference: ThemePreference,
  system: string | null | undefined,
): ColorScheme {
  if (preference !== 'system') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

/** The active colour scheme and palette, following the user's choice in Settings or the phone's. */
export function useTheme(): Theme {
  const system = useColorScheme();
  const { preferences } = usePreferences();
  const scheme = resolveScheme(preferences.theme, system);
  return { scheme, colors: palettes[scheme] };
}
