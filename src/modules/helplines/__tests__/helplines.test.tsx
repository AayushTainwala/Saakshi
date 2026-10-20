import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { act, render, screen } from '@testing-library/react-native';

import i18n, { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import { currentPeople, type HelplineList, type ListedPerson, newer, parseHelplineList } from '../schema';
import { bundledList, refreshList, REMOTE_URL } from '../source';
import { HelplinesView } from '../ui/HelplinesScreen';

const published: unknown = JSON.parse(readFileSync(join(__dirname, '../../../../helplines/helplines.json'), 'utf8'));

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const person: ListedPerson = {
  id: 'example-lawyer',
  kind: 'lawyer',
  name: 'A. Example',
  phone: '+919800000000',
  city: 'Mumbai',
  state: 'Maharashtra',
  languages: ['English', 'मराठी'],
  registration: 'MAH/0000/2020',
  consented: '2026-10-01',
  listedUntil: '2027-09-30',
};

describe('the published helpline list', () => {
  it('passes the schema', () => {
    const result = parseHelplineList(published);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it('includes 112, the ambulance numbers and NALSA, each with an official source', () => {
    const list = bundledList();
    expect(list.public.map((line) => line.number)).toEqual(['112', '108', '102', '15100']);
    for (const line of list.public) {
      for (const source of line.sources) expect(source.url).toMatch(/^https:\/\/([a-z0-9-]+\.)*(gov|nic)\.in\//);
    }
  });

  it('lists no lawyers or medics until someone consents', () => {
    expect(bundledList().people).toEqual([]);
  });

  it('is fetched from this repository', () => {
    expect(REMOTE_URL).toBe('https://raw.githubusercontent.com/AayushTainwala/Saakshi/main/helplines/helplines.json');
  });
});

describe('parseHelplineList', () => {
  it('accepts a consenting lawyer', () => {
    const list = clone(published) as HelplineList;
    list.people.push(person);
    expect(parseHelplineList(list).ok).toBe(true);
  });

  it.each([
    ['a missing Hindi name', (l: HelplineList) => delete (l.public[0].name as Partial<HelplineList['public'][0]['name']>).hi],
    ['a number with letters', (l: HelplineList) => (l.public[0].number = '11a')],
    ['a tel: URL as the number', (l: HelplineList) => (l.public[0].number = 'tel:112')],
    ['a plain-http source', (l: HelplineList) => (l.public[0].sources[0].url = 'http://112.gov.in/about')],
    ['no sources', (l: HelplineList) => (l.public[0].sources = [])],
    ['an unknown field', (l: HelplineList) => Object.assign(l.public[0], { colour: 'red' })],
    ['a duplicate id', (l: HelplineList) => (l.public[1].id = l.public[0].id)],
    ['a bad date', (l: HelplineList) => (l.updated = '20-10-2026')],
    ['an empty public list', (l: HelplineList) => (l.public = [])],
    ['a person with no consent date', (l: HelplineList) => l.people.push({ ...person, consented: '' })],
    ['a person of an unknown kind', (l: HelplineList) => l.people.push({ ...person, kind: 'fixer' as 'lawyer' })],
    ['a state number with no state', (l: HelplineList) => (l.public[0].scope = 'state')],
  ])('rejects %s', (_, spoil) => {
    const list = clone(published) as HelplineList;
    spoil(list);
    expect(parseHelplineList(list).ok).toBe(false);
  });

  it('rejects a newer schema than it knows, and junk', () => {
    expect(parseHelplineList({ ...(published as object), schema: 2 }).ok).toBe(false);
    expect(parseHelplineList(null).ok).toBe(false);
    expect(parseHelplineList('112').ok).toBe(false);
  });
});

describe('choosing a list', () => {
  const base = bundledList();
  const later = { ...clone(base), updated: '2027-01-01' };

  it('keeps the newer list', () => {
    expect(newer(base, later)).toBe(later);
    expect(newer(later, base)).toBe(later);
  });

  it('saves a newer fetched list', async () => {
    const save = jest.fn();
    await expect(refreshList(base, async () => later, save)).resolves.toEqual(later);
    expect(save).toHaveBeenCalledWith(later);
  });

  it('ignores an older or invalid fetched list', async () => {
    const save = jest.fn();
    await expect(refreshList(later, async () => base, save)).resolves.toBe(later);
    await expect(refreshList(base, async () => ({ schema: 1, public: 'oops' }), save)).resolves.toBe(base);
    expect(save).not.toHaveBeenCalled();
  });

  it('hides people whose listing has lapsed', () => {
    const list = { ...clone(base), people: [person] };
    expect(currentPeople(list, '2027-09-30')).toHaveLength(1);
    expect(currentPeople(list, '2027-10-01')).toHaveLength(0);
  });
});

describe('Help tab', () => {
  it('shows each number with a call button, in English and Hindi', async () => {
    initI18n('en');
    const list = bundledList();
    const view = await render(
      <PreferencesProvider initial={{ language: 'en', theme: 'light' }}>
        <HelplinesView list={list} status="done" today="2026-10-20" />
      </PreferencesProvider>,
    );
    expect(screen.getByRole('button', { name: 'Call 112' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Call 15100' })).toBeTruthy();
    expect(screen.getByText('No one is listed yet.')).toBeTruthy();
    expect(screen.getByText('List updated 2026-10-20')).toBeTruthy();

    await act(() => i18n.changeLanguage('hi'));
    await view.rerender(
      <PreferencesProvider initial={{ language: 'hi', theme: 'light' }}>
        <HelplinesView list={{ ...list, people: [person] }} status="failed" today="2026-10-20" />
      </PreferencesProvider>,
    );
    expect(screen.getByRole('button', { name: '112 पर कॉल करें' })).toBeTruthy();
    expect(screen.getByText('इमरजेंसी (112)')).toBeTruthy();
    expect(screen.getByText('A. Example')).toBeTruthy();
    await act(() => i18n.changeLanguage('en'));
  });
});
