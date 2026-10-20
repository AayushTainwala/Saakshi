import { File, Paths } from 'expo-file-system';

/** App-wide settings, kept in a small JSON file in the app's private documents directory. */
export type LanguagePreference = 'system' | 'en' | 'hi';
export type ThemePreference = 'system' | 'light' | 'dark';

export type Preferences = {
  language: LanguagePreference;
  theme: ThemePreference;
};

export const defaultPreferences: Preferences = {
  language: 'system',
  theme: 'system',
};

const FILE_NAME = 'preferences.json';

function preferencesFile(): File {
  return new File(Paths.document, FILE_NAME);
}

const LANGUAGES: readonly LanguagePreference[] = ['system', 'en', 'hi'];
const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];

/** Accepts anything parsed from disk and returns valid preferences, falling back field by field. */
export function sanitizePreferences(raw: unknown): Preferences {
  const value = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    language: LANGUAGES.includes(value.language as LanguagePreference)
      ? (value.language as LanguagePreference)
      : defaultPreferences.language,
    theme: THEMES.includes(value.theme as ThemePreference)
      ? (value.theme as ThemePreference)
      : defaultPreferences.theme,
  };
}

export function loadPreferences(): Preferences {
  try {
    const file = preferencesFile();
    if (!file.exists) return defaultPreferences;
    return sanitizePreferences(JSON.parse(file.textSync()));
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(preferences: Preferences): void {
  const file = preferencesFile();
  if (!file.exists) file.create();
  file.writeSync(JSON.stringify(preferences));
}
