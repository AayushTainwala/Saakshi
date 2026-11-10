#!/usr/bin/env node
// Checks a Saakshi evidence bundle (docs/spec/evidence-bundle.md, section 10, steps 2 to 5):
// the public key matches its id, every record's signature verifies, every file matches its record,
// and the records form an unbroken chain. From format 0.5 it also checks every checkpoint: that the
// first bytes of its file, as many as the checkpoint names, have the SHA-256 it signed. It does not
// check the key attestation (step 6).
//
// From format 0.8 the bundle's files have names a person can read ("Original files/…",
// "Signed records/…"); manifest.json says which file goes with which record. Older bundles keep
// media/ and records/, where each file is named as in its record.
//
// Usage: node verify-bundle.mjs <bundle.zip | unzipped folder>
// Needs Node.js 18 or later and nothing else. Exits 0 if the bundle checks out, 1 if not.

import { createHash, createPublicKey, verify } from 'node:crypto';
import { closeSync, createReadStream, existsSync, openSync, readdirSync, readFileSync, readSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';

const SUPPORTED_VERSIONS = ['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '0.10'];
/**
 * From 0.10 (free storage, stage one) a file may end with `capture.endReason` "storage-full" (the
 * app stopped it cleanly for lack of room) or "storage-sound-only" (a body-cam video file closed at
 * the keep-free amount, with sound carrying on in the next file). An older record must not.
 */
const STORAGE_END_REASONS = ['storage-full', 'storage-sound-only'];
/**
 * From 0.9 a record may carry `capture.batteryPercent` (a whole number, 0 to 100) and, for a
 * sound-only record (`capture.mode` "bug", Pocket recording), `capture.startedFrom` ("pocket" or
 * "phone-taken"). Both are optional; an older record must not have them.
 */
function newMemberProblems(record) {
  const problems = [];
  const capture = record.capture ?? {};
  const before09 = SUPPORTED_VERSIONS.indexOf(record.version) < SUPPORTED_VERSIONS.indexOf('0.9');
  if ('batteryPercent' in capture) {
    if (before09) problems.push(`capture.batteryPercent is not part of format ${record.version}`);
    const value = capture.batteryPercent;
    if (!Number.isInteger(value) || value < 0 || value > 100) problems.push(`capture.batteryPercent must be a whole number from 0 to 100, not ${JSON.stringify(value)}`);
  }
  if (STORAGE_END_REASONS.includes(capture.endReason)) {
    if (SUPPORTED_VERSIONS.indexOf(record.version) < SUPPORTED_VERSIONS.indexOf('0.10')) {
      problems.push(`capture.endReason "${capture.endReason}" is not part of format ${record.version}`);
    }
    if (capture.endReason === 'storage-sound-only' && capture.mode !== 'body-cam') {
      problems.push('capture.endReason "storage-sound-only" is only for a body-cam file');
    }
    if (record.interrupted) problems.push(`a file cut off can't have ended with "${capture.endReason}"`);
  }
  if ('startedFrom' in capture) {
    if (before09) problems.push(`capture.startedFrom is not part of format ${record.version}`);
    if (capture.mode !== 'bug') problems.push('capture.startedFrom is only for a sound-only (Pocket recording) record');
    if (capture.startedFrom !== 'pocket' && capture.startedFrom !== 'phone-taken') {
      problems.push(`capture.startedFrom must be "pocket" or "phone-taken", not ${JSON.stringify(capture.startedFrom)}`);
    }
  }
  return problems;
}

// Where the records are: records/ up to 0.7, "Signed records/" from 0.8.
const RECORD_PATH = /^(records|Signed records)\/[^/]+\.json$/;
// Where the originals are: media/ up to 0.7, "Original files/" from 0.8.
const NEW_RECORDS = 'Signed records/';
const NEW_MEDIA = 'Original files/';

// The files at the top of a bundle, besides the two folders. key.pem is the file README.txt's
// step 1 asks the reader to make.
const NEW_TOP = ['README.txt', 'Hash report.txt', 'Certificate Part A.pdf', 'manifest.json', 'device-key.json', 'key.pem'];
const OLD_TOP = ['README.txt', 'hash-report.txt', 'certificate-part-a.pdf', 'manifest.json', 'device-key.json', 'key.pem'];

const two = (n) => String(n).padStart(2, '0');

/** "2026-11-05 10-40-12", India Standard Time (UTC+05:30), as in file names from 0.8. */
function stampIST(iso) {
  const d = new Date(Date.parse(iso) + 330 * 60 * 1000);
  return `${d.getUTCFullYear()}-${two(d.getUTCMonth() + 1)}-${two(d.getUTCDate())} ${two(d.getUTCHours())}-${two(d.getUTCMinutes())}-${two(d.getUTCSeconds())}`;
}

/** The word a 0.8 name uses for a file's kind, from its media type. */
function kindWord(mediaType) {
  if (typeof mediaType !== 'string') return null;
  if (mediaType.startsWith('image/')) return 'photo';
  if (mediaType.startsWith('audio/')) return 'sound';
  if (mediaType.startsWith('video/')) return 'video';
  return null;
}

/**
 * The names a 0.8 bundle must give each record and file, worked out from the signed records alone
 * (docs/spec/evidence-bundle.md, section 7): so a name a person reads, such as the time a video
 * started, is as trustworthy as the record. `records` are in chain order.
 */
function expectedNames(records) {
  const counts = new Map();
  const labelOf = new Map();
  const names = new Map();
  for (const { name, record } of records) {
    if (!record || record.type !== RECORD_TYPE) continue;
    const word = kindWord(record.file?.mediaType);
    if (!word || typeof record.capture?.startedAt !== 'string' || Number.isNaN(Date.parse(record.capture.startedAt))) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
    const label = `${word} ${counts.get(word)}`;
    const extension = /\.[^./]+$/.exec(record.file?.name ?? '')?.[0] ?? '';
    names.set(name, {
      record: `${NEW_RECORDS}${String(record.sequence).padStart(4, '0')} ${label}.json`,
      media: `${NEW_MEDIA}${stampIST(record.capture.startedAt)} IST ${label}${extension}`,
    });
    if (record.recording) labelOf.set(record.recording, label);
  }
  for (const { name, record } of records) {
    if (!record || record.type !== CHECKPOINT_TYPE) continue;
    const label = labelOf.get(record.recording);
    names.set(name, { record: `${NEW_RECORDS}${String(record.sequence).padStart(4, '0')} ${label ? `${label} ` : ''}checkpoint ${record.checkpoint}.json` });
  }
  return names;
}

/**
 * Files a computer adds when a bundle is unzipped or opened, and nothing else: macOS's .DS_Store,
 * ._ files and __MACOSX/ folder, and Windows's Thumbs.db and desktop.ini. Only plain names count.
 */
function ignored(name) {
  if (!plainPath(name.endsWith('/') ? name.slice(0, -1) : name)) return false;
  const base = name.split('/').filter(Boolean).at(-1) ?? '';
  return name.startsWith('__MACOSX/') || base === '.DS_Store' || base.startsWith('._') || base === 'Thumbs.db' || base === 'desktop.ini';
}

/** A plain path inside the bundle: no "..", no leading "/", no backslash, no empty part. */
function plainPath(name) {
  return typeof name === 'string' && !name.includes('\\') && name.split('/').every((part) => part !== '' && part !== '.' && part !== '..');
}
const RECORD_TYPE = 'saakshi.evidence.record';
const CHECKPOINT_TYPE = 'saakshi.evidence.checkpoint';

// ---- Reading a bundle from a folder or a stored (uncompressed) ZIP --------------------------

function folderSource(dir) {
  return {
    has: (name) => existsSync(join(dir, name)),
    names: () => listFolder(dir, ''),
    problems: () => [],
    read: (name) => readFileSync(join(dir, name)),
    sha256: (name) => hashStream(createReadStream(join(dir, name))),
    stream: (name) => createReadStream(join(dir, name)),
    size: (name) => statSync(join(dir, name)).size,
    close: () => {},
  };
}

function listFolder(root, prefix) {
  const out = [];
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFolder(root, rel));
    else out.push(rel);
  }
  return out;
}

function zipSource(path) {
  const fd = openSync(path, 'r');
  const fileSize = statSync(path).size;
  const read = (offset, length) => {
    const buffer = Buffer.alloc(length);
    readSync(fd, buffer, 0, length, offset);
    return buffer;
  };
  const u64 = (b, at) => Number(b.readBigUInt64LE(at));

  // The end of the ZIP must be exactly what the app writes (export/zip.ts): the end record in the
  // last 22 bytes, with no comment, and the central directory right before it, or before the ZIP64
  // record and locator. Otherwise a second archive could sit in the file, which unzip tools that
  // find the directory another way would unpack instead.
  const ending = [];
  if (fileSize < 22) throw new Error('Not a ZIP file');
  const eocdAt = fileSize - 22;
  const eocd = read(eocdAt, 22);
  if (eocd.readUInt32LE(0) !== 0x06054b50) {
    throw new Error('Not a Saakshi bundle ZIP: it does not end with the ZIP end record (it may have a comment, or something after it)');
  }
  if (eocd.readUInt16LE(4) !== 0 || eocd.readUInt16LE(6) !== 0) ending.push('the ZIP says it is split over several disks');
  if (eocd.readUInt16LE(20) !== 0) ending.push('the ZIP has a comment');
  let count = eocd.readUInt16LE(10);
  let dirSize = eocd.readUInt32LE(12);
  let dirOffset = eocd.readUInt32LE(16);
  if (eocd.readUInt16LE(8) !== count) ending.push("the ZIP's end record gives two different entry counts");
  let dirEnd = eocdAt;
  const locatorAt = eocdAt - 20;
  const hasLocator = locatorAt >= 0 && read(locatorAt, 4).readUInt32LE(0) === 0x07064b50;
  if (hasLocator) {
    const locator = read(locatorAt, 20);
    const recordAt = u64(locator, 8);
    if (recordAt !== locatorAt - 56) ending.push('the ZIP64 locator does not point right before itself');
    const record = read(recordAt, 56);
    if (record.readUInt32LE(0) !== 0x06064b50) throw new Error('ZIP64 record missing');
    if (u64(record, 4) !== 44) ending.push('the ZIP64 record has extra data');
    const zipCount = u64(record, 32);
    const zipSize = u64(record, 40);
    const zipOffset = u64(record, 48);
    if (u64(record, 24) !== zipCount) ending.push("the ZIP64 record gives two different entry counts");
    // Each classic field holds its placeholder, or the same value as the ZIP64 record.
    if ((count !== 0xffff && count !== zipCount) || (dirSize !== 0xffffffff && dirSize !== zipSize) || (dirOffset !== 0xffffffff && dirOffset !== zipOffset)) {
      ending.push("the ZIP64 record and the ZIP's end record disagree");
    }
    count = zipCount;
    dirSize = zipSize;
    dirOffset = zipOffset;
    dirEnd = recordAt;
  } else if (count === 0xffff || dirSize === 0xffffffff || dirOffset === 0xffffffff) {
    throw new Error('ZIP64 locator missing');
  }
  if (dirOffset + dirSize !== dirEnd) ending.push(`the central directory ends at byte ${dirOffset + dirSize}, not right before the end records (${dirEnd})`);

  const dir = read(dirOffset, dirSize);
  const entries = new Map();
  // Ways the ZIP could unpack differently from what is checked. The app writes plain ZIPs: each
  // entry once, stored, its local header the same as its central one, one after another with
  // nothing between, and no extra fields but ZIP64's. So anything else is refused here.
  const problems = [...ending];
  const MAX32 = 0xffffffff;
  // ZIP64; and timestamps and owners, which other zip tools add and which name nothing.
  const HARMLESS_EXTRA = new Set([0x0001, 0x000a, 0x5455, 0x7875]);

  /** The ZIP64 values an extra field gives, in the order APPNOTE 4.5.3 sets; also its other ids. */
  const readExtra = (extra, want) => {
    const out = { ids: [] };
    for (let e = 0; e + 4 <= extra.length; ) {
      const id = extra.readUInt16LE(e);
      const length = extra.readUInt16LE(e + 2);
      out.ids.push(id);
      if (id === 0x0001) {
        let f = e + 4;
        for (const key of want) {
          out[key] = u64(extra, f);
          f += 8;
        }
      }
      e += 4 + length;
    }
    return out;
  };

  let at = 0;
  const list = [];
  for (let i = 0; i < count; i++) {
    if (at + 46 > dir.length || dir.readUInt32LE(at) !== 0x02014b50) throw new Error('Bad central directory');
    const flags = dir.readUInt16LE(at + 8);
    const method = dir.readUInt16LE(at + 10);
    const crc = dir.readUInt32LE(at + 16);
    let compressed = dir.readUInt32LE(at + 20);
    let size = dir.readUInt32LE(at + 24);
    const nameLength = dir.readUInt16LE(at + 28);
    const extraLength = dir.readUInt16LE(at + 30);
    const commentLength = dir.readUInt16LE(at + 32);
    let localOffset = dir.readUInt32LE(at + 42);
    const name = dir.subarray(at + 46, at + 46 + nameLength).toString('utf8');
    const want = [size === MAX32 && 'size', compressed === MAX32 && 'compressed', localOffset === MAX32 && 'localOffset'].filter(Boolean);
    const extra = readExtra(dir.subarray(at + 46 + nameLength, at + 46 + nameLength + extraLength), want);
    if (extra.size !== undefined) size = extra.size;
    if (extra.compressed !== undefined) compressed = extra.compressed;
    if (extra.localOffset !== undefined) localOffset = extra.localOffset;
    for (const id of extra.ids) {
      if (!HARMLESS_EXTRA.has(id)) problems.push(`${name}: has an extra field (0x${id.toString(16).padStart(4, '0')}) that some unzip tools read as another name`);
    }
    if (!plainPath(name.endsWith('/') ? name.slice(0, -1) : name)) problems.push(`${JSON.stringify(name)}: not a plain name inside the bundle`);
    // A symbolic link, which unzip tools make as a link to wherever its contents say (Unix mode).
    if (dir.readUInt8(at + 5) === 3 && ((dir.readUInt32LE(at + 38) >>> 16) & 0o170000) === 0o120000) {
      problems.push(`${name}: a symbolic link, which a Saakshi bundle never holds`);
    }
    if (entries.has(name)) problems.push(`${name}: in the ZIP twice; unzip tools differ on which copy they keep`);
    const entry = { name, flags, method, crc, compressed, size, localOffset };
    entries.set(name, entry);
    list.push(entry);
    at += 46 + nameLength + extraLength + commentLength;
  }

  if (at !== dirSize) problems.push(`the central directory holds ${dirSize - at} bytes more than its ${count} entries`);

  // Each local header must say what the central directory says, since tools that read a ZIP front
  // to back go by it; and the entries must follow one another exactly, so none is hidden between.
  list.sort((a, b) => a.localOffset - b.localOffset);
  let expectedOffset = 0;
  for (const entry of list) {
    if (entry.localOffset !== expectedOffset) {
      problems.push(`${entry.name}: starts at byte ${entry.localOffset}, not right after the entry before it (${expectedOffset})`);
    }
    const header = read(entry.localOffset, 30);
    if (header.readUInt32LE(0) !== 0x04034b50) {
      problems.push(`${entry.name}: its local header is missing`);
      entry.dataOffset = null;
      continue;
    }
    const nameLength = header.readUInt16LE(26);
    const extraLength = header.readUInt16LE(28);
    const localName = read(entry.localOffset + 30, nameLength).toString('utf8');
    let localCompressed = header.readUInt32LE(18);
    let localSize = header.readUInt32LE(22);
    const want = [localSize === MAX32 && 'size', localCompressed === MAX32 && 'compressed'].filter(Boolean);
    const extra = readExtra(read(entry.localOffset + 30 + nameLength, extraLength), want);
    if (extra.size !== undefined) localSize = extra.size;
    if (extra.compressed !== undefined) localCompressed = extra.compressed;
    for (const id of extra.ids) {
      if (!HARMLESS_EXTRA.has(id)) problems.push(`${entry.name}: its local header has an extra field (0x${id.toString(16).padStart(4, '0')}) that some unzip tools read as another name`);
    }
    if (localName !== entry.name) problems.push(`${entry.name}: its local header names it ${JSON.stringify(localName)}`);
    const descriptor = (entry.flags & 0x0008) !== 0;
    if (header.readUInt16LE(6) !== entry.flags || header.readUInt16LE(8) !== entry.method) {
      problems.push(`${entry.name}: its local header differs from the central directory`);
    } else if (!descriptor && (header.readUInt32LE(14) !== entry.crc || localSize !== entry.size || localCompressed !== entry.compressed)) {
      problems.push(`${entry.name}: its local header gives another size or CRC`);
    }
    if (descriptor) problems.push(`${entry.name}: written with a data descriptor; unzip the bundle and pass the folder instead`);
    entry.dataOffset = entry.localOffset + 30 + nameLength + extraLength;
    expectedOffset = entry.dataOffset + entry.compressed;
  }
  if (list.length && expectedOffset !== dirOffset) problems.push(`the central directory starts at byte ${dirOffset}, not right after the last entry (${expectedOffset})`);

  const dataOffset = (entry) => {
    if (entry.dataOffset === null) throw new Error(`${entry.name}: its local header is missing`);
    return entry.dataOffset;
  };
  const entry = (name) => {
    const e = entries.get(name);
    if (!e) throw new Error(`${name} is not in the bundle`);
    if (e.method !== 0) throw new Error(`${name} is compressed; unzip the bundle and pass the folder instead`);
    return e;
  };

  return {
    has: (name) => entries.has(name),
    names: () => [...entries.keys()],
    problems: () => problems,
    read: (name) => {
      const e = entry(name);
      return read(dataOffset(e), e.size);
    },
    sha256: (name) => {
      const e = entry(name);
      if (e.size === 0) return Promise.resolve(createHash('sha256').digest('hex'));
      const start = dataOffset(e);
      return hashStream(createReadStream(path, { start, end: start + e.size - 1 }));
    },
    stream: (name) => {
      const e = entry(name);
      if (e.size === 0) return Readable.from([]);
      const start = dataOffset(e);
      return createReadStream(path, { start, end: start + e.size - 1 });
    },
    size: (name) => entry(name).size,
    close: () => closeSync(fd),
  };
}

function hashStream(stream) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Reads a file once and returns its SHA-256 and size, and the SHA-256 of its first `n` bytes for
 * each `n` in `offsets` (format 0.5 checkpoints). Offsets past the end are left out of `prefixes`.
 */
function hashWithPrefixes(stream, offsets) {
  const want = [...new Set(offsets)].sort((a, b) => a - b);
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const prefixes = new Map();
    let position = 0;
    let next = 0;
    const snapshot = () => {
      while (next < want.length && want[next] === position) {
        prefixes.set(want[next], hash.copy().digest('hex'));
        next++;
      }
    };
    snapshot();
    stream.on('data', (chunk) => {
      let at = 0;
      while (at < chunk.length) {
        const target = next < want.length ? want[next] : Infinity;
        const take = Math.min(chunk.length - at, target - position);
        hash.update(chunk.subarray(at, at + take));
        at += take;
        position += take;
        snapshot();
      }
    });
    stream.on('error', reject);
    stream.on('end', () => resolve({ sha256: hash.digest('hex'), size: position, prefixes }));
  });
}

// ---- Checks -----------------------------------------------------------------------------------

export async function verifyBundle(path) {
  const failures = [];
  const notes = [];
  const fail = (message) => failures.push(message);
  let source;
  try {
    source = statSync(path).isDirectory() ? folderSource(path) : zipSource(path);
  } catch (error) {
    return { ok: false, failures: [error instanceof Error ? error.message : String(error)], notes };
  }

  try {
    const keyFile = JSON.parse(source.read('device-key.json').toString('utf8'));
    const publicKey = createPublicKey(keyFile.publicKeyPem);
    const spki = publicKey.export({ type: 'spki', format: 'der' });
    const keyId = createHash('sha256').update(spki).digest('hex');
    if (keyId !== keyFile.keyId) fail(`device-key.json: keyId does not match the public key (${keyId})`);
    if (Buffer.from(keyFile.publicKeySpki, 'base64').compare(spki) !== 0) {
      fail('device-key.json: publicKeySpki and publicKeyPem differ');
    }
    // README.txt's step 1 has the reader save the key as key.pem; one already there must be it.
    if (source.has('key.pem')) {
      let same = false;
      try {
        same = createPublicKey(source.read('key.pem').toString('utf8')).export({ type: 'spki', format: 'der' }).equals(spki);
      } catch {
        // Not a key: reported below.
      }
      if (!same) fail('key.pem: not the public key in device-key.json; make it again from "publicKeyPem"');
    }
    notes.push(`Signing key ${keyFile.keyId} (${keyFile.platform}, ${keyFile.storage})`);
    notes.push(
      keyFile.attestation
        ? `Key attestation present (${keyFile.attestation.format}); this tool does not check it`
        : `No key attestation: ${keyFile.attestationError ?? 'none given'}`,
    );

    // The manifest is not signed. From 0.8 it says which file in "Original files/" is each record's;
    // each is then checked against its signed record, no file may be claimed twice, and every file
    // in "Original files/" must be claimed. So the file at a readable name is always the one checked.
    // Up to 0.7 a record's file is found by the name it signed (media/<file.name>), as before.
    let manifest = null;
    if (source.has('manifest.json')) {
      try {
        manifest = JSON.parse(source.read('manifest.json').toString('utf8'));
      } catch {
        fail('manifest.json: not valid JSON');
      }
    }
    const mediaOf = new Map((manifest?.records ?? []).map((entry) => [entry.record, entry.media]));
    for (const entry of [...(manifest?.records ?? []), ...(manifest?.checkpoints ?? [])]) {
      if (typeof entry.record === 'string' && !source.has(entry.record)) fail(`manifest.json lists ${entry.record}, which is not in the bundle`);
    }

    // One layout per bundle, and nothing outside it: a file in a look-alike folder ("ORIGINAL
    // FILES/", a Cyrillic "О") or at the top could be taken for evidence without being checked.
    const names = source.names().filter((name) => !ignored(name) && !name.endsWith('/'));
    for (const problem of source.problems()) fail(problem);
    const layout = names.some((name) => name.startsWith(NEW_RECORDS)) ? 'new' : 'old';
    const folders = layout === 'new' ? [NEW_MEDIA, NEW_RECORDS] : ['media/', 'records/'];
    const top = layout === 'new' ? NEW_TOP : OLD_TOP;
    for (const name of names) {
      if (!top.includes(name) && !folders.some((folder) => name.startsWith(folder) && !name.slice(folder.length).includes('/'))) {
        fail(`${name}: not part of a Saakshi bundle${layout === 'new' && (name.startsWith('media/') || name.startsWith('records/')) ? ' from 0.8 (a bundle has one layout)' : ''}`);
      }
    }
    // Names a computer may treat as one (case, or the same letter written two ways), so that one
    // file lands on the other when the bundle is unzipped.
    const seen = new Map();
    for (const name of names) {
      const key = name.normalize('NFC').toLowerCase();
      if (seen.has(key)) fail(`${seen.get(key)} and ${name}: a computer may treat these names as the same, and put one over the other`);
      else seen.set(key, name);
    }

    // Every record in the bundle, in chain order (its "sequence"; from 0.8 the names start with it).
    const loaded = source
      .names()
      .filter((name) => RECORD_PATH.test(name) && !ignored(name))
      .map((name) => {
        const body = source.read(name);
        let record = null;
        try {
          record = JSON.parse(body.toString('utf8'));
        } catch {
          // Reported below.
        }
        return { name, body, record };
      })
      .sort((a, b) => (a.record?.sequence ?? Infinity) - (b.record?.sequence ?? Infinity) || (a.name < b.name ? -1 : 1));
    if (loaded.length === 0) fail('No records in the bundle');
    const namesFromRecords = layout === 'new' ? expectedNames(loaded) : new Map();

    let previous = null;
    let lastBodyHash = null;
    // Checkpoints by recording, waiting for their file's record (which comes after them).
    const pending = new Map();
    let checkpointCount = 0;
    // Each original checked, and the record it was checked against.
    const claimed = new Map();
    for (const [index, { name, body, record }] of loaded.entries()) {
      const bodyHash = createHash('sha256').update(body).digest('hex');
      const label = name;

      if (!source.has(`${name}.sig`)) {
        fail(`${label}: signature file missing`);
      } else if (!verify('sha256', body, publicKey, source.read(`${name}.sig`))) {
        fail(`${label}: signature does not verify`);
      }

      if (!record) {
        fail(`${label}: not valid JSON`);
        previous = null;
        continue;
      }
      const isCheckpoint = record.type === CHECKPOINT_TYPE;
      if (record.type !== RECORD_TYPE && !isCheckpoint) fail(`${label}: not a Saakshi record`);
      if (!SUPPORTED_VERSIONS.includes(record.version)) fail(`${label}: unknown version ${record.version}`);
      for (const problem of newMemberProblems(record)) fail(`${label}: ${problem}`);
      if (record.key?.id !== keyFile.keyId) fail(`${label}: signed by a different key (${record.key?.id})`);
      if (record.sequence !== index) fail(`${label}: sequence ${record.sequence}, expected ${index} (a record is missing or out of order)`);
      const named = namesFromRecords.get(name);
      if (layout === 'new' && named?.record !== name) {
        fail(named ? `${label}: from its signed contents its name should be "${named.record}"` : `${label}: its signed contents don't say what it should be called`);
      }

      if (isCheckpoint) {
        // Checked against its file when the file's record comes.
        checkpointCount++;
        if (!pending.has(record.recording)) pending.set(record.recording, []);
        pending.get(record.recording).push({ label, record });
      } else {
        // From 0.8, the name the file must have, from its signed record; the manifest must agree.
        // Up to 0.7, the name the record signed.
        const folder = layout === 'new' ? NEW_MEDIA : 'media/';
        const media = layout === 'new' ? named?.media : `media/${record.file?.name}`;
        const checkpoints = record.recording ? (pending.get(record.recording) ?? []) : [];
        if (record.recording) pending.delete(record.recording);
        if (layout === 'new' && mediaOf.get(name) !== media) {
          fail(
            mediaOf.has(name)
              ? `${label}: manifest.json names its file ${JSON.stringify(mediaOf.get(name))}, but from the signed record it is "${media}"`
              : `${label}: manifest.json doesn't say which file in "${NEW_MEDIA}" is this record's`,
          );
        }
        if (media === undefined) {
          fail(`${label}: its signed contents don't say what its file should be called`);
        } else if (!plainPath(media) || ignored(media) || !media.startsWith(folder) || media.slice(folder.length).includes('/')) {
          fail(`${label}: its file is named ${JSON.stringify(media)}, which is not a file in "${folder}"`);
        } else if (claimed.has(media)) {
          fail(`${media}: claimed by ${claimed.get(media)} and by ${label}`);
        } else if (!source.has(media)) {
          fail(`${label}: ${media} is missing`);
        } else {
          if (source.size(media) !== record.file.size) fail(`${media}: size differs from its record`);
          const read = await hashWithPrefixes(
            source.stream(media),
            checkpoints.map((c) => c.record.file?.size),
          );
          claimed.set(media, label);
          if (read.sha256 !== record.file.sha256) {
            fail(`${media}: SHA-256 ${read.sha256} differs from its record (${record.file.sha256})`);
          }
          // Numbers rise; a gap is allowed (a checkpoint that could not be signed is left out, and the
          // next one vouches for its bytes too).
          let lastSize = 0;
          let lastNumber = -1;
          for (const { label: at, record: checkpoint } of checkpoints) {
            if (!(checkpoint.checkpoint > lastNumber)) fail(`${at}: checkpoint ${checkpoint.checkpoint} comes after checkpoint ${lastNumber}`);
            lastNumber = checkpoint.checkpoint;
            if (!(checkpoint.file?.size > lastSize)) fail(`${at}: covers ${checkpoint.file?.size} bytes, not more than the checkpoint before it`);
            lastSize = checkpoint.file?.size;
            const prefix = read.prefixes.get(checkpoint.file?.size);
            if (prefix === undefined) {
              fail(`${at}: covers ${checkpoint.file?.size} bytes, but ${media} has only ${read.size}`);
            } else if (prefix !== checkpoint.file.sha256) {
              fail(`${at}: the first ${checkpoint.file.size} bytes of ${media} have SHA-256 ${prefix}, not ${checkpoint.file.sha256}`);
            }
          }
        }
      }

      const expected = previous
        ? { id: previous.id, recordSha256: previous.bodyHash, fileSha256: previous.fileSha256 }
        : null;
      const actual = record.previous ?? null;
      const linked =
        expected === null
          ? actual === null
          : actual !== null &&
            actual.id === expected.id &&
            actual.recordSha256 === expected.recordSha256 &&
            actual.fileSha256 === expected.fileSha256;
      if (!linked) fail(`${label}: does not chain to the record before it`);

      previous = { id: record.id, bodyHash, fileSha256: record.file?.sha256 };
      lastBodyHash = bodyHash;
    }

    for (const [recording, checkpoints] of pending) {
      fail(`${checkpoints[0].label}: checkpoint of recording ${recording}, whose file's record is not in the bundle`);
    }

    // Nothing in the originals' or records' folders that no record vouches for.
    const recordNames = new Set(loaded.map((entry) => entry.name));
    for (const name of source.names()) {
      // Folder entries (a bundle zipped again), and what a computer adds, are skipped.
      if (ignored(name) || name.endsWith('/')) continue;
      if (name.startsWith(folders[0]) && !claimed.has(name)) {
        fail(`${name}: no signed record in this bundle vouches for this file`);
      }
      if (name.startsWith(folders[1])) {
        const recordName = name.endsWith('.sig') ? name.slice(0, -4) : name;
        if (!recordNames.has(recordName)) fail(`${name}: not a record of this bundle, or its signature`);
      }
    }

    if (manifest && manifest.chainHead !== lastBodyHash) fail(`manifest.json: chainHead differs from the last record (${lastBodyHash})`);
    for (const [media, label] of claimed) notes.push(`Checked ${media} against ${label}`);
    notes.push(`Records: ${loaded.length}${checkpointCount ? ` (${checkpointCount} of them checkpoints)` : ''}`);
    notes.push(`Chain head: ${lastBodyHash}`);
    notes.push('Compare the chain head with a witness message or another copy held elsewhere: this tool cannot tell whether the last records were taken off the end.');
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  } finally {
    source.close();
  }

  return { ok: failures.length === 0, failures, notes };
}

if (process.argv[1]?.endsWith('verify-bundle.mjs')) {
  const path = process.argv[2];
  if (!path) {
    console.error('Usage: node verify-bundle.mjs <bundle.zip | unzipped folder>');
    process.exit(2);
  }
  const result = await verifyBundle(path);
  for (const note of result.notes) console.log(note);
  for (const failure of result.failures) console.log(`FAIL ${failure}`);
  console.log(result.ok ? 'OK: signatures, files, checkpoints and chain check out.' : 'NOT OK: see the failures above.');
  process.exit(result.ok ? 0 : 1);
}
