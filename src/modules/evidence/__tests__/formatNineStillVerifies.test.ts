import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { bundleFilesOf } from './bundleFiles';
import { app, handedOver } from './handedOver';

// A bundle made before repair round A, group 2 (format 0.9) still verifies with today's checker.
// The records here are written exactly as 0.9 wrote them.
jest.mock('../constants', () => ({ ...jest.requireActual('../constants'), FORMAT_VERSION: '0.9' }));

const VERIFY = join(__dirname, '../../../../tools/verify-bundle.mjs');
const cleanup: string[] = [];
afterAll(() => cleanup.forEach((d) => rmSync(d, { recursive: true, force: true })));

function verify(files: Map<string, Uint8Array>) {
  const dir = mkdtempSync(join(tmpdir(), 'saakshi-0.9-old-'));
  cleanup.push(dir);
  for (const [name, bytes] of files) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), bytes);
  }
  const result = spawnSync('node', [VERIFY, dir], { encoding: 'utf8' });
  return { code: result.status, out: result.stdout + result.stderr };
}

describe('a format 0.9 bundle', () => {
  it('still verifies', async () => {
    const ctx = await handedOver({ startedFrom: 'pocket', battery: 82 });
    expect(ctx.records.every((r) => (r.version as string) === '0.9')).toBe(true);
    const { files } = bundleFilesOf(ctx.locker, ctx.id, ctx.deviceKey, new Date('2026-11-06T06:00:00.000Z'), app);
    const { code, out } = verify(files);
    expect(out).toContain('OK: signatures, files, checkpoints and chain check out.');
    expect(code).toBe(0);
  });

  it('fails if a record ends with a reason that only 0.10 has', async () => {
    const ctx = await handedOver({ mode: 'body-cam', reasons: ['storage-sound-only', 'storage-full'] });
    const { files } = bundleFilesOf(ctx.locker, ctx.id, ctx.deviceKey, new Date('2026-11-06T06:00:00.000Z'), app);
    const { code, out } = verify(files);
    expect(code).not.toBe(0);
    expect(out).toContain('capture.endReason "storage-sound-only" is not part of format 0.9');
    expect(out).toContain('capture.endReason "storage-full" is not part of format 0.9');
  });
});
