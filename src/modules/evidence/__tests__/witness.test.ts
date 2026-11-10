import { bundleFileName } from '../export/contents';
import type { EvidenceRecord } from '../integrity/record';
import { fileLabels, recordName, stampIST } from '../naming';
import { summarize } from '../locker/summary';
import type { EvidenceItem, SessionState } from '../types';
import { smsParts, WITNESS_MAX_PARTS, witnessMessage, type WitnessLabels } from '../witness/message';
import { buildWitnessMessage } from '../witness/send';

jest.mock('expo-sms', () => ({}));

const english: WitnessLabels = {
  record: 'Record',
  started: 'Started',
  ended: 'Ended',
  length: 'Length',
  place: 'Place',
  noPlace: 'not recorded',
  accuracy: (m) => `within ${m} m`,
  map: 'Map',
  files: 'Files',
  chainHead: 'Whole record SHA-256',
  app: 'App',
  id: 'ID',
};

const hindi: WitnessLabels = {
  record: 'रिकॉर्ड',
  started: 'शुरू',
  ended: 'ख़त्म',
  length: 'अवधि',
  place: 'जगह',
  noPlace: 'दर्ज नहीं',
  accuracy: (m) => `${m} मीटर के अंदर`,
  map: 'नक्शा',
  files: 'फ़ाइलें',
  chainHead: 'पूरे रिकॉर्ड का SHA-256',
  app: 'ऐप',
  id: 'ID',
};

const head = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
const sha = (n: number) => String(n).repeat(64).slice(0, 64);
const place = { location: { latitude: 19.076, longitude: 72.8777, accuracyMeters: 12.6, altitudeMeters: null, fixedAt: '' } };
const input = {
  recordName: '2026-11-06 10-40 IST Body-cam',
  sessionId: '8c2d4b6a-1e3f-4a5b-9c7d-0e1f2a3b4c5d',
  startedAt: '2026-11-06T05:10:12.000Z',
  endedAt: '2026-11-06T05:22:30.000Z',
  files: [
    { label: 'video 1', sha256: sha(1) },
    { label: 'sound 1', sha256: sha(2) },
    { label: 'video 2', sha256: sha(3) },
  ],
  chainHead: head,
  place,
  app: { id: 'in.aayushtainwala.saakshi', version: '1.0.0', build: '7' },
};

describe('witnessMessage (format v1)', () => {
  it('matches the format in the spec', () => {
    expect(witnessMessage(input, english)).toBe(
      [
        'Saakshi witness v1',
        'Record: 2026-11-06 10-40 IST Body-cam',
        'Started: 06/11/2026 10:40:12 IST',
        'Ended: 06/11/2026 10:52:30 IST',
        'Length: 0:12:18',
        'Place: 19.07600, 72.87770 (within 13 m)',
        'Map: https://maps.google.com/?q=19.07600,72.87770',
        'Files: 3',
        `video 1 SHA-256: ${sha(1)}`,
        `sound 1 SHA-256: ${sha(2)}`,
        `video 2 SHA-256: ${sha(3)}`,
        `Whole record SHA-256: ${head}`,
        'App: Saakshi 1.0.0 (7)',
        'ID: 8c2d4b6a-1e3f-4a5b-9c7d-0e1f2a3b4c5d',
      ].join('\n'),
    );
    // Plain characters only, so English stays in the cheaper SMS encoding.
    expect(smsParts(witnessMessage(input, english))).toBeLessThanOrEqual(5);
  });

  it('counts many files, and keeps within six SMS parts in Hindi', () => {
    const many = { ...input, files: [...input.files, { label: 'video 3', sha256: sha(4) }] };
    const text = witnessMessage(many, english);
    expect(text).toContain('Files: 4');
    expect(text).not.toContain('video 1 SHA-256');
    expect(text).toContain(`Whole record SHA-256: ${head}`);

    const inHindi = witnessMessage(input, hindi);
    expect(inHindi.split('\n')[0]).toBe('Saakshi witness v1');
    expect(smsParts(inHindi)).toBeLessThanOrEqual(WITNESS_MAX_PARTS);
    // Hindi is UCS-2: the files' own lines are the first to go, then the map.
    expect(inHindi).toContain(`पूरे रिकॉर्ड का SHA-256: ${head}`);
    expect(inHindi).toContain('शुरू: 06/11/2026 10:40:12 IST');
  });

  it('says when there is no place', () => {
    const text = witnessMessage({ ...input, place: null }, english);
    expect(text).toContain('Place: not recorded');
    expect(text).not.toContain('Map:');
  });

  it('counts SMS parts as phones do', () => {
    expect(smsParts('a'.repeat(160))).toBe(1);
    expect(smsParts('a'.repeat(161))).toBe(2);
    // Characters from GSM's extension table count twice.
    expect(smsParts('[]'.repeat(40))).toBe(1);
    expect(smsParts('[]'.repeat(41))).toBe(2);
    expect(smsParts('अ'.repeat(70))).toBe(1);
    expect(smsParts('अ'.repeat(71))).toBe(2);
    expect(smsParts('±')).toBe(1);
    // One character outside GSM's set makes the whole text UCS-2: 201 characters is 3 parts of 67.
    expect(smsParts(`${'a'.repeat(100)}±${'a'.repeat(100)}`)).toBe(3);
  });
});

describe('names (shared with the bundle)', () => {
  const items: EvidenceItem[] = [
    { sequence: 3, kind: 'video', segment: { clip: 0, index: 0 }, media: '0003.mp4', mediaType: 'video/mp4', startedAt: '2026-11-06T05:10:12.000Z', endedAt: '2026-11-06T05:12:00.000Z', status: 'sealed', mode: 'body-cam' },
    { sequence: 5, kind: 'audio', segment: { clip: 1, index: 0 }, media: '0005.aac', mediaType: 'audio/aac', startedAt: '2026-11-06T05:12:00.000Z', endedAt: '2026-11-06T05:14:00.000Z', status: 'sealed', mode: 'body-cam' },
    { sequence: 9, kind: 'video', segment: { clip: 2, index: 0 }, media: '0009.mp4', mediaType: 'video/mp4', startedAt: '2026-11-06T05:14:00.000Z', endedAt: '2026-11-06T05:22:30.000Z', status: 'sealed', mode: 'body-cam' },
  ];
  const session: SessionState = { version: 1, id: 's', createdAt: '2026-11-06T05:09:00.000Z', updatedAt: '', items, witness: [], certificate: null };

  it('names a record by when it started and what it is, and its files by kind and order', () => {
    expect(recordName(summarize(session))).toBe('2026-11-06 10-40 IST Body-cam');
    expect([...fileLabels(items).entries()]).toEqual([
      [3, 'video 1'],
      [5, 'sound 1'],
      [9, 'video 2'],
    ]);
    expect(stampIST('2026-11-06T05:10:12.000Z', true)).toBe('2026-11-06 10-40-12');
  });

  it('names the bundle as the message names the record (format 0.8)', () => {
    expect(bundleFileName(session)).toBe('Saakshi 2026-11-06 10-40 IST Body-cam.zip');
  });

  it('builds the message from the record, under the chain head', () => {
    const sealed = items.map((i) => ({ ...i, record: { file: `${i.sequence}.json`, recordId: `r${i.sequence}` }, recordSha256: `h${i.sequence}`, digests: { size: 1, sha256: sha(i.sequence), sha1: '', md5: '', crc32: 0 } }));
    const records = new Map(
      sealed.map((i) => [
        i.sequence,
        {
          capture: { startedAt: i.startedAt, endedAt: i.endedAt, mode: 'body-cam' },
          file: { sha256: sha(i.sequence) },
          location: i.sequence === 5 ? place.location : null,
          app: { id: 'x', version: '1.0.0', build: '7' },
        } as unknown as EvidenceRecord,
      ]),
    );
    const { text, chainHead } = buildWitnessMessage({ ...session, items: sealed }, { ...english, kindWord: (k) => (k === 'audio' ? 'sound' : k) }, (i) => records.get(i.sequence)!);
    expect(chainHead).toBe('h9');
    expect(text).toContain('Started: 06/11/2026 10:40:12 IST');
    expect(text).toContain('Ended: 06/11/2026 10:52:30 IST');
    expect(text).toContain('Place: 19.07600, 72.87770 (within 13 m)');
    expect(text).toContain(`sound 1 SHA-256: ${sha(5)}`);
    expect(text).toContain('Whole record SHA-256: h9');
  });
});
