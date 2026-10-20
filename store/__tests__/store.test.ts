import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import en from '../listing/en.json';
import hi from '../listing/hi.json';

const STORE = join(__dirname, '..');
const bytes = (s: string) => Buffer.byteLength(s, 'utf8');
const listings = { en, hi };

describe.each(Object.entries(listings))('%s listing', (_, l) => {
  const description = l.appStore.description.join('\n');

  it('fits the App Store limits', () => {
    const a = l.appStore;
    expect(a.name.length).toBeGreaterThanOrEqual(2);
    expect(a.name.length).toBeLessThanOrEqual(30);
    expect(a.subtitle.length).toBeLessThanOrEqual(30);
    expect(a.promotionalText.length).toBeLessThanOrEqual(170);
    expect(description.length).toBeLessThanOrEqual(4000);
    expect(a.whatsNew.length).toBeLessThanOrEqual(4000);
    expect(bytes(a.keywords)).toBeLessThanOrEqual(100);
  });

  it('has keywords Apple accepts', () => {
    const words = l.appStore.keywords.split(',');
    for (const w of words) {
      expect(w).toBe(w.trim());
      expect(w.length).toBeGreaterThan(2);
    }
    expect(new Set(words).size).toBe(words.length);
  });

  it('fits the Play limits', () => {
    expect(l.play.title.length).toBeLessThanOrEqual(30);
    expect(l.play.shortDescription.length).toBeLessThanOrEqual(80);
    expect(description.length).toBeLessThanOrEqual(4000);
  });

  it('keeps 112 in view and never calls SOS an emergency service', () => {
    expect(description).toContain('112');
    expect(description).not.toMatch(/emergency service(?!\.)|protest/i);
    expect(description).not.toMatch(/admissible|tamper-?proof|court-?proof/i);
  });

  it('has no HTML (Apple takes plain text)', () => {
    expect(description).not.toMatch(/<[a-z/]/i);
  });
});

it('has the same fields and shape in English and Hindi', () => {
  const shape = (o: object): unknown =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'object' && !Array.isArray(v) ? shape(v) : typeof v]));
  expect(shape(hi)).toEqual(shape(en));
  expect(hi.appStore.description.length).toBe(en.appStore.description.length);
  hi.appStore.description.forEach((line, i) => expect(line === '').toBe(en.appStore.description[i] === ''));
});

it('keeps the keywords of the two localizations apart', () => {
  const enWords = new Set(en.appStore.keywords.toLowerCase().split(','));
  for (const w of hi.appStore.keywords.toLowerCase().split(',')) expect(enWords.has(w)).toBe(false);
});

describe('App Review notes', () => {
  const md = readFileSync(join(STORE, 'apple/review-notes.md'), 'utf8');
  const blocks = [...md.matchAll(/```text\n([\s\S]*?)```/g)].map((m) => m[1]);

  it('fit Apple’s 4000-byte limit with every optional block added', () => {
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    expect(bytes(blocks.join('\n'))).toBeLessThanOrEqual(4000);
  });

  it('explain every permission the app asks for on iPhone', () => {
    const plist = JSON.parse(readFileSync(join(STORE, '../src/i18n/native/en.json'), 'utf8')).ios;
    const notes = blocks.join('\n');
    const named: Record<string, string> = {
      NSCameraUsageDescription: 'Camera',
      NSMicrophoneUsageDescription: 'Microphone',
      NSLocationWhenInUseUsageDescription: 'Location When In Use',
      NSContactsUsageDescription: 'Contacts',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'Location Always',
    };
    for (const key of Object.keys(plist).filter((k) => k.endsWith('UsageDescription'))) {
      expect(named[key]).toBeDefined();
      expect(notes).toContain(named[key]);
    }
  });
});

describe('privacy policy site', () => {
  const pages = ['site/index.html', 'site/privacy/index.html', 'site/privacy/hi/index.html'];

  it.each(pages)('%s links only to pages that exist', (page) => {
    const html = readFileSync(join(STORE, page), 'utf8');
    expect(html).toMatch(/<title>[^<]+<\/title>/);
    expect(html).toContain('name="viewport"');
    for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|tel:|mailto:)/.test(href)) continue;
      const target = join(STORE, dirname(page), href);
      const file = href.endsWith('/') ? join(target, 'index.html') : target;
      expect(existsSync(file)).toBe(true);
    }
  });

  it('says the same things in English and Hindi', () => {
    const count = (page: string, tag: string) =>
      (readFileSync(join(STORE, page), 'utf8').match(new RegExp(`<${tag}[ >]`, 'g')) ?? []).length;
    for (const tag of ['h2', 'h3', 'li', 'p']) {
      expect(count('site/privacy/hi/index.html', tag)).toBe(count('site/privacy/index.html', tag));
    }
  });

  it('names no analytics or tracking service', () => {
    for (const page of pages) {
      expect(readFileSync(join(STORE, page), 'utf8')).not.toMatch(/<script|googletagmanager|analytics\.js/i);
    }
  });
});
