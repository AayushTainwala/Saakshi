import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { bundleFilesOf } from './bundleFiles';
import { app, handedOver } from './handedOver';

// A bundle made by the app before round 2 (format 0.8) still verifies with today's checker
// (round 2, group 1.5). The records here are written exactly as 0.8 wrote them.
jest.mock('../constants', () => ({ ...jest.requireActual('../constants'), FORMAT_VERSION: '0.8' }));

const VERIFY = join(__dirname, '../../../../tools/verify-bundle.mjs');
const cleanup: string[] = [];
afterAll(() => cleanup.forEach((d) => rmSync(d, { recursive: true, force: true })));

function verifyFiles(files: Map<string, Uint8Array>) {
  const dir = mkdtempSync(join(tmpdir(), 'saakshi-0.8-'));
  cleanup.push(dir);
  for (const [name, bytes] of files) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), bytes);
  }
  const result = spawnSync('node', [VERIFY, dir], { encoding: 'utf8' });
  return { code: result.status, out: result.stdout + result.stderr };
}

describe('a format 0.8 bundle', () => {
  it('still verifies', async () => {
    // 0.8 wrote no battery level and no startedFrom.
    const ctx = await handedOver({ battery: null });
    expect(ctx.records.every((r) => (r.version as string) === '0.8')).toBe(true);
    const { files } = bundleFilesOf(ctx.locker, ctx.id, ctx.deviceKey, new Date('2026-11-06T06:00:00.000Z'), app);
    const { code, out } = verifyFiles(files);
    expect(out).toContain('OK: signatures, files, checkpoints and chain check out.');
    expect(code).toBe(0);
  });

  it('fails if its records carry members that only 0.9 has', async () => {
    const ctx = await handedOver({ battery: 50, startedFrom: 'pocket' });
    const { files } = bundleFilesOf(ctx.locker, ctx.id, ctx.deviceKey, new Date('2026-11-06T06:00:00.000Z'), app);
    const { code, out } = verifyFiles(files);
    expect(code).not.toBe(0);
    expect(out).toContain('capture.batteryPercent is not part of format 0.8');
    expect(out).toContain('capture.startedFrom is not part of format 0.8');
  });
});
