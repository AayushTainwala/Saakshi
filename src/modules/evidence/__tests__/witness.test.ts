import type { EvidenceRecord } from '../integrity/record';
import { witnessMessage } from '../witness/message';

const labels = { title: 'Saakshi evidence record', time: 'Time', place: 'Place', noPlace: 'not recorded' };

function record(location: EvidenceRecord['location'], status: EvidenceRecord['locationStatus'] = 'fixed') {
  return {
    capture: { startedAt: '2026-10-20T09:02:03.123Z', endedAt: '2026-10-20T09:03:03.140Z' },
    location,
    locationStatus: status,
  } as EvidenceRecord;
}

describe('witnessMessage', () => {
  const head = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';

  it('matches the format in the spec', () => {
    const fix = { latitude: 19.076, longitude: 72.8777, accuracyMeters: 12.6, altitudeMeters: null, fixedAt: '' };
    expect(witnessMessage(head, record(fix), labels)).toBe(
      [
        'Saakshi evidence record',
        `SHA-256: ${head}`,
        'Time: 20/10/2026 14:33 IST',
        'Place: 19.07600, 72.87770 (±13 m)',
      ].join('\n'),
    );
  });

  it('says when there is no place, in the chosen language', () => {
    const hindi = { title: 'साक्षी सबूत रिकॉर्ड', time: 'समय', place: 'जगह', noPlace: 'दर्ज नहीं' };
    expect(witnessMessage(head, record(null, 'denied'), hindi)).toBe(
      ['साक्षी सबूत रिकॉर्ड', `SHA-256: ${head}`, 'समय: 20/10/2026 14:33 IST', 'जगह: दर्ज नहीं'].join('\n'),
    );
  });
});
