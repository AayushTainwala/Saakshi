import { BUNDLE_TYPE, FORMAT_VERSION } from '../constants';
import type { DeviceKeyFile } from '../integrity/deviceKey';
import type { CheckpointRecord, EvidenceRecord } from '../integrity/record';
import { formatIST } from '../ui/format';
import type { EndReason, SessionState } from '../types';

/** A sealed file as it goes into a bundle. */
export type BundledRecord = {
  record: EvidenceRecord;
  /** File names inside records/ and media/. */
  recordFile: string;
  mediaFile: string;
  recordSha256: string;
};

/** A sealed checkpoint as it goes into a bundle (format 0.5). */
export type BundledCheckpoint = {
  record: CheckpointRecord;
  /** File name inside records/. */
  recordFile: string;
  recordSha256: string;
};

export const CERTIFICATE_FILE = 'certificate-part-a.pdf';

/** `saakshi-8c2d4b6a-20261020-1432.zip`, with the session's start time in IST. */
export function bundleFileName(session: SessionState): string {
  const ist = new Date(new Date(session.createdAt).getTime() + 330 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${ist.getUTCFullYear()}${pad(ist.getUTCMonth() + 1)}${pad(ist.getUTCDate())}-${pad(ist.getUTCHours())}${pad(ist.getUTCMinutes())}`;
  return `saakshi-${session.id.slice(0, 8)}-${stamp}.zip`;
}

/** The SHA-256 of the last record in the chain, a file's or a checkpoint's. */
export function chainHead(records: readonly BundledRecord[], checkpoints: readonly BundledCheckpoint[] = []): string | null {
  let head: { sequence: number; sha: string } | null = null;
  for (const r of [...records, ...checkpoints]) {
    if (!head || r.record.sequence > head.sequence) head = { sequence: r.record.sequence, sha: r.recordSha256 };
  }
  return head?.sha ?? null;
}

export function buildManifest(
  session: SessionState,
  records: readonly BundledRecord[],
  createdAt: Date,
  app: EvidenceRecord['app'],
  hasCertificate: boolean,
  checkpoints: readonly BundledCheckpoint[] = [],
) {
  return {
    type: BUNDLE_TYPE,
    version: FORMAT_VERSION,
    session: session.id,
    createdAt: createdAt.toISOString(),
    app,
    chainHead: chainHead(records, checkpoints),
    records: records.map((r) => ({
      record: `records/${r.recordFile}`,
      signature: `records/${r.recordFile}.sig`,
      media: `media/${r.mediaFile}`,
      recordSha256: r.recordSha256,
      fileSha256: r.record.file.sha256,
      recording: r.record.recording,
    })),
    checkpoints: checkpoints.map((c) => ({
      record: `records/${c.recordFile}`,
      signature: `records/${c.recordFile}.sig`,
      recording: c.record.recording,
      checkpoint: c.record.checkpoint,
      size: c.record.file.size,
      sha256: c.record.file.sha256,
      recordSha256: c.recordSha256,
    })),
    witness: session.witness,
    certificate: hasCertificate ? CERTIFICATE_FILE : null,
    timestamps: [],
  };
}

/** Every end reason in plain words, for the hash report. A new reason without words fails `tsc`. */
const END_REASONS: Record<EndReason, string> = {
  stopped: 'stopped by the user',
  'piece-complete': 'piece complete; recording continued in the next file',
  'app-left':
    'video stopped because Saakshi left the screen or the phone was locked (iPhone records video only while the app is on screen); sound carried on in the next file',
  'camera-in-use': 'iPhone stopped the camera because another app took it',
  'system-pressure': 'iPhone stopped the camera because the phone was under strain, for example too hot',
  'camera-lost': 'the camera was taken by the system or another app',
  'low-battery': 'stopped and saved by the app at 3% battery',
  'audio-interrupted': 'the phone stopped sound recording (for example, for a phone call)',
  'sound-resumed': 'its sound stopped part-way (an interruption, such as a phone call); the next file has sound again (iPhone)',
  'video-resumed': 'sound-only file ended because video with sound started again (iPhone)',
  interrupted: 'cut off (crash or power-off); sealed when the app next opened',
  error: 'camera error',
};

/** A record's end reason in plain words; a reason from a newer format is shown as it is. */
export function describeEndReason(reason: string): string {
  return (END_REASONS as Record<string, string>)[reason] ?? reason;
}

/** One line on a file's checkpoints (format 0.5), signed while it was being written. */
function describeCheckpoints(record: EvidenceRecord, checkpoints: readonly BundledCheckpoint[]): string[] {
  if (!record.recording) return [];
  const own = checkpoints.filter((c) => c.record.recording === record.recording);
  if (!own.length) return [];
  const last = own.reduce((a, b) => (b.record.checkpoint > a.record.checkpoint ? b : a));
  return [
    `      Checkpoints:     ${own.length} signed while it was being recorded (records/${own[0].recordFile} to records/${last.recordFile});`,
    `                       the last, at ${formatIST(last.record.capture.checkpointAt, true)}, covers its first ${groupDigits(last.record.file.size)} bytes`,
  ];
}

function groupDigits(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatPlace(record: Pick<EvidenceRecord, 'location' | 'locationStatus'>): string {
  const { location } = record;
  if (!location) {
    return record.locationStatus === 'denied' ? 'not recorded (location not allowed)' : 'not recorded (no fix)';
  }
  const accuracy = location.accuracyMeters == null ? '' : ` (±${Math.round(location.accuracyMeters)} m)`;
  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}${accuracy}`;
}

export function describeDevice(device: EvidenceRecord['device']): string {
  const name = [device.manufacturer, device.modelName ?? device.model].filter(Boolean).join(' ');
  const model = device.modelName && device.model ? ` (model ${device.model})` : '';
  const os = [device.os, device.osVersion].filter(Boolean).join(' ');
  return `${name || 'unknown'}${model}${os ? `, ${os}` : ''}`;
}

function describeAttestation(key: DeviceKeyFile): string {
  if (!key.attestation) return `none (${key.attestationError ?? 'not available'})`;
  return key.attestation.format === 'android-key-attestation'
    ? `Android Key Attestation, ${key.attestation.certificateChain.length} certificates`
    : 'Apple App Attest';
}

/** The hash report the BSA Schedule asks to be enclosed with the certificate. Plain text, English. */
export function hashReport(
  session: SessionState,
  records: readonly BundledRecord[],
  key: DeviceKeyFile,
  createdAt: Date,
  unsealed: number,
  checkpoints: readonly BundledCheckpoint[] = [],
): string {
  const first = records[0]?.record;
  const lines = [
    'SAAKSHI HASH REPORT',
    `Evidence bundle format ${FORMAT_VERSION} (docs/spec/evidence-bundle.md)`,
    '',
    `Session:          ${session.id}`,
    `Report made:      ${formatIST(createdAt.toISOString(), true)}`,
    `Device:           ${first ? describeDevice(first.device) : 'unknown'}`,
    `App:              ${first ? `${first.app.id} ${first.app.version} (build ${first.app.build})` : 'unknown'}`,
    `Signing key:      ${key.keyId} (ES256, ${key.storage})`,
    `Key attestation:  ${describeAttestation(key)}`,
    'Hash algorithms:  SHA-256 (primary), SHA-1, MD5',
    '',
    `FILES (${records.length})`,
    '',
  ];

  for (const { record, recordFile, mediaFile, recordSha256 } of records) {
    const { capture, file } = record;
    lines.push(
      `${String(record.sequence).padStart(4, '0')}  media/${mediaFile}`,
      `      Recorded:        ${formatIST(capture.startedAt, true)} to ${formatIST(capture.endedAt, true)}`,
      ...(capture.endReason
        ? [`      Ended:           ${describeEndReason(capture.endReason)}${record.interrupted ? ' (end time is the file\'s last write)' : ''}`]
        : []),
      `      Place:           ${formatPlace(record)}`,
      `      Size:            ${groupDigits(file.size)} bytes`,
      `      SHA-256:         ${file.sha256}`,
      `      SHA-1:           ${file.sha1}`,
      `      MD5:             ${file.md5}`,
      `      Record:          records/${recordFile} (signature records/${recordFile}.sig)`,
      `      Record SHA-256:  ${recordSha256}`,
      ...describeCheckpoints(record, checkpoints),
      '',
    );
  }

  if (unsealed > 0) {
    lines.push(`${unsealed} file(s) in this session could not be sealed and are not in this bundle.`, '');
  }

  lines.push(`Chain head (SHA-256 of the last record): ${chainHead(records, checkpoints) ?? 'none'}`, '');

  if (session.witness.length) {
    lines.push('WITNESS MESSAGES');
    for (const w of session.witness) {
      lines.push(`  ${formatIST(w.sentAt, true)}  to ${w.recipients} contact(s), chain head ${w.chainHead}, phone reported: ${w.result}`);
    }
    lines.push('');
  }

  lines.push('Times are India Standard Time (UTC+05:30), from the phone clock. See README.txt to check this bundle.', '');
  return lines.join('\n');
}

export const README = `SAAKSHI EVIDENCE BUNDLE (format ${FORMAT_VERSION})

This bundle holds photos and videos recorded with the Saakshi app, a signed record for each file,
and the public key that checks the signatures. Nothing in it has been edited.

  media/          the original files, exactly as the phone saved them
  records/        one record per file (.json) and its signature (.json.sig); for body-cam, also
                  checkpoints signed every 10 seconds while each file was being recorded
  device-key.json the phone's public key and its hardware attestation
  manifest.json   list of the contents
  hash-report.txt sizes and SHA-256, SHA-1 and MD5 fingerprints of every file

To check it with standard tools (full steps: docs/spec/evidence-bundle.md in the Saakshi repository,
https://github.com/AayushTainwala/Saakshi):

1. Save the "publicKeyPem" value from device-key.json as key.pem.
2. For each record:  openssl dgst -sha256 -verify key.pem -signature records/0000.json.sig records/0000.json
   It must print "Verified OK".
3. For each file:    sha256sum media/<file>   must equal "file.sha256" in its record.
4. For each checkpoint record:  head -c <file.size> media/<file> | sha256sum   must equal its
   "file.sha256", where <file> is the file whose record has the same "recording".
5. Each record's "previous.recordSha256" must equal sha256sum of the record before it.
   The last record's sha256sum is the chain head; compare it with any witness message.

Or run tools/verify-bundle.mjs from the Saakshi repository:  node verify-bundle.mjs <this file>.zip

A certificate under section 63(4)(c) of the Bharatiya Sakshya Adhiniyam, 2023 needs Part A (the
person in charge of the device) and Part B (an expert). certificate-part-a.pdf, if present, is Part A.
`;
