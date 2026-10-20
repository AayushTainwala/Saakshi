import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import { RIGHTS_PROMPTS } from '../rights/prompts';
import { RightsOverlay } from '../rights/RightsOverlay';

const lawMd = readFileSync(join(__dirname, '../../../../docs/research/law.md'), 'utf8');

describe('rights prompts', () => {
  it('cite only sources recorded in docs/research/law.md', () => {
    for (const prompt of RIGHTS_PROMPTS) {
      for (const authority of prompt.authority) {
        expect([prompt.id, lawMd.includes(authority.url)]).toEqual([prompt.id, true]);
        expect([prompt.id, lawMd.includes(`### ${authority.lawMd}.`)]).toEqual([prompt.id, true]);
      }
      if (prompt.kind === 'say') expect(prompt.authority.length).toBeGreaterThan(0);
    }
  });

  it('step through and hide over the preview', async () => {
    initI18n('en');
    await render(
      <PreferencesProvider initial={{ language: 'en', theme: 'dark' }}>
        <RightsOverlay />
      </PreferencesProvider>,
    );
    expect(screen.getByText('“Please tell me the grounds of my arrest, and give them to me in writing.”')).toBeTruthy();
    expect(screen.getByText(/Mihir Rajesh Shah/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('“What is your name?”')).toBeTruthy();
    expect(screen.getByText('BNSS s.36(a)')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByText(/grounds of my arrest/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.queryByText(/grounds of my arrest/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Show what to say' }));
    expect(screen.getByText(/grounds of my arrest/)).toBeTruthy();
  });
});
