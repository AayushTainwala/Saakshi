import { alertMessage } from '../alert/message';

const labels = {
  title: 'Saakshi alert: I may need help.',
  location: 'My location',
  noLocation: 'My location: not available',
  sent: 'Sent',
  live: 'Live location',
};

// 20 Oct 2026, 14:32 IST.
const sentAt = new Date('2026-10-20T09:02:00Z');

describe('alertMessage', () => {
  it('carries a map link, accuracy, the time of the fix and the time sent', () => {
    const text = alertMessage(
      {
        status: 'fixed',
        fix: { latitude: 19.076, longitude: 72.8777, accuracyMeters: 19.6, fixedAt: '2026-10-20T09:01:10Z' },
      },
      sentAt,
      labels,
    );
    expect(text).toBe(
      [
        'Saakshi alert: I may need help.',
        'My location: https://maps.google.com/?q=19.07600,72.87770 (±20 m, 14:31 IST)',
        'Sent: 20/10/2026 14:32 IST',
      ].join('\n'),
    );
  });

  it('dates a fix from an earlier day and leaves out an unknown accuracy', () => {
    const text = alertMessage(
      {
        status: 'fixed',
        fix: { latitude: 28.6139, longitude: 77.209, accuracyMeters: null, fixedAt: '2026-10-19T16:00:00Z' },
      },
      sentAt,
      labels,
    );
    expect(text.split('\n')[1]).toBe('My location: https://maps.google.com/?q=28.61390,77.20900 (19/10/2026 21:30 IST)');
  });

  it('says when there is no location', () => {
    expect(alertMessage({ status: 'denied', fix: null }, sentAt, labels)).toBe(
      ['Saakshi alert: I may need help.', 'My location: not available', 'Sent: 20/10/2026 14:32 IST'].join('\n'),
    );
  });
});

describe('alertMessage with live location', () => {
  it('adds the live link before the time sent', () => {
    const text = alertMessage({ status: 'denied', fix: null }, sentAt, labels, 'https://example.org/live/#tok');
    expect(text.split('\n')).toEqual([
      'Saakshi alert: I may need help.',
      'My location: not available',
      'Live location: https://example.org/live/#tok',
      'Sent: 20/10/2026 14:32 IST',
    ]);
  });
});
