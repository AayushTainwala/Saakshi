import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import i18n, { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import { type Block, findGuide, GUIDES, type Localized, visibleSections } from '../content';
import { GuideDetail } from '../ui/GuideDetail';
import { GuideList } from '../ui/GuideList';

const notices = readFileSync(join(__dirname, '../../../../THIRD_PARTY_NOTICES.md'), 'utf8');

function texts(block: Block): Localized[] {
  switch (block.kind) {
    case 'paragraph':
    case 'warning':
      return [block.text];
    case 'steps':
    case 'bullets':
      return block.items;
    case 'link':
      return block.note ? [block.label, block.note] : [block.label];
  }
}

const devanagari = /[ऀ-ॿ]/;

describe('guide content', () => {
  it('has the three R1 guides, with unique section ids', () => {
    expect(GUIDES.map((g) => g.id).sort()).toEqual(['chest-mount', 'digital-safety', 'offline']);
    for (const guide of GUIDES) {
      const ids = guide.sections.map((s) => s.id);
      expect([guide.id, new Set(ids).size]).toEqual([guide.id, ids.length]);
    }
  });

  it('has every piece of text in English and in Hindi written in Devanagari', () => {
    for (const guide of GUIDES) {
      const all = [guide.title, guide.summary, ...guide.sections.flatMap((s) => [s.heading, ...s.blocks.flatMap(texts)])];
      if (guide.attribution) all.push(guide.attribution.text);
      for (const text of all) {
        expect([text.en, text.en.trim().length > 0]).toEqual([text.en, true]);
        expect([text.en, devanagari.test(text.hi) || /^[A-Za-z: ]+$/.test(text.hi)]).toEqual([text.en, true]);
      }
    }
  });

  it('links only over https, and names a licence for every outside 3D model', () => {
    for (const guide of GUIDES) {
      for (const block of guide.sections.flatMap((s) => s.blocks)) {
        if (block.kind !== 'link') continue;
        expect(block.url).toMatch(/^https:\/\//);
      }
    }
    const models = findGuide('chest-mount')!.sections.find((s) => s.id === 'print')!.blocks;
    for (const block of models) if (block.kind === 'link') expect([block.url, block.licence]).toEqual([block.url, expect.any(String)]);
  });

  it('marks every do-it-yourself mount as untested', () => {
    const sections = findGuide('chest-mount')!.sections;
    for (const id of ['harness', 'lanyard', 'strap-clip']) {
      expect([id, sections.find((s) => s.id === id)?.needsTesting]).toEqual([id, true]);
    }
  });

  it('teaches the body-cam unlock buttons in both languages', () => {
    const bodyCam = findGuide('chest-mount')!.sections.find((s) => s.id === 'body-cam')!;
    const all = bodyCam.blocks.flatMap(texts);
    expect(all.some((t) => t.en.includes('press volume-down twice'))).toBe(true);
    expect(all.some((t) => t.hi.includes('वॉल्यूम कम करने वाला बटन दो बार दबाएँ'))).toBe(true);
  });

  it('credits EFF in the guide and in THIRD_PARTY_NOTICES.md', () => {
    const attribution = findGuide('digital-safety')!.attribution!;
    expect(attribution.licenceUrl).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(notices).toContain('Surveillance Self-Defense');
    expect(notices).toContain(attribution.url);
  });

  it('hides sections about features this build does not have', () => {
    const guide = findGuide('digital-safety')!;
    expect(visibleSections(guide, { confiscationMode: false }).map((s) => s.id)).not.toContain('confiscation');
    expect(visibleSections(guide, { confiscationMode: true }).map((s) => s.id)).toContain('confiscation');
  });
});

describe('Guides tab', () => {
  beforeAll(() => {
    initI18n('en');
  });

  afterEach(async () => {
    await act(() => i18n.changeLanguage('en'));
  });

  it('lists the guides and opens one', async () => {
    const onOpen = jest.fn();
    await render(
      <PreferencesProvider initial={{ language: 'en', theme: 'light' }}>
        <GuideList onOpen={onOpen} />
      </PreferencesProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Wear your phone: chest mount' }));
    expect(onOpen).toHaveBeenCalledWith('chest-mount');
  });

  it('shows a guide with its untested warnings, in Hindi too', async () => {
    const view = await render(
      <PreferencesProvider initial={{ language: 'en', theme: 'light' }}>
        <GuideDetail id="chest-mount" />
      </PreferencesProvider>,
    );
    expect(screen.getByText('Using it with body-cam mode')).toBeTruthy();
    expect(screen.getAllByText(/Not yet tested by the Saakshi team/)).toHaveLength(3);
    expect(screen.getByText('Licence: CC BY-NC')).toBeTruthy();

    await act(() => i18n.changeLanguage('hi'));
    await view.rerender(
      <PreferencesProvider initial={{ language: 'hi', theme: 'light' }}>
        <GuideDetail id="chest-mount" />
      </PreferencesProvider>,
    );
    expect(screen.getByText('बॉडी-कैम मोड के साथ इस्तेमाल')).toBeTruthy();
  });

  it('says so when a guide is missing', async () => {
    await render(
      <PreferencesProvider initial={{ language: 'en', theme: 'light' }}>
        <GuideDetail id="nope" />
      </PreferencesProvider>,
    );
    expect(screen.getByText("This guide wasn't found.")).toBeTruthy();
  });
});
