import { act } from '@testing-library/react-native';

import i18n, { initI18n } from '@/i18n';
import { isGsm, smsParts } from '@/platform/sms';

import { shareLabels } from '../alert/live';
import { type AlertLabels, alertMessage, shareMessage } from '../alert/message';

// The app's real words, in the language set at the moment (as the alert controller reads them).
function alertLabels(): AlertLabels {
  return {
    title: i18n.t('sos:message.title'),
    location: i18n.t('sos:message.location'),
    noLocation: i18n.t('sos:message.noLocation'),
    accuracy: (meters) => i18n.t('sos:message.accuracy', { meters }),
    live: i18n.t('sos:message.live'),
    battery: (percent) => i18n.t('sos:message.battery', { percent }),
    batteryUnknown: i18n.t('sos:message.batteryUnknown'),
    sent: i18n.t('sos:message.sent'),
  };
}

// 20 Oct 2026, 14:32 IST.
const sentAt = new Date('2026-10-20T09:02:00Z');
const fixed = {
  status: 'fixed' as const,
  fix: { latitude: 19.076, longitude: 72.8777, accuracyMeters: 19.6, fixedAt: '2026-10-20T09:01:10Z' },
};
// The real viewer address and a token as long as the server makes (24 characters).
const liveLink = 'https://aayushtainwala.github.io/Saakshi/live/#AbCdEfGhIjKlMnOpQrStUvWx';

/**
 * The budget (round 2, group 1.4; stated in BUILD_HANDOFF.md): "I need help" in at most 2 SMS parts
 * in English and 5 in Hindi; "Share my location" in 1 part in English and 3 in Hindi.
 */
const BUDGET = { alert: { en: 2, hi: 5 }, share: { en: 1, hi: 3 } };

describe('"I need help" (SPEC 5.2)', () => {
  beforeAll(() => {
    initI18n('en');
  });
  afterEach(async () => {
    await act(() => i18n.changeLanguage('en'));
  });

  it('carries the map link with accuracy and time, the live link, the battery and the time sent', () => {
    expect(alertMessage(fixed, sentAt, alertLabels(), { liveLink, battery: 82 }).split('\n')).toEqual([
      'Saakshi alert: I may need help.',
      'My location: https://maps.google.com/?q=19.07600,72.87770 (within 20 m, 14:31 IST)',
      `Live location: ${liveLink}`,
      'Battery: 82%',
      'Sent: 20/10/2026 14:32 IST',
    ]);
  });

  it('says when the battery level or the position is not known, and goes without a live link', () => {
    expect(alertMessage({ status: 'denied', fix: null }, sentAt, alertLabels(), { battery: null }).split('\n')).toEqual([
      'Saakshi alert: I may need help.',
      'My location: not available',
      'Battery: not known',
      'Sent: 20/10/2026 14:32 IST',
    ]);
  });

  it('dates a fix from an earlier day and leaves out an unknown accuracy', () => {
    const old = { status: 'fixed' as const, fix: { latitude: 28.6139, longitude: 77.209, accuracyMeters: null, fixedAt: '2026-10-19T16:00:00Z' } };
    expect(alertMessage(old, sentAt, alertLabels(), { battery: 5 }).split('\n')[1]).toBe(
      'My location: https://maps.google.com/?q=28.61390,77.20900 (19/10/2026 21:30 IST)',
    );
  });

  it('ends each link at the end of its line', () => {
    const lines = alertMessage(fixed, sentAt, alertLabels(), { liveLink, battery: 82 }).split('\n');
    expect(lines[2].endsWith(liveLink)).toBe(true);
    expect(lines[1]).toMatch(/72\.87770 \(/);
  });

  it('stays in GSM characters in English, within its budget at the longest', () => {
    // The longest it gets: a far-off place, poor accuracy, a fix from another day, a full battery.
    const worst = {
      status: 'fixed' as const,
      fix: { latitude: -33.8688, longitude: -151.2093, accuracyMeters: 4999, fixedAt: '2026-10-19T16:00:00Z' },
    };
    const text = alertMessage(worst, sentAt, alertLabels(), { liveLink, battery: 100 });
    expect(isGsm(text)).toBe(true);
    expect(smsParts(text)).toBeLessThanOrEqual(BUDGET.alert.en);
  });

  it('in Hindi, every field is there, within its budget', async () => {
    await act(() => i18n.changeLanguage('hi'));
    const worst = {
      status: 'fixed' as const,
      fix: { latitude: -33.8688, longitude: -151.2093, accuracyMeters: 4999, fixedAt: '2026-10-19T16:00:00Z' },
    };
    const text = alertMessage(worst, sentAt, alertLabels(), { liveLink, battery: 100 });
    expect(text.split('\n')).toEqual([
      'साक्षी अलर्ट: मुझे मदद की ज़रूरत हो सकती है।',
      'मेरी लोकेशन: https://maps.google.com/?q=-33.86880,-151.20930 (4999 मीटर के भीतर, 19/10/2026 21:30 IST)',
      `लाइव लोकेशन: ${liveLink}`,
      'बैटरी: 100%',
      'भेजा गया: 20/10/2026 14:32 IST',
    ]);
    expect(smsParts(text)).toBeLessThanOrEqual(BUDGET.alert.hi);
  });
});

describe('"Share my location": a calm message, not an alert (SPEC 5.2)', () => {
  const share = { link: liveLink, expiresAt: '2026-10-20T13:10:00Z' };

  beforeAll(() => {
    initI18n('en');
  });
  afterEach(async () => {
    await act(() => i18n.changeLanguage('en'));
  });

  it('says until when, the battery level, and the link last', () => {
    expect(shareMessage(share, 82, shareLabels())).toBe(
      `I'm sharing my location with you until 18:40 IST. Battery 82%.\nFollow it here: ${liveLink}`,
    );
  });

  it('reads as no alert', () => {
    const text = shareMessage(share, 82, shareLabels());
    expect(text).not.toMatch(/alert|help|danger|SOS/i);
  });

  it('for a share with no fixed end, says until I stop; and leaves out an unknown battery', () => {
    expect(shareMessage({ ...share, persistent: true }, null, shareLabels())).toBe(
      `I'm sharing my location with you until I stop.\nFollow it here: ${liveLink}`,
    );
  });

  it('fits its budget in English (GSM) and in Hindi', async () => {
    const english = shareMessage(share, 100, shareLabels());
    expect(isGsm(english)).toBe(true);
    expect(smsParts(english)).toBeLessThanOrEqual(BUDGET.share.en);
    await act(() => i18n.changeLanguage('hi'));
    const hindi = shareMessage({ ...share, persistent: true }, 100, shareLabels());
    expect(hindi).toBe(`मेरी लोकेशन आपके साथ तब तक शेयर हो रही है जब तक मैं बंद न करूँ। बैटरी 100%।\nयहाँ देखें: ${liveLink}`);
    expect(smsParts(hindi)).toBeLessThanOrEqual(BUDGET.share.hi);
    expect(smsParts(shareMessage(share, 100, shareLabels()))).toBeLessThanOrEqual(BUDGET.share.hi);
  });
});
