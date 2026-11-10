import { BUNDLE_TYPE, CERTIFICATE_FILE, FORMAT_VERSION } from '../constants';
import type { DeviceKeyFile } from '../integrity/deviceKey';
import type { CheckpointRecord, EvidenceRecord } from '../integrity/record';
import type { RecordSummary } from '../locker/summary';
import { summarize } from '../locker/summary';
import { recordName } from '../naming';
import { formatIST } from '../ui/format';
import type { CaptureMode, EndReason, EvidenceItem, SessionState } from '../types';
import { CERTIFICATE_NAME, README_NAME, RECORDS_FOLDER } from './layout';

/** A sealed file as it goes into a bundle. */
export type BundledRecord = {
  record: EvidenceRecord;
  /** The app's own names for the record and the file, in the session folder. */
  recordFile: string;
  mediaFile: string;
  recordSha256: string;
  /** Where the file and its record go in the bundle (format 0.8, `layout.ts`). */
  mediaPath: string;
  recordPath: string;
};

/** A sealed checkpoint as it goes into a bundle (format 0.5). */
export type BundledCheckpoint = {
  record: CheckpointRecord;
  /** The app's own name for the record, in the session folder. */
  recordFile: string;
  recordSha256: string;
  /** Where the record goes in the bundle (format 0.8). */
  recordPath: string;
};

/** The certificate's name in the session folder; in the bundle it is CERTIFICATE_NAME. */
export { CERTIFICATE_FILE };

/** "2026-11-05 10-40 IST Body-cam", as the app and the witness message name the record. */
export function bundleRecordName(session: SessionState, recordMode?: (item: EvidenceItem) => CaptureMode | null): string {
  const summary: RecordSummary = summarize(session, recordMode);
  return recordName(summary);
}

/**
 * The bundle's file name, "Saakshi 2026-11-05 10-40 IST Body-cam.zip": when the recording started
 * and what it is, as the app and the witness message name it (fix round 1, groups 7 and 9).
 */
export function bundleFileName(session: SessionState, recordMode?: (item: EvidenceItem) => CaptureMode | null): string {
  return `Saakshi ${bundleRecordName(session, recordMode)}.zip`;
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
  name: string = bundleRecordName(session),
) {
  return {
    type: BUNDLE_TYPE,
    version: FORMAT_VERSION,
    session: session.id,
    name,
    createdAt: createdAt.toISOString(),
    app,
    chainHead: chainHead(records, checkpoints),
    records: records.map((r) => ({
      record: r.recordPath,
      signature: `${r.recordPath}.sig`,
      media: r.mediaPath,
      recordId: r.record.id,
      fileName: r.record.file.name,
      recordSha256: r.recordSha256,
      fileSha256: r.record.file.sha256,
      recording: r.record.recording,
    })),
    checkpoints: checkpoints.map((c) => ({
      record: c.recordPath,
      signature: `${c.recordPath}.sig`,
      recordId: c.record.id,
      recording: c.record.recording,
      checkpoint: c.record.checkpoint,
      size: c.record.file.size,
      sha256: c.record.file.sha256,
      recordSha256: c.recordSha256,
    })),
    witness: session.witness,
    certificate: hasCertificate ? CERTIFICATE_NAME : null,
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
  'storage-sound-only':
    'video stopped by the app because the phone was down to the free room the user keeps; recording carried on as sound only in the next file',
  'storage-full': 'stopped and saved by the app because the phone was running out of free room',
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
  const first = own.reduce((a, b) => (b.record.checkpoint < a.record.checkpoint ? b : a));
  const number = (c: BundledCheckpoint) => String(c.record.sequence).padStart(4, '0');
  return [
    `      Checkpoints:     ${own.length} signed while it was being recorded (${RECORDS_FOLDER}/, ${number(first)} to ${number(last)});`,
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
  name: string = bundleRecordName(session),
): string {
  const first = records[0]?.record;
  const lines = [
    'SAAKSHI HASH REPORT',
    `Evidence bundle format ${FORMAT_VERSION} (docs/spec/evidence-bundle.md)`,
    '',
    `Record:           ${name}`,
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

  for (const { record, mediaPath, recordPath, recordSha256 } of records) {
    const { capture, file } = record;
    lines.push(
      `${String(record.sequence).padStart(4, '0')}  ${mediaPath}`,
      `      Name in record:  ${file.name} (the app's name for the file)`,
      `      Started:         ${formatIST(capture.startedAt, true)}`,
      `      Ended:           ${formatIST(capture.endedAt, true)}`,
      ...(capture.endReason
        ? [`      Ended:           ${describeEndReason(capture.endReason)}${record.interrupted ? ' (end time is the file\'s last write)' : ''}`]
        : []),
      `      Place:           ${formatPlace(record)}`,
      `      Size:            ${groupDigits(file.size)} bytes`,
      `      SHA-256:         ${file.sha256}`,
      `      SHA-1:           ${file.sha1}`,
      `      MD5:             ${file.md5}`,
      `      Record:          ${recordPath} (signature ${recordPath}.sig)`,
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

  lines.push(`Times are India Standard Time (UTC+05:30), from the phone clock. See ${README_NAME} to check this bundle.`, '');
  return lines.join('\n');
}
