import { useTranslation } from 'react-i18next';

import type { Localized } from '../content';

/** Picks guide text in the app's current language. */
export function usePick(): (text: Localized) => string {
  const { i18n } = useTranslation();
  return (text) => (i18n.language === 'hi' ? text.hi : text.en);
}
