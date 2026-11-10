import type { AppInfo, EvidenceRecord } from '../integrity/record';
import { formatIST } from '../ui/format';

/** The first line of every witness message: what it is, and which version of the format. */
export const WITNESS_FORMAT = 'Saakshi witness v1';

/** At most this many SMS parts; most phones join up to about 10, and fewer cost less. */
export const WITNESS_MAX_PARTS = 6;

/** A record's files are listed one by one up to this many; more are counted, and the chain head covers them. */
export const WITNESS_MAX_FILES = 3;

/** The words of the message in the app's language. Times, numbers, hashes and links never change. */
export type WitnessLabels = {
  record: string;
  started: string;
  ended: string;
  length: string;
  place: string;
  noPlace: string;
  /** "within {{m}} m", around the accuracy in metres. */
  accuracy: (metres: number) => string;
  map: string;
  files: string;
  chainHead: string;
  app: string;
  id: string;
};

export type WitnessInput = {
  /** "2026-11-05 10-40 IST Body-cam" (naming.ts). */
  recordName: string;
  sessionId: string;
  /** When the first file started and the last one ended. */
  startedAt: string;
  endedAt: string;
  /** The record's files in chain order: a label ("video 1") and its SHA-256. */
  files: { label: string; sha256: string }[];
  /** SHA-256 of the session's last signed record: it covers every file and checkpoint before it. */
  chainHead: string;
  /** Where the recording started: the first file with a position, if any. */
  place: Pick<EvidenceRecord, 'location'> | null;
  /** The app that signed the records. */
  app: AppInfo;
};

/** "0:12:18": a length that reads the same in every language. */
function clock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const two = (n: number) => String(n).padStart(2, '0');
  return `${Math.floor(total / 3600)}:${two(Math.floor((total % 3600) / 60))}:${two(total % 60)}`;
}

// GSM 03.38's basic set, in which a text part holds 160 characters (153 when joined); anything
// else makes the whole message UCS-2, 70 (67).
const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_EXTENDED = '^{}\\[~]|€';

/** How many SMS parts a text takes. */
export function smsParts(text: string): number {
  let septets = 0;
  let gsm = true;
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) septets += 1;
    else if (GSM_EXTENDED.includes(ch)) septets += 2;
    else {
      gsm = false;
      break;
    }
  }
  if (gsm) return septets <= 160 ? 1 : Math.ceil(septets / 153);
  // UCS-2 counts UTF-16 code units.
  return text.length <= 70 ? 1 : Math.ceil(text.length / 67);
}

/**
 * The witness SMS (docs/spec/evidence-bundle.md, section 9, format v1): which record it is, when it
 * started and ended, where, the fingerprints, and the app. One `label: value` per line in a fixed
 * order, so that software can read it in any language. If it would take more than
 * WITNESS_MAX_PARTS SMS parts, it drops, in turn: the files' own lines (the chain head still covers
 * them), the map link, and the record id.
 */
export function witnessMessage(input: WitnessInput, labels: WitnessLabels): string {
  const location = input.place?.location ?? null;
  const place = location
    ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}${
        location.accuracyMeters == null ? '' : ` (${labels.accuracy(Math.max(1, Math.round(location.accuracyMeters)))})`
      }`
    : labels.noPlace;
  const map = location ? `https://maps.google.com/?q=${location.latitude.toFixed(5)},${location.longitude.toFixed(5)}` : null;
  const app = ['Saakshi', input.app.version, input.app.build ? `(${input.app.build})` : null].filter(Boolean).join(' ');

  const build = (options: { files: boolean; map: boolean; id: boolean }) =>
    [
      WITNESS_FORMAT,
      `${labels.record}: ${input.recordName}`,
      `${labels.started}: ${formatIST(input.startedAt, true)}`,
      `${labels.ended}: ${formatIST(input.endedAt, true)}`,
      `${labels.length}: ${clock(Date.parse(input.endedAt) - Date.parse(input.startedAt))}`,
      `${labels.place}: ${place}`,
      ...(options.map && map ? [`${labels.map}: ${map}`] : []),
      `${labels.files}: ${input.files.length}`,
      ...(options.files && input.files.length <= WITNESS_MAX_FILES ? input.files.map((f) => `${f.label} SHA-256: ${f.sha256}`) : []),
      `${labels.chainHead}: ${input.chainHead}`,
      `${labels.app}: ${app}`,
      ...(options.id ? [`${labels.id}: ${input.sessionId}`] : []),
    ].join('\n');

  const tries = [
    { files: true, map: true, id: true },
    { files: false, map: true, id: true },
    { files: false, map: false, id: true },
    { files: false, map: false, id: false },
  ];
  for (const options of tries) {
    const text = build(options);
    if (smsParts(text) <= WITNESS_MAX_PARTS) return text;
  }
  return build(tries[tries.length - 1]);
}
