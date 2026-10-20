import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { applyLanguage } from '@/i18n';

import {
  type LanguagePreference,
  loadPreferences,
  type Preferences,
  savePreferences,
  type ThemePreference,
} from './store';

type PreferencesContextValue = {
  preferences: Preferences;
  setLanguage: (language: LanguagePreference) => void;
  setTheme: (theme: ThemePreference) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({
  initial,
  children,
}: {
  initial?: Preferences;
  children: ReactNode;
}) {
  const [preferences, setPreferences] = useState<Preferences>(() => initial ?? loadPreferences());

  const update = useCallback((patch: Partial<Preferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch };
      try {
        savePreferences(next);
      } catch {
        // The choice still applies for this session if the file can't be written.
      }
      return next;
    });
  }, []);

  const setLanguage = useCallback(
    (language: LanguagePreference) => {
      applyLanguage(language);
      update({ language });
    },
    [update],
  );

  // Android lets people change the phone's language while the app runs; follow it on return.
  useEffect(() => {
    if (preferences.language !== 'system') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') applyLanguage('system');
    });
    return () => subscription.remove();
  }, [preferences.language]);

  const setTheme = useCallback((theme: ThemePreference) => update({ theme }), [update]);

  const value = useMemo(
    () => ({ preferences, setLanguage, setTheme }),
    [preferences, setLanguage, setTheme],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider');
  return value;
}
