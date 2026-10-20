import { defaultPreferences, sanitizePreferences } from '../store';

describe('sanitizePreferences', () => {
  it('keeps valid values', () => {
    expect(sanitizePreferences({ language: 'hi', theme: 'dark' })).toEqual({ language: 'hi', theme: 'dark' });
  });

  it('replaces invalid fields with defaults, one by one', () => {
    expect(sanitizePreferences({ language: 'fr', theme: 'dark' })).toEqual({ language: 'system', theme: 'dark' });
    expect(sanitizePreferences({ language: 'en', theme: 7 })).toEqual({ language: 'en', theme: 'system' });
  });

  it('handles junk', () => {
    expect(sanitizePreferences(null)).toEqual(defaultPreferences);
    expect(sanitizePreferences('hi')).toEqual(defaultPreferences);
  });
});
