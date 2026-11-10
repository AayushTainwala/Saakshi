import { CERTIFICATE_FILE, CHECKPOINT_TYPE, RECORD_TYPE } from '../constants';
import type { CheckpointRecord, EvidenceRecord } from '../integrity/record';
import { sha256HexSync } from '../integrity/sha256Sync';
import type { CheckpointItem, EvidenceItem, LooseFile, MediaKind, SegmentRef, SessionState, WitnessEntry } from '../types';
import { join, type LockerFiles } from './files';
import { extensionOf, mediaTypeFor } from './media';

/**
 * The locker's bookkeeping for one session (repair round A, group 1). It is an index of the signed
 * records, never the truth itself:
 *
 *   session.json   everything but what the log holds; replaced in one step whenever it changes
 *   session.log    one line per checkpoint and per witness message, only ever added to
 *
 * Reading a session joins the two. If session.json is missing or can't be read, the index is made
 * again from the session's folder: the signed records and checkpoints in records/, the files in
 * media/, the certificate, and the log.
 */
export const INDEX_FILE = 'session.json';
export const LOG_FILE = 'session.log';

export type LogEntries = { checkpoints: CheckpointItem[]; witness: WitnessEntry[] };

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** session.json as a session's state, or null if the text is missing, cut short or not a session's. */
export function parseIndex(text: string | null, id: string): SessionState | null {
  if (!text) return null;
  try {
    const value: unknown = JSON.parse(text);
    if (!isObject(value) || value.version !== 1 || value.id !== id) return null;
    if (!Array.isArray(value.items) || !Array.isArray(value.witness) || typeof value.createdAt !== 'string') return null;
    return value as SessionState;
  } catch {
    return null;
  }
}

export const witnessKey = (entry: WitnessEntry) => `${entry.sentAt}|${entry.chainHead}`;

/** One line of the log. It starts on a new line, so that it never joins a line cut short before it. */
export function logLine(entry: { checkpoint: CheckpointItem } | { witness: WitnessEntry }): string {
  return `\n${JSON.stringify(entry)}\n`;
}

/** The log's entries. A line that can't be read (the last one, cut off mid-write) is ignored. */
export function parseLog(text: string | null): LogEntries {
  const entries: LogEntries = { checkpoints: [], witness: [] };
  for (const line of (text ?? '').split('\n')) {
    if (!line.trim()) continue;
    try {
      const value: unknown = JSON.parse(line);
      if (!isObject(value)) continue;
      const { checkpoint, witness } = value;
      if (isObject(checkpoint) && typeof checkpoint.sequence === 'number' && typeof checkpoint.recording === 'string') {
        entries.checkpoints.push(checkpoint as CheckpointItem);
      } else if (isObject(witness) && typeof witness.sentAt === 'string' && typeof witness.chainHead === 'string') {
        entries.witness.push(witness as WitnessEntry);
      }
    } catch {
      // Cut off mid-write. Its signed record, if it was written, is found by `unlistedRecords`.
    }
  }
  return entries;
}

/** A session as read: session.json with the log's checkpoints and witness messages joined in. */
export function joinLog(base: SessionState, log: LogEntries): SessionState {
  const checkpoints = new Map<number, CheckpointItem>();
  for (const checkpoint of [...(base.checkpoints ?? []), ...log.checkpoints]) checkpoints.set(checkpoint.sequence, checkpoint);
  const witness = new Map<string, WitnessEntry>();
  for (const entry of [...base.witness, ...log.witness]) if (!witness.has(witnessKey(entry))) witness.set(witnessKey(entry), entry);
  const state: SessionState = {
    ...base,
    witness: [...witness.values()].sort((a, b) => a.sentAt.localeCompare(b.sentAt)),
  };
  if (checkpoints.size) state.checkpoints = [...checkpoints.values()].sort((a, b) => a.sequence - b.sequence);
  return state;
}

/** session.json's contents for a state: the state without what the log already holds. */
export function withoutLogged(state: SessionState, log: LogEntries): SessionState {
  const loggedCheckpoints = new Set(log.checkpoints.map((c) => c.sequence));
  const loggedWitness = new Set(log.witness.map(witnessKey));
  const { checkpoints, ...rest } = state;
  const kept = (checkpoints ?? []).filter((c) => !loggedCheckpoints.has(c.sequence));
  return {
    ...rest,
    witness: state.witness.filter((entry) => !loggedWitness.has(witnessKey(entry))),
    ...(kept.length ? { checkpoints: kept } : {}),
  };
}

type SignedRecord = { name: string; sequence: number; body: string; record: EvidenceRecord | CheckpointRecord };

const RECORD_NAME = /^(\d{4,})\.json$/;

function readableRecord(body: string, id: string, sequence: number): EvidenceRecord | CheckpointRecord | null {
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return null;
  }
  if (!isObject(value) || value.session !== id || value.sequence !== sequence || typeof value.id !== 'string') return null;
  const { file, capture } = value;
  if (!isObject(file) || typeof file.sha256 !== 'string' || typeof file.size !== 'number' || typeof file.mediaType !== 'string') return null;
  if (!isObject(capture) || typeof capture.startedAt !== 'string') return null;
  if (value.type === RECORD_TYPE) {
    return typeof file.name === 'string' && typeof capture.endedAt === 'string' ? (value as EvidenceRecord) : null;
  }
  if (value.type === CHECKPOINT_TYPE) {
    return typeof value.recording === 'string' && typeof value.checkpoint === 'number' && typeof capture.checkpointAt === 'string'
      ? (value as CheckpointRecord)
      : null;
  }
  return null;
}

/**
 * The signed records in a session's records/ folder that can be read, in chain order, leaving out
 * the names in `listed`. A record counts only with its signature beside it: one without was cut
 * off while it was being sealed, and nothing was ever told its fingerprint.
 */
function signedRecords(files: LockerFiles, sessionUri: string, id: string, listed: ReadonlySet<string> = new Set()): SignedRecord[] {
  const folder = join(sessionUri, 'records');
  const found: SignedRecord[] = [];
  for (const entry of files.list(folder)) {
    const match = entry.folder ? null : RECORD_NAME.exec(entry.name);
    if (!match || listed.has(entry.name)) continue;
    if (!(files.stat(join(folder, `${entry.name}.sig`))?.size ?? 0)) continue;
    try {
      const body = files.readText(join(folder, entry.name));
      const sequence = Number(match[1]);
      const record = readableRecord(body, id, sequence);
      if (record) found.push({ name: entry.name, sequence, body, record });
    } catch {
      // It can't be read now. It is looked for again the next time the app opens.
    }
  }
  return found.sort((a, b) => a.sequence - b.sequence);
}

/**
 * Each record's SHA-256: as the next record in the chain signed it (`previous.recordSha256`), or,
 * for the last record and one whose successor is missing, worked out from its own bytes.
 */
function recordHashes(records: readonly SignedRecord[]): Map<number, string> {
  const hashes = new Map<number, string>();
  records.forEach((entry, index) => {
    const next = records[index + 1];
    const signedByNext = next && next.sequence === entry.sequence + 1 && next.record.previous?.id === entry.record.id ? next.record.previous.recordSha256 : null;
    hashes.set(entry.sequence, signedByNext ?? sha256HexSync(entry.body));
  });
  return hashes;
}

function kindOf(mediaType: string): MediaKind {
  return mediaType.startsWith('image/') ? 'photo' : mediaType.startsWith('audio/') ? 'audio' : 'video';
}

/** A file's bookkeeping from its signed record. The CRC-32 is not in the record (types.ts, FileDigests). */
function itemOf(entry: SignedRecord & { record: EvidenceRecord }, recordSha256: string): EvidenceItem {
  const { record } = entry;
  const { capture, file } = record;
  return {
    sequence: record.sequence,
    kind: kindOf(file.mediaType),
    segment: record.segment ?? null,
    media: file.name,
    mediaType: file.mediaType,
    startedAt: capture.startedAt,
    endedAt: capture.endedAt,
    status: 'sealed',
    digests: { size: file.size, sha256: file.sha256, sha1: file.sha1, md5: file.md5, crc32: null },
    record: { file: entry.name, recordId: record.id },
    recordSha256,
    ...(record.interrupted ? { interrupted: true } : {}),
    ...(capture.endReason ? { endReason: capture.endReason } : {}),
    ...(record.recording ? { recording: record.recording } : {}),
    ...(capture.mode ? { mode: capture.mode } : {}),
    ...(typeof capture.rotationDegrees === 'number' ? { rotationDegrees: capture.rotationDegrees } : {}),
  };
}

function checkpointOf(entry: SignedRecord & { record: CheckpointRecord }, recordSha256: string): CheckpointItem {
  const { record } = entry;
  return {
    sequence: record.sequence,
    recording: record.recording,
    index: record.checkpoint,
    bytes: record.file.size,
    sha256: record.file.sha256,
    at: record.capture.checkpointAt,
    status: 'sealed',
    record: { file: entry.name, recordId: record.id },
    recordSha256,
    ...(record.capture.mode ? { mode: record.capture.mode } : {}),
  };
}

function indexed(records: readonly SignedRecord[], hashes: ReadonlyMap<number, string>) {
  const items: EvidenceItem[] = [];
  const checkpoints: CheckpointItem[] = [];
  for (const entry of records) {
    const hash = hashes.get(entry.sequence)!;
    if (entry.record.type === RECORD_TYPE) items.push(itemOf(entry as SignedRecord & { record: EvidenceRecord }, hash));
    else checkpoints.push(checkpointOf(entry as SignedRecord & { record: CheckpointRecord }, hash));
  }
  return { items, checkpoints };
}

/**
 * Signed records in the session's folder that its bookkeeping doesn't list, as bookkeeping
 * entries. It happens when the app is killed, or the phone goes off, between a record being
 * written and the bookkeeping being told. Left unlisted, the record would be missing from the
 * bundle, and the next record made would take its number and overwrite it.
 */
export function unlistedRecords(files: LockerFiles, sessionUri: string, state: SessionState): { items: EvidenceItem[]; checkpoints: CheckpointItem[] } {
  const listed = new Set<string>();
  for (const item of state.items) if (item.status === 'sealed' && item.record) listed.add(item.record.file);
  for (const checkpoint of state.checkpoints ?? []) if (checkpoint.record) listed.add(checkpoint.record.file);
  const records = signedRecords(files, sessionUri, state.id, listed);
  const hashes = new Map(records.map((entry) => [entry.sequence, sha256HexSync(entry.body)]));
  const found = indexed(records, hashes);
  // A file hashed before the cut keeps the CRC-32 the bookkeeping already had for it.
  for (const item of found.items) {
    const before = state.items.find((i) => i.sequence === item.sequence)?.digests;
    if (before && before.sha256 === item.digests!.sha256 && before.size === item.digests!.size) item.digests!.crc32 = before.crc32;
  }
  return found;
}

const MEDIA_NAME = /^(\d+)-(?:photo|video|audio|(?:clip|audio)(\d+)-seg(\d+))\./;

/** A file in media/ that no signed record names: what its name and last write say about it. */
function looseItem(name: string, modifiedAt: number, taken: ReadonlySet<number>, spare: () => number): EvidenceItem {
  const match = MEDIA_NAME.exec(name);
  const extension = extensionOf(name);
  const kind: MediaKind = /-photo\./.test(name) ? 'photo' : /-audio/.test(name) ? 'audio' : 'video';
  const segment: SegmentRef | null = match?.[2] !== undefined ? { clip: Number(match[2]), index: Number(match[3]) } : null;
  const numbered = match ? Number(match[1]) : null;
  const at = new Date(modifiedAt).toISOString();
  return {
    // Its own number if that is free; otherwise one below zero, which no record ever has.
    sequence: numbered !== null && !taken.has(numbered) ? numbered : spare(),
    kind,
    segment,
    media: name,
    mediaType: mediaTypeFor(extension, kind),
    startedAt: at,
    endedAt: at,
    status: 'saved',
    noRecord: true,
  };
}

function looseFiles(files: LockerFiles, sessionUri: string): LooseFile[] {
  const found: LooseFile[] = [];
  for (const folder of ['media', 'incoming'] as const) {
    for (const entry of files.list(join(sessionUri, folder))) {
      const stat = entry.folder ? null : files.stat(join(sessionUri, folder, entry.name));
      if (stat) found.push({ folder, name: entry.name, size: stat.size, modifiedAt: stat.modifiedAt });
    }
  }
  return found.sort((a, b) => a.modifiedAt - b.modifiedAt);
}

/**
 * Makes a session's bookkeeping again from what is in its folder, for when session.json is missing
 * or can't be read. The signed records are the truth; this is an index of them.
 *
 * What comes back: every file and checkpoint with a readable signed record (all that the record
 * holds); files in media/ with no record, marked `noRecord`; the certificate, if its PDF is there;
 * and the witness messages in the log. What can't: see the report in docs/handoff/ and the comment
 * on each member in types.ts (the CRC-32s, earlier witness messages, the last check, copies made
 * for sharing, why a file failed to seal).
 *
 * With no signed record to go on, the session comes back as `damaged`, listing the recorded files
 * still in its folder.
 */
export function rebuildSession(files: LockerFiles, id: string, now: Date): SessionState {
  const sessionUri = files.sessionUri(id);
  const records = signedRecords(files, sessionUri, id);
  const { items, checkpoints } = indexed(records, recordHashes(records));

  const named = new Set(items.map((item) => item.media));
  const taken = new Set(records.map((entry) => entry.sequence));
  let below = 0;
  for (const entry of files.list(join(sessionUri, 'media'))) {
    if (entry.folder || named.has(entry.name)) continue;
    const stat = files.stat(join(sessionUri, 'media', entry.name));
    if (!stat) continue;
    const item = looseItem(entry.name, stat.modifiedAt, taken, () => --below);
    taken.add(item.sequence);
    items.push(item);
  }
  items.sort((a, b) => a.sequence - b.sequence);

  const certificate = files.stat(join(sessionUri, CERTIFICATE_FILE));
  const starts = [...items.map((item) => item.startedAt), ...records.map((entry) => entry.record.capture.startedAt)].sort();
  const at = now.toISOString();
  const state: SessionState = {
    version: 1,
    id,
    createdAt: starts[0] ?? at,
    updatedAt: at,
    items,
    witness: [],
    certificate: certificate ? { file: CERTIFICATE_FILE, createdAt: new Date(certificate.modifiedAt).toISOString() } : null,
    ...(checkpoints.length ? { checkpoints } : {}),
    rebuilt: { at },
  };
  if (!records.length) {
    const loose = looseFiles(files, sessionUri);
    return { ...state, items: [], createdAt: loose.length ? new Date(loose[0].modifiedAt).toISOString() : at, damaged: { files: loose } };
  }
  let log: LogEntries = { checkpoints: [], witness: [] };
  try {
    log = parseLog(files.stat(join(sessionUri, LOG_FILE)) ? files.readText(join(sessionUri, LOG_FILE)) : null);
  } catch {
    // The log can't be read either: the signed records have everything but the witness messages.
  }
  // Only the log's witness messages: its checkpoints are the ones just read from their records.
  return joinLog(state, { checkpoints: [], witness: log.witness });
}
