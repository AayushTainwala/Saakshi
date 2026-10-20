import type { Language } from '@/i18n';

/** Guide text in every language the app supports. A missing language fails `tsc`. */
export type Localized = Record<Language, string>;

export type Block =
  | { kind: 'paragraph'; text: Localized }
  | { kind: 'steps'; items: Localized[] }
  | { kind: 'bullets'; items: Localized[] }
  | { kind: 'warning'; text: Localized }
  | {
      kind: 'link';
      label: Localized;
      url: string;
      /** For an outside design or text: its licence, as the source names it. */
      licence?: string;
      note?: Localized;
    };

/** A feature that a section describes but that the app may not have yet. */
export type Feature = 'confiscationMode';

export type Section = {
  id: string;
  heading: Localized;
  blocks: Block[];
  /** A do-it-yourself method nobody on the project has tried yet. Shown with a warning until it has been. */
  needsTesting?: true;
  /** Hidden until the app has this feature. */
  requires?: Feature;
};

export type GuideId = 'chest-mount' | 'digital-safety' | 'offline';

export type Guide = {
  id: GuideId;
  title: Localized;
  summary: Localized;
  sections: Section[];
  /** Credit for adapted content, as its licence requires. */
  attribution?: { text: Localized; url: string; licenceUrl: string };
};
