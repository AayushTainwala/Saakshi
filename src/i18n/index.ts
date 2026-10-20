import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import type { LanguagePreference } from '@/preferences/store';

import {
  DEFAULT_NAMESPACE,
  FALLBACK_LANGUAGE,
  type Language,
  resources,
  SUPPORTED_LANGUAGES,
} from './resources';

export { type Language, type Namespace, SUPPORTED_LANGUAGES } from './resources';

const i18n = createInstance();

/** The first of the phone's preferred languages that the app supports, else English. */
export function deviceLanguage(
  locales: readonly { languageCode: string | null }[] = getLocales(),
): Language {
  for (const locale of locales) {
    const code = locale.languageCode as Language | null;
    if (code && SUPPORTED_LANGUAGES.includes(code)) return code;
  }
  return FALLBACK_LANGUAGE;
}

export function resolveLanguage(preference: LanguagePreference): Language {
  return preference === 'system' ? deviceLanguage() : preference;
}

export function initI18n(preference: LanguagePreference) {
  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources,
      lng: resolveLanguage(preference),
      fallbackLng: FALLBACK_LANGUAGE,
      ns: Object.keys(resources.en),
      defaultNS: DEFAULT_NAMESPACE,
      interpolation: { escapeValue: false },
      initAsync: false,
      returnNull: false,
    });
  }
  return i18n;
}

export function applyLanguage(preference: LanguagePreference): void {
  const language = resolveLanguage(preference);
  if (i18n.language !== language) void i18n.changeLanguage(language);
}

export default i18n;
