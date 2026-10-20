#!/usr/bin/env node
// Checks a Saakshi evidence bundle (docs/spec/evidence-bundle.md, section 10, steps 2 to 5):
// the public key matches its id, every record's signature verifies, every file matches its record,
// and the records form an unbroken chain. It does not check the key attestation (step 6).
//
// Usage: node verify-bundle.mjs <bundle.zip | unzipped folder>
// Needs Node.js 18 or later and nothing else. Exits 0 if the bundle checks out, 1 if not.

import { createHash, createPublicKey, verify } from 'node:crypto';
import { closeSync, createReadStream, existsSync, openSync, readdirSync, readFileSync, readSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SUPPORTED_VERSIONS = ['0.1'];

// ---- Reading a bundle from a folder or a stored (uncompressed) ZIP --------------------------

function folderSource(dir) {
  return {
    has: (name) => existsSync(join(dir, name)),
    names: () => listFolder(dir, ''),
    read: (name) => readFileSync(join(dir, name)),
    sha256: (name) => hashStream(createReadStream(join(dir, name))),
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

  const tailLength = Math.min(fileSize, 22 + 0xffff);
  const tail = read(fileSize - tailLength, tailLength);
  const eocdAt = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocdAt < 0) throw new Error('Not a ZIP file');
  let count = tail.readUInt16LE(eocdAt + 10);
  let dirSize = tail.readUInt32LE(eocdAt + 12);
  let dirOffset = tail.readUInt32LE(eocdAt + 16);
  if (count === 0xffff || dirSize === 0xffffffff || dirOffset === 0xffffffff) {
    const locator = tail.subarray(eocdAt - 20, eocdAt);
    if (locator.readUInt32LE(0) !== 0x07064b50) throw new Error('ZIP64 locator missing');
    const record = read(u64(locator, 8), 56);
    if (record.readUInt32LE(0) !== 0x06064b50) throw new Error('ZIP64 record missing');
    count = u64(record, 32);
    dirSize = u64(record, 40);
    dirOffset = u64(record, 48);
  }

  const dir = read(dirOffset, dirSize);
  const entries = new Map();
  let at = 0;
  for (let i = 0; i < count; i++) {
    if (dir.readUInt32LE(at) !== 0x02014b50) throw new Error('Bad central directory');
    const method = dir.readUInt16LE(at + 10);
    let size = dir.readUInt32LE(at + 24);
    const nameLength = dir.readUInt16LE(at + 28);
    const extraLength = dir.readUInt16LE(at + 30);
    const commentLength = dir.readUInt16LE(at + 32);
    let localOffset = dir.readUInt32LE(at + 42);
    const name = dir.subarray(at + 46, at + 46 + nameLength).toString('utf8');
    const extra = dir.subarray(at + 46 + nameLength, at + 46 + nameLength + extraLength);
    for (let e = 0; e < extra.length; ) {
      const id = extra.readUInt16LE(e);
      const length = extra.readUInt16LE(e + 2);
      if (id === 0x0001) {
        let f = e + 4;
        if (size === 0xffffffff) {
          size = u64(extra, f);
          f += 16; // uncompressed then compressed size
        }
        if (localOffset === 0xffffffff) localOffset = u64(extra, f);
      }
      e += 4 + length;
    }
    entries.set(name, { method, size, localOffset });
    at += 46 + nameLength + extraLength + commentLength;
  }

  const dataOffset = (entry) => {
    const header = read(entry.localOffset, 30);
    if (header.readUInt32LE(0) !== 0x04034b50) throw new Error('Bad local header');
    return entry.localOffset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
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

// ---- Checks -----------------------------------------------------------------------------------

export async function verifyBundle(path) {
  const source = statSync(path).isDirectory() ? folderSource(path) : zipSource(path);
  const failures = [];
  const notes = [];
  const fail = (message) => failures.push(message);

  try {
    const keyFile = JSON.parse(source.read('device-key.json').toString('utf8'));
    const publicKey = createPublicKey(keyFile.publicKeyPem);
    const spki = publicKey.export({ type: 'spki', format: 'der' });
    const keyId = createHash('sha256').update(spki).digest('hex');
    if (keyId !== keyFile.keyId) fail(`device-key.json: keyId does not match the public key (${keyId})`);
    if (Buffer.from(keyFile.publicKeySpki, 'base64').compare(spki) !== 0) {
      fail('device-key.json: publicKeySpki and publicKeyPem differ');
    }
    notes.push(`Signing key ${keyFile.keyId} (${keyFile.platform}, ${keyFile.storage})`);
    notes.push(
      keyFile.attestation
        ? `Key attestation present (${keyFile.attestation.format}); this tool does not check it`
        : `No key attestation: ${keyFile.attestationError ?? 'none given'}`,
    );

    const recordNames = source
      .names()
      .filter((name) => /^records\/[^/]+\.json$/.test(name))
      .sort();
    if (recordNames.length === 0) fail('No records in the bundle');

    let previous = null;
    let lastBodyHash = null;
    for (const [index, name] of recordNames.entries()) {
      const body = source.read(name);
      const bodyHash = createHash('sha256').update(body).digest('hex');
      const label = name;

      if (!source.has(`${name}.sig`)) {
        fail(`${label}: signature file missing`);
      } else if (!verify('sha256', body, publicKey, source.read(`${name}.sig`))) {
        fail(`${label}: signature does not verify`);
      }

      let record;
      try {
        record = JSON.parse(body.toString('utf8'));
      } catch {
        fail(`${label}: not valid JSON`);
        previous = null;
        continue;
      }
      if (record.type !== 'saakshi.evidence.record') fail(`${label}: not a Saakshi record`);
      if (!SUPPORTED_VERSIONS.includes(record.version)) fail(`${label}: unknown version ${record.version}`);
      if (record.key?.id !== keyFile.keyId) fail(`${label}: signed by a different key (${record.key?.id})`);
      if (record.sequence !== index) fail(`${label}: sequence ${record.sequence}, expected ${index} (a record is missing or out of order)`);

      const media = `media/${record.file?.name}`;
      if (!source.has(media)) {
        fail(`${label}: ${media} is missing`);
      } else {
        if (source.size(media) !== record.file.size) fail(`${media}: size differs from its record`);
        const sha = await source.sha256(media);
        if (sha !== record.file.sha256) fail(`${media}: SHA-256 ${sha} differs from its record (${record.file.sha256})`);
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

    if (source.has('manifest.json')) {
      const manifest = JSON.parse(source.read('manifest.json').toString('utf8'));
      if (manifest.chainHead !== lastBodyHash) fail(`manifest.json: chainHead differs from the last record (${lastBodyHash})`);
    }
    notes.push(`Records: ${recordNames.length}`);
    notes.push(`Chain head: ${lastBodyHash}`);
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
  console.log(result.ok ? 'OK: signatures, files and chain check out.' : 'NOT OK: see the failures above.');
  process.exit(result.ok ? 0 : 1);
}
