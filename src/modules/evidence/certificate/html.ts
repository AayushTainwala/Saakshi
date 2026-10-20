import { describeDevice, formatPlace } from '../export/contents';
import type { BundledRecord } from '../export/contents';
import type { EvidenceRecord } from '../integrity/record';
import { formatIST } from '../ui/format';

/**
 * Part A of the certificate in the Schedule to the Bharatiya Sakshya Adhiniyam, 2023 (s.63(4)(c)).
 *
 * The wording and layout follow the Gazette of India text of the Schedule (Extraordinary, Part II,
 * Section 1, No. 55, 25 December 2023, pp.46-47), transcribed in docs/research/law.md, section 1B.
 * Part A's paragraphs are unnumbered there, so they are unnumbered here. The only additions are
 * the tick boxes and the table that fills the hash blank. NEEDS OWNER REVIEW: once the owner signs
 * off the text, set FORM_TEXT_REVIEWED to true so the draft notice is no longer printed.
 */
export const FORM_TEXT_REVIEWED = false;

export type Relation = 'son' | 'daughter' | 'spouse';
export type Connection = 'residing' | 'employed';
export type Ownership = 'owned' | 'maintained' | 'managed' | 'operated';

/** What the user types in. Kept on the phone for the next certificate. */
export type CertificateDetails = {
  name: string;
  relation: Relation;
  relativeName: string;
  connection: Connection;
  address: string;
  imei: string;
  color: string;
  serialNumber: string;
  otherInfo: string;
  ownership: Ownership[];
};

export const emptyDetails: CertificateDetails = {
  name: '',
  relation: 'son',
  relativeName: '',
  connection: 'residing',
  address: '',
  imei: '',
  color: '',
  serialNumber: '',
  otherInfo: '',
  ownership: [],
};

export function detailsComplete(d: CertificateDetails): boolean {
  return !!(d.name.trim() && d.relativeName.trim() && d.address.trim() && d.imei.trim() && d.ownership.length);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const box = (ticked: boolean) => (ticked ? '&#9746;' : '&#9744;');
const blank = (value: string, width = 14) =>
  value.trim() ? `<u>&nbsp;${escapeHtml(value.trim())}&nbsp;</u>` : `<span class="blank">${'&nbsp;'.repeat(width)}</span>`;

/** "Son/daughter/spouse of": the chosen word stays, the others are struck through. */
function choose<T extends string>(options: readonly T[], chosen: T, labels?: Partial<Record<T, string>>): string {
  return options
    .map((o) => {
      const label = labels?.[o] ?? o;
      return o === chosen ? `<b>${label}</b>` : `<s>${label}</s>`;
    })
    .join('/');
}

export function makeAndModel(record: EvidenceRecord): string {
  const { manufacturer, model, modelName } = record.device;
  return [manufacturer, modelName ?? model, modelName && model ? `(${model})` : null].filter(Boolean).join(' ');
}

const SOURCES = ['Computer/Storage Media', 'DVR', 'Mobile', 'Flash Drive', 'CD/DVD', 'Server', 'Cloud'] as const;
const OWNERSHIP: readonly Ownership[] = ['owned', 'maintained', 'managed', 'operated'];
const OWNERSHIP_LABEL: Record<Ownership, string> = {
  owned: 'Owned',
  maintained: 'Maintained',
  managed: 'Managed',
  operated: 'Operated',
};

export type CertificateInput = {
  details: CertificateDetails;
  records: readonly BundledRecord[];
  chainHead: string;
  keyId: string;
  sessionId: string;
  generatedAt: Date;
};

export function certificateHtml(input: CertificateInput): string {
  const { details: d, records } = input;
  const first = records[0].record;
  const hashes = records
    .map((r) => `<tr><td>media/${escapeHtml(r.mediaFile)}</td><td class="mono">${r.record.file.sha256}</td></tr>`)
    .join('');

  const draft = FORM_TEXT_REVIEWED
    ? ''
    : '<p class="draft">DRAFT: the text of this form has not yet had its final legal review.</p>';

  const reportRows = records
    .map(({ record, mediaFile, recordFile, recordSha256 }) => {
      const f = record.file;
      return `<tr>
        <td>${String(record.sequence).padStart(4, '0')}</td>
        <td>media/${escapeHtml(mediaFile)}<br/>${formatIST(record.capture.startedAt, true)} to ${formatIST(record.capture.endedAt, true)}<br/>${escapeHtml(formatPlace(record))}<br/>${f.size.toLocaleString('en-IN')} bytes</td>
        <td class="mono">SHA-256: ${f.sha256}<br/>SHA-1: ${f.sha1}<br/>MD5: ${f.md5}<br/>Record (records/${escapeHtml(recordFile)}) SHA-256: ${recordSha256}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.45; color: #000; }
  h1 { font-size: 15pt; text-align: center; margin: 0; }
  h2 { font-size: 12.5pt; text-align: center; margin: 4pt 0 10pt; }
  .sub { text-align: center; margin: 0 0 6pt; }
  .parta p { margin: 0 0 8pt; }
  .blank { border-bottom: 1px dotted #000; }
  .mono { font-family: "Courier New", Courier, monospace; font-size: 8.5pt; word-break: break-all; }
  table { border-collapse: collapse; width: 100%; margin: 4pt 0; }
  td, th { border: 1px solid #000; padding: 3pt 4pt; vertical-align: top; font-size: 9.5pt; text-align: left; }
  .sign td { border: none; padding: 6pt 0; font-size: 12pt; }
  .draft { border: 2px solid #000; padding: 6pt; font-weight: bold; text-align: center; }
  .note { border: 1px solid #000; padding: 6pt; font-size: 10.5pt; }
  .page { page-break-before: always; }
  .small { font-size: 9.5pt; }
</style></head>
<body>
${draft}
<h1>CERTIFICATE</h1>
<p class="sub">[See section 63(4)(c)]</p>
<h2>PART A<br/>(To be filled by the Party)</h2>
<div class="parta">
  <p>I, ${blank(d.name, 30)} (Name), ${choose(['son', 'daughter', 'spouse'] as const, d.relation, { son: 'Son' })} of ${blank(d.relativeName, 30)}
    ${choose(['residing', 'employed'] as const, d.connection)} at ${blank(d.address, 40)} do hereby solemnly affirm and sincerely state and submit as follows:&mdash;</p>
  <p>I have produced electronic record/output of the digital record taken from the following device/digital record source (tick mark):&mdash;<br/>
    ${SOURCES.map((s) => `${box(s === 'Mobile')} ${s}`).join('&nbsp;&nbsp; ')}&nbsp;&nbsp; ${box(false)} Other<br/>
    Other: ${blank('', 14)}<br/>
    Make &amp; Model: ${blank(makeAndModel(first))}&nbsp;&nbsp; Color: ${blank(d.color)}<br/>
    Serial Number: ${blank(d.serialNumber)}<br/>
    IMEI/UIN/UID/MAC/Cloud ID${blank(d.imei, 24)} (as applicable)<br/>
    and any other relevant information, if any, about the device/digital record${blank(d.otherInfo, 30)}(specify).</p>
  <p>The digital device or the digital record source was under the lawful control for regularly creating, storing or processing information for the purposes of carrying out regular activities and during this period, the computer or the communication device was working properly and the relevant information was regularly fed into the computer during the ordinary course of business. If the computer/digital device at any point of time was not working properly or out of operation, then it has not affected the electronic/digital record or its accuracy. The digital device or the source of the digital record is:&mdash;<br/>
    ${OWNERSHIP.map((o) => `${box(d.ownership.includes(o))} ${OWNERSHIP_LABEL[o]}`).join('&nbsp;&nbsp; ')}<br/>
    by me (select as applicable).</p>
  <p>I state that the HASH value/s of the electronic/digital record/s is
    <table><tr><th>Electronic record</th><th>Hash value</th></tr>${hashes}</table>
    obtained through the following algorithm:&mdash;<br/>
    ${box(false)} SHA1:<br/>
    ${box(true)} SHA256:<br/>
    ${box(false)} MD5:<br/>
    ${box(false)} Other${blank('', 10)} (Legally acceptable standard)<br/>
    (Hash report to be enclosed with the certificate)</p>
</div>
<table class="sign">
  <tr><td>(Name and signature)</td><td>${blank('', 40)}</td></tr>
  <tr><td>Date (DD/MM/YYYY):</td><td>${blank('', 20)}</td></tr>
  <tr><td>Time (IST):</td><td>${blank('', 10)} hours (In 24 hours format)</td></tr>
  <tr><td>Place:</td><td>${blank('', 30)}</td></tr>
</table>
<p class="note">Section 63(4)(c) of the Bharatiya Sakshya Adhiniyam, 2023 requires the certificate to be signed by the person in charge of the device <i>and</i> by an expert. This is Part A only. Part B must be filled in and signed by an expert; this app cannot provide it.</p>

<div class="page">
<h1>HASH REPORT</h1>
<p class="sub">Enclosed with the certificate under section 63(4)(c), Part A</p>
<p class="small">Device: ${escapeHtml(describeDevice(first.device))}<br/>
Recorded with: ${escapeHtml([first.app.id, first.app.version].filter(Boolean).join(' '))} (Saakshi evidence bundle format ${escapeHtml(first.version)})<br/>
Session: ${escapeHtml(input.sessionId)}<br/>
Signing key: <span class="mono">${escapeHtml(input.keyId)}</span><br/>
Report made: ${formatIST(input.generatedAt.toISOString(), true)}. Times are India Standard Time, from the phone's clock.</p>
<table><tr><th>No.</th><th>File, time, place, size</th><th>Hash values</th></tr>${reportRows}</table>
<p class="small">Chain head (SHA-256 of the last signed record, which includes the hashes of every record and file before it):<br/><span class="mono">${escapeHtml(input.chainHead)}</span></p>
<p class="small">Each file's record is signed with a key held in the phone's security hardware. The files, records, signatures and public key are in the Saakshi evidence bundle exported with this certificate; README.txt in the bundle explains how to check them.</p>
</div>
</body></html>`;
}
