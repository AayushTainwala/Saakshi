import { execFileSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, rmSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32 as zlibCrc32 } from 'node:zlib';

import { bytesEntry, writeZip } from '../zip';

// Writes a 4.1 GiB archive, so it only runs when asked: SAAKSHI_BIG_ZIP=1 npx jest zip-large
const run = process.env.SAAKSHI_BIG_ZIP === '1' ? it : it.skip;

run('switches to ZIP64 for an entry over 4 GiB, and unzip accepts it', async () => {
  const dir = mkdtempSync(join(process.env.SAAKSHI_BIG_ZIP_DIR ?? tmpdir(), 'saakshi-zip64-'));
  try {
    const chunk = new Uint8Array(1 << 24).map((_, i) => i % 253);
    const chunks = 260; // 260 × 16 MiB = 4.06 GiB
    let crc = 0;
    for (let i = 0; i < chunks; i++) crc = zlibCrc32(chunk, crc);
    const path = join(dir, 'big.zip');
    const fd = openSync(path, 'w');
    const modified = new Date(2026, 9, 20, 12, 0, 0);
    await writeZip({ write: async (bytes) => void writeSync(fd, bytes) }, [
      bytesEntry('manifest.json', new TextEncoder().encode('{}'), modified),
      {
        name: 'media/0000-clip0-seg0.mp4',
        size: chunk.length * chunks,
        crc32: crc,
        modified,
        writeTo: async (sink) => {
          for (let i = 0; i < chunks; i++) await sink.write(chunk);
        },
      },
      bytesEntry('README.txt', new TextEncoder().encode('after the big entry'), modified),
    ]);
    closeSync(fd);
    const listing = execFileSync('unzip', ['-v', path], { encoding: 'utf8' });
    expect(listing).toMatch(/4362076160\s+Stored/);
    expect(execFileSync('unzip', ['-t', path], { encoding: 'utf8', maxBuffer: 1 << 20 })).toMatch(/No errors detected/);
    expect(execFileSync('unzip', ['-p', path, 'README.txt'], { encoding: 'utf8' })).toBe('after the big entry');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 600_000);
