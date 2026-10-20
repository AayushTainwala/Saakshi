import { resources, SUPPORTED_LANGUAGES } from '../resources';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

const namespaces = Object.keys(resources.en) as (keyof typeof resources.en)[];

describe('i18n resources', () => {
  it.each(SUPPORTED_LANGUAGES)('%s has every namespace', (language) => {
    expect(Object.keys(resources[language]).sort()).toEqual([...namespaces].sort());
  });

  describe.each(namespaces)('namespace %s', (namespace) => {
    const english = flatten(resources.en[namespace] as Tree);

    it.each(SUPPORTED_LANGUAGES.filter((l) => l !== 'en'))(
      '%s has exactly the English keys',
      (language) => {
        const translated = flatten(resources[language][namespace] as Tree);
        expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
      },
    );

    it.each(SUPPORTED_LANGUAGES)('%s has no empty strings', (language) => {
      const strings = flatten(resources[language][namespace] as Tree);
      for (const [key, value] of Object.entries(strings)) {
        expect([key, value.trim().length > 0]).toEqual([key, true]);
      }
    });

    it.each(SUPPORTED_LANGUAGES.filter((l) => l !== 'en'))(
      '%s keeps the same {{placeholders}}',
      (language) => {
        const translated = flatten(resources[language][namespace] as Tree);
        const placeholders = (s: string) => (s.match(/{{\s*\w+\s*}}/g) ?? []).sort();
        for (const [key, value] of Object.entries(english)) {
          expect([key, placeholders(translated[key] ?? '')]).toEqual([key, placeholders(value)]);
        }
      },
    );
  });
});
