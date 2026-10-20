import type { Language } from '@/i18n';

/**
 * The helpline list, as published in `helplines/helplines.json` at the root of the repository and
 * fetched from there so it can change without an app release. `schema` goes up only when an older
 * app could no longer read the file; an app ignores a list with a schema it doesn't know.
 */
export const SCHEMA_VERSION = 1;

export type Localized = Record<Language, string>;

export type Source = {
  url: string;
  /** The day the number was checked against this page, as YYYY-MM-DD. */
  checked: string;
  /** `page-read`: the page itself was read. `search-extract`: only a search engine's extract of it. */
  how: 'page-read' | 'search-extract';
};

/** A public number, each checked against an official government page. */
export type PublicHelpline = {
  id: string;
  number: string;
  name: Localized;
  description: Localized;
  scope: 'national' | 'state';
  /** For `scope: 'state'`, the state or union territory, in English. */
  state?: string;
  sources: Source[];
};

/** A lawyer or medic who has agreed, in writing, to be listed. */
export type ListedPerson = {
  id: string;
  kind: 'lawyer' | 'medic';
  /** As they asked to be shown. */
  name: string;
  phone: string;
  city: string;
  state: string;
  /** Language names, each written in its own script (for example "हिन्दी", "English"). */
  languages: string[];
  /** Bar Council enrolment number, or state medical council registration number. */
  registration: string;
  /** The day their written consent to be listed was received, as YYYY-MM-DD. */
  consented: string;
  /** The app stops showing the entry after this day, until consent is renewed. YYYY-MM-DD. */
  listedUntil: string;
};

export type HelplineList = {
  schema: number;
  /** YYYY-MM-DD. The app keeps whichever list, bundled, saved or fetched, was updated last. */
  updated: string;
  public: PublicHelpline[];
  people: ListedPerson[];
};

export type ParseResult = { ok: true; list: HelplineList } | { ok: false; errors: string[] };

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Digits only, optionally with a leading +: what a `tel:` link can dial without surprises. */
const PHONE = /^\+?[0-9]{3,15}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LANGUAGES: readonly Language[] = ['en', 'hi'];

type Check = (value: unknown, path: string, errors: string[]) => void;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const text: Check = (v, path, errors) => {
  if (typeof v !== 'string' || v.trim() === '') errors.push(`${path}: expected non-empty text`);
};

const matching =
  (pattern: RegExp, what: string): Check =>
  (v, path, errors) => {
    if (typeof v !== 'string' || !pattern.test(v)) errors.push(`${path}: expected ${what}`);
  };

const date: Check = (v, path, errors) => {
  if (typeof v !== 'string' || !DATE.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) {
    errors.push(`${path}: expected a date as YYYY-MM-DD`);
  }
};

const httpsUrl: Check = (v, path, errors) => {
  if (typeof v !== 'string' || !/^https:\/\/[^\s/]+\.[^\s/]+(\/\S*)?$/.test(v)) {
    errors.push(`${path}: expected an https URL`);
  }
};

const oneOf =
  (values: readonly string[]): Check =>
  (v, path, errors) => {
    if (typeof v !== 'string' || !values.includes(v)) errors.push(`${path}: expected one of ${values.join(', ')}`);
  };

const localized: Check = (v, path, errors) => {
  if (!isObject(v)) {
    errors.push(`${path}: expected text in ${LANGUAGES.join(' and ')}`);
    return;
  }
  for (const language of LANGUAGES) text(v[language], `${path}.${language}`, errors);
};

function fields(value: unknown, path: string, errors: string[], shape: Record<string, Check>, optional: string[] = []) {
  if (!isObject(value)) {
    errors.push(`${path}: expected an object`);
    return;
  }
  for (const [key, check] of Object.entries(shape)) {
    if (value[key] === undefined && optional.includes(key)) continue;
    check(value[key], `${path}.${key}`, errors);
  }
  for (const key of Object.keys(value)) {
    if (!(key in shape)) errors.push(`${path}.${key}: unknown field`);
  }
}

const list =
  (item: Check, { nonEmpty = false } = {}): Check =>
  (v, path, errors) => {
    if (!Array.isArray(v)) {
      errors.push(`${path}: expected a list`);
      return;
    }
    if (nonEmpty && v.length === 0) errors.push(`${path}: expected at least one entry`);
    v.forEach((entry, i) => item(entry, `${path}[${i}]`, errors));
  };

const source: Check = (v, path, errors) =>
  fields(v, path, errors, { url: httpsUrl, checked: date, how: oneOf(['page-read', 'search-extract']) });

const publicHelpline: Check = (v, path, errors) => {
  fields(
    v,
    path,
    errors,
    {
      id: matching(ID, 'a lowercase id'),
      number: matching(PHONE, 'a phone number of digits'),
      name: localized,
      description: localized,
      scope: oneOf(['national', 'state']),
      state: text,
      sources: list(source, { nonEmpty: true }),
    },
    ['state'],
  );
  if (isObject(v) && v.scope === 'state' && v.state === undefined) errors.push(`${path}.state: needed for a state number`);
};

const person: Check = (v, path, errors) =>
  fields(v, path, errors, {
    id: matching(ID, 'a lowercase id'),
    kind: oneOf(['lawyer', 'medic']),
    name: text,
    phone: matching(PHONE, 'a phone number of digits'),
    city: text,
    state: text,
    languages: list(text, { nonEmpty: true }),
    registration: text,
    consented: date,
    listedUntil: date,
  });

function uniqueIds(entries: unknown, path: string, errors: string[]) {
  if (!Array.isArray(entries)) return;
  const seen = new Set<unknown>();
  for (const entry of entries) {
    const id = isObject(entry) ? entry.id : undefined;
    if (seen.has(id)) errors.push(`${path}: id ${String(id)} is used twice`);
    seen.add(id);
  }
}

/** Checks anything parsed from JSON against the schema, field by field, with no extra fields. */
export function parseHelplineList(raw: unknown): ParseResult {
  const errors: string[] = [];
  if (isObject(raw) && raw.schema !== SCHEMA_VERSION) {
    return { ok: false, errors: [`schema: this app reads version ${SCHEMA_VERSION}, not ${String(raw.schema)}`] };
  }
  fields(raw, 'list', errors, {
    schema: () => {},
    updated: date,
    public: list(publicHelpline, { nonEmpty: true }),
    people: list(person),
  });
  if (isObject(raw)) {
    uniqueIds(raw.public, 'list.public', errors);
    uniqueIds(raw.people, 'list.people', errors);
  }
  return errors.length === 0 ? { ok: true, list: raw as HelplineList } : { ok: false, errors };
}

/** Entries whose consent has lapsed are kept in the file for the record but not shown. */
export function currentPeople(list: HelplineList, today: string): ListedPerson[] {
  return list.people.filter((p) => p.listedUntil >= today);
}

/** The newer of two lists by `updated`; on a tie, `candidate` (the fetched one) wins. */
export function newer(current: HelplineList, candidate: HelplineList): HelplineList {
  return candidate.updated >= current.updated ? candidate : current;
}
