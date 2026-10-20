import { deviceLanguage } from '..';

describe('deviceLanguage', () => {
  it('uses Hindi when it is the phone language', () => {
    expect(deviceLanguage([{ languageCode: 'hi' }])).toBe('hi');
  });

  it('takes the first supported language in the phone order', () => {
    expect(deviceLanguage([{ languageCode: 'mr' }, { languageCode: 'hi' }, { languageCode: 'en' }])).toBe('hi');
    expect(deviceLanguage([{ languageCode: 'en' }, { languageCode: 'hi' }])).toBe('en');
  });

  it('falls back to English', () => {
    expect(deviceLanguage([{ languageCode: 'ta' }])).toBe('en');
    expect(deviceLanguage([{ languageCode: null }])).toBe('en');
  });
});
