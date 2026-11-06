import i18n, { initI18n } from '@/i18n';

import type { EndReason } from '../types';
import { END_REASON_KEYS, endReasonLabel } from '../ui/endReasons';

describe('why a recording ended, in plain words (fix round 1, group 5)', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('has words for every end reason, in English and Hindi', async () => {
    for (const language of ['en', 'hi']) {
      await i18n.changeLanguage(language);
      const t = i18n.getFixedT(language, 'record');
      for (const [reason, key] of Object.entries(END_REASON_KEYS)) {
        const words = endReasonLabel(t, { endReason: reason as EndReason });
        expect(words).toBeTruthy();
        expect(words).not.toBe(key);
      }
    }
    await i18n.changeLanguage('en');
  });

  it('says what the owner asked for', () => {
    const t = i18n.getFixedT('en', 'record');
    expect(endReasonLabel(t, { endReason: 'stopped' })).toBe('You stopped it.');
    expect(endReasonLabel(t, { endReason: 'low-battery' })).toBe('Battery low: stopped and saved.');
    expect(endReasonLabel(t, { endReason: 'app-left' })).toMatch(/^Stopped when you left Saakshi or locked the phone/);
    // Cut off wins over anything else known.
    expect(endReasonLabel(t, { endReason: 'interrupted', interrupted: true })).toMatch(/^Cut off: the app closed or the phone switched off/);
    expect(endReasonLabel(t, { endReason: 'stopped', interrupted: true })).toMatch(/^Cut off/);
    // Files sealed before end reasons were kept.
    expect(endReasonLabel(t, {})).toBeNull();
  });
});
