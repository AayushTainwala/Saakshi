import type { BundledRecord } from '../export/contents';
import { certificateHtml, type CertificateDetails, detailsComplete, emptyDetails, escapeHtml, makeAndModel } from '../certificate/html';
import type { EvidenceRecord } from '../integrity/record';

const record = {
  version: '0.1',
  sequence: 0,
  file: { name: '0000-photo.jpg', mediaType: 'image/jpeg', size: 1234567, sha256: 'a'.repeat(64), sha1: 'b'.repeat(40), md5: 'c'.repeat(32) },
  capture: { startedAt: '2026-10-20T09:02:03.123Z', endedAt: '2026-10-20T09:02:03.123Z', hashedAt: '', timeZone: 'Asia/Kolkata', utcOffsetMinutes: 330 },
  location: null,
  locationStatus: 'denied',
  device: { manufacturer: 'Apple', brand: 'Apple', model: 'iPhone15,2', modelName: 'iPhone 14 Pro', os: 'iOS', osVersion: '19.1' },
  app: { id: 'in.aayushtainwala.saakshi', version: '1.0.0', build: '1' },
} as unknown as EvidenceRecord;

const records: BundledRecord[] = [{ record, recordFile: '0000.json', mediaFile: '0000-photo.jpg', recordSha256: 'd'.repeat(64) }];

const details: CertificateDetails = {
  ...emptyDetails,
  name: 'Asha <Rao>',
  relation: 'daughter',
  relativeName: 'R. Rao',
  connection: 'residing',
  address: '12, "Shanti" Nagar & Co., Pune',
  imei: '356938035643809',
  ownership: ['owned', 'operated'],
};

const html = () =>
  certificateHtml({ details, records, chainHead: 'd'.repeat(64), keyId: 'e'.repeat(64), sessionId: 'sess', generatedAt: new Date('2026-10-20T10:00:00Z') });

describe('certificate Part A', () => {
  it('escapes everything the user types', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    expect(html()).toContain('Asha &lt;Rao&gt;');
    expect(html()).toContain('12, &quot;Shanti&quot; Nagar &amp; Co., Pune');
    expect(html()).not.toContain('<Rao>');
  });

  it('keeps the chosen words of the form and strikes the others', () => {
    expect(html()).toContain('<s>Son</s>/<b>daughter</b>/<s>spouse</s> of');
    expect(html()).toContain('<b>residing</b>/<s>employed</s> at');
  });

  it('ticks Mobile, SHA256 and the chosen ownership, and nothing else', () => {
    const out = html();
    expect(out).toContain('&#9746; Mobile');
    expect(out).toContain('&#9746; SHA256:');
    expect(out).toContain('&#9744; SHA1:');
    expect(out).toContain('&#9746; Owned&nbsp;&nbsp; &#9744; Maintained&nbsp;&nbsp; &#9744; Managed&nbsp;&nbsp; &#9746; Operated<br/>\n    by me (select as applicable)');
    expect(out.match(/&#9746;/g)).toHaveLength(4);
  });

  it('pre-fills make, model, IMEI and every file hash, and encloses the hash report', () => {
    const out = html();
    expect(makeAndModel(record)).toBe('Apple iPhone 14 Pro (iPhone15,2)');
    expect(out).toContain('Apple iPhone 14 Pro (iPhone15,2)');
    expect(out).toContain('356938035643809');
    expect(out).toContain(`<td>media/0000-photo.jpg</td><td class="mono">${'a'.repeat(64)}</td>`);
    expect(out).toContain('HASH REPORT');
    expect(out).toContain(`MD5: ${'c'.repeat(32)}`);
    expect(out).toContain('12,34,567 bytes');
  });

  it('says Part B is needed and, until the form text is reviewed, that it is a draft', () => {
    expect(html()).toContain('This is Part A only. Part B must be filled in and signed by an expert');
    expect(html()).toContain('DRAFT: the text of this form has not yet had its final legal review.');
  });

  it('follows the Gazette of India layout: no paragraph numbers, its spelling and dashes', () => {
    const out = html();
    expect(out).not.toContain('<ol>');
    expect(out).toContain('Make &amp; Model:');
    expect(out).toContain('submit as follows:&mdash;');
    expect(out).toContain('or its accuracy. The digital device or the source of the digital record is:&mdash;');
    expect(out).toContain('(Hash report to be enclosed with the certificate)');
  });

  it('needs name, relative, address, IMEI and one ownership box', () => {
    expect(detailsComplete(details)).toBe(true);
    expect(detailsComplete({ ...details, imei: ' ' })).toBe(false);
    expect(detailsComplete({ ...details, ownership: [] })).toBe(false);
  });
});
