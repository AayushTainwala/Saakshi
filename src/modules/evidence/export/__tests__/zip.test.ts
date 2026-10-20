import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, openSync, rmSync, writeSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32 as zlibCrc32 } from 'node:zlib';

import { bytesEntry, crc32, writeZip, type ZipEntry } from '../zip';

const modified = new Date(2026, 9, 20, 14, 33, 8);

async function zipToFile(entries: ZipEntry[], options?: { forceZip64?: boolean }) {
  const dir = mkdtempSync(join(tmpdir(), 'saakshi-zip-'));
  const path = join(dir, 'bundle.zip');
  const fd = openSync(path, 'w');
  const result = await writeZip({ write: async (bytes) => void writeSync(fd, bytes) }, entries, options);
  closeSync(fd);
  return { dir, path, result };
}

/** Python's zipfile reads the archive, checks every CRC and returns names and SHA-256s. */
function pythonRead(path: string): { name: string; sha256: string; size: number }[] {
  const script = `
import hashlib, json, sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
    assert z.testzip() is None, "bad CRC"
    print(json.dumps([{"name": i.filename, "size": i.file_size, "sha256": hashlib.sha256(z.read(i)).hexdigest(), "method": i.compress_type} for i in z.infolist()]))
`;
  return JSON.parse(execFileSync('python3', ['-I', '-c', script, path], { encoding: 'utf8' }));
}

const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

function chunkedEntry(name: string, bytes: Uint8Array, chunk = 7): ZipEntry {
  return {
    name,
    size: bytes.length,
    crc32: crc32(bytes),
    modified,
    writeTo: async (sink) => {
      for (let i = 0; i < bytes.length; i += chunk) await sink.write(bytes.subarray(i, i + chunk));
    },
  };
}

describe('crc32', () => {
  it('matches zlib, also across chunks', () => {
    const bytes = new TextEncoder().encode('The quick brown fox jumps over the lazy dog');
    expect(crc32(bytes)).toBe(zlibCrc32(bytes));
    expect(crc32(bytes.subarray(10), crc32(bytes.subarray(0, 10)))).toBe(zlibCrc32(bytes));
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe.each([false, true])('writeZip (forceZip64: %s)', (forceZip64) => {
  const media = new Uint8Array(100_000).map((_, i) => (i * 31) % 251);
  const entries = () => [
    bytesEntry('manifest.json', new TextEncoder().encode('{"a":1}'), modified),
    chunkedEntry('media/0001-clip0-seg0.mp4', media, 4096),
    bytesEntry('records/0000.json.sig', new Uint8Array([0x30, 0x45, 0x02]), modified),
    bytesEntry('empty.txt', new Uint8Array(), modified),
    bytesEntry('हिन्दी.txt', new TextEncoder().encode('नमस्ते'), modified),
  ];

  it('produces an archive Python and unzip read back exactly, stored', async () => {
    const { dir, path } = await zipToFile(entries(), { forceZip64 });
    try {
      const read = pythonRead(path);
      expect(read.map((e) => e.name)).toEqual(entries().map((e) => e.name));
      expect(read[1]).toMatchObject({ size: media.length, sha256: sha(media), method: 0 });
      expect(read[4].sha256).toBe(sha(new TextEncoder().encode('नमस्ते')));
      expect(execFileSync('unzip', ['-t', path], { encoding: 'utf8' })).toMatch(/No errors detected/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

it('reports the archive size', async () => {
  const { dir, path, result } = await zipToFile([bytesEntry('a', new Uint8Array(10), modified)]);
  const size = execFileSync('stat', ['-c', '%s', path], { encoding: 'utf8' }).trim();
  rmSync(dir, { recursive: true, force: true });
  expect(result.size).toBe(Number(size));
});

it('refuses an entry that writes the wrong number of bytes', async () => {
  const bad: ZipEntry = { ...bytesEntry('a', new Uint8Array(3), modified), size: 4 };
  await expect(writeZip({ write: async () => undefined }, [bad])).rejects.toThrow('wrote 3 bytes, expected 4');
});
