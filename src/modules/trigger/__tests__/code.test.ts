import { checkCode, pressDelete, pressDigit, REFUSED_CODES } from '../code';
import { sanitizeTriggerSettings, TriggerSettingsStore } from '../settings';

describe('quick-trigger code', () => {
  it('must be exactly three digits', () => {
    expect(checkCode('473')).toBeNull();
    expect(checkCode('47')).toBe('format');
    expect(checkCode('4731')).toBe('format');
    expect(checkCode('4a3')).toBe('format');
  });

  it.each(['100', '101', '102', '108', '112', '181', '911'])('refuses the emergency number %s', (code) => {
    expect(checkCode(code)).toBe('emergency');
  });

  it('lists only three-digit codes', () => {
    for (const code of REFUSED_CODES) expect(code).toMatch(/^\d{3}$/);
  });
});

describe('code pad', () => {
  it('matches on the third correct digit', () => {
    let state = { entered: '' };
    let result = pressDigit(state, '4', '473');
    expect(result).toEqual({ state: { entered: '4' }, matched: false });
    state = result.state;
    result = pressDigit(state, '7', '473');
    state = result.state;
    result = pressDigit(state, '3', '473');
    expect(result).toEqual({ state: { entered: '' }, matched: true });
  });

  it('clears a wrong code without matching', () => {
    let state = { entered: '' };
    for (const digit of ['4', '7']) state = pressDigit(state, digit, '473').state;
    expect(pressDigit(state, '9', '473')).toEqual({ state: { entered: '' }, matched: false });
  });

  it('deletes the last digit', () => {
    expect(pressDelete({ entered: '47' })).toEqual({ entered: '4' });
    expect(pressDelete({ entered: '' })).toEqual({ entered: '' });
  });
});

describe('trigger settings', () => {
  function memory() {
    let text: string | null = null;
    return new TriggerSettingsStore({ read: () => text, write: (value) => void (text = value) });
  }

  it('saves a valid code and refuses others', () => {
    const store = memory();
    expect(store.setCode('112')).toBe('emergency');
    expect(store.get().code).toBeNull();
    expect(store.setCode('473')).toBeNull();
    expect(store.get()).toEqual({ code: '473', action: 'alert' });
    store.setAction('confiscation');
    store.clearCode();
    expect(store.get()).toEqual({ code: null, action: 'confiscation' });
  });

  it('drops a bad code read from the file', () => {
    expect(sanitizeTriggerSettings({ code: '112', action: 'other' })).toEqual({ code: null, action: 'alert' });
    expect(sanitizeTriggerSettings(null)).toEqual({ code: null, action: 'alert' });
  });
});
