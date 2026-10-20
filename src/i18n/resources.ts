import enCommon from './locales/en/common.json';
import enGuides from './locales/en/guides.json';
import enHelp from './locales/en/help.json';
import enRecord from './locales/en/record.json';
import enSettings from './locales/en/settings.json';
import enSos from './locales/en/sos.json';
import hiCommon from './locales/hi/common.json';
import hiGuides from './locales/hi/guides.json';
import hiHelp from './locales/hi/help.json';
import hiRecord from './locales/hi/record.json';
import hiSettings from './locales/hi/settings.json';
import hiSos from './locales/hi/sos.json';

/**
 * One namespace per area of the app, so each build stream edits its own files.
 * To add a namespace: add `locales/<lang>/<name>.json` for every language and list it here.
 * To add a language: add its folder, list it here and in `SUPPORTED_LANGUAGES`.
 */
export const resources = {
  en: {
    common: enCommon,
    settings: enSettings,
    record: enRecord,
    sos: enSos,
    guides: enGuides,
    help: enHelp,
  },
  hi: {
    common: hiCommon,
    settings: hiSettings,
    record: hiRecord,
    sos: hiSos,
    guides: hiGuides,
    help: hiHelp,
  },
} as const;

export type Language = keyof typeof resources;
export type Namespace = keyof (typeof resources)['en'];

export const SUPPORTED_LANGUAGES: readonly Language[] = ['en', 'hi'];
export const FALLBACK_LANGUAGE: Language = 'en';
export const DEFAULT_NAMESPACE: Namespace = 'common';
