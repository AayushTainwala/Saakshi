import 'i18next';

import type { resources } from './resources';

// Typed keys: `t('settings:language.heading')` is checked by `tsc`, and a missing English key fails the typecheck.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: (typeof resources)['en'];
  }
}
