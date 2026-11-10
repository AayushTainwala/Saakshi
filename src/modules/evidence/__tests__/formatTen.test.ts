import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { describeEndReason } from '../export/contents';
import { END_REASON_KEYS } from '../ui/endReasons';
import { bundleFilesOf } from './bundleFiles';
import { app, handedOver } from './handedOver';

// Bundle format 0.10 (repair round A, group 2; docs/spec/evidence-bundle.md, sections 4 and 12):
// two new end reasons for free storage, stage one. "storage-sound-only": a body-cam video file
// closed at the keep-free amount, sound carrying on in the next file. "storage-full": the app
// stopped the recording cleanly for lack of room.

const VERIFY = join(__dirname, '../../../../tools/verify-bundle.mjs');
const cleanup: string[] = [];
afterAll(() => cleanup.forEach((d) => rmSync(d, { recursive: true, force: true })));

function verify(files: Map<string, Uint8Array>) {
  const dir = mkdtempSync(join(tmpdir(), 'saakshi-0.10-'));
  cleanup.push(dir);
  for (const [name, bytes] of files) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), bytes);
  }
  const result = spawnSync('node', [VERIFY, dir], { encoding: 'utf8' });
  return { code: result.status, out: result.stdout + result.stderr };
}

const bundle = (ctx: Awaited<ReturnType<typeof handedOver>>) => bundleFilesOf(ctx.locker, ctx.id, ctx.deviceKey, new Date('2026-11-06T06:00:00.000Z'), app);

describe('bundle format 0.10', () => {
  it('records body-cam dropping to sound only, and then stopping for lack of room', async () => {
    const ctx = await handedOver({ mode: 'body-cam', reasons: ['storage-sound-only', 'storage-full'] });
    expect(ctx.records.map((r) => [r.version, r.capture.mode, r.segment, r.capture.endReason, r.capture.gapBeforeMs, r.interrupted])).toEqual([
      ['0.10', 'body-cam', { clip: 0, index: 0 }, 'storage-sound-only', null, false],
      ['0.10', 'body-cam', { clip: 0, index: 1 }, 'storage-full', 0, false],
    ]);
    const { files } = bundle(ctx);
    const { code, out } = verify(files);
    expect(out).toContain('OK: signatures, files, checkpoints and chain check out.');
    expect(code).toBe(0);
    expect(JSON.parse(new TextDecoder().decode(files.get('manifest.json'))).version).toBe('0.10');
    // The hash report says why each file ended, in plain words.
    const report = new TextDecoder().decode(files.get('Hash report.txt'));
    expect(report).toContain('recording carried on as sound only in the next file');
    expect(report).toContain('stopped and saved by the app because the phone was running out of free room');
  });

  it('records Pocket recording stopping for lack of room', async () => {
    const ctx = await handedOver({ mode: 'bug', startedFrom: 'phone-taken', reasons: ['low-battery', 'storage-full'] });
    expect(ctx.records.map((r) => r.capture.endReason)).toEqual(['low-battery', 'storage-full']);
    expect(verify(bundle(ctx).files).code).toBe(0);
  });

  it('fails a sound-only handover in a record that is not body-cam', async () => {
    const ctx = await handedOver({ mode: 'bug', reasons: ['storage-sound-only', 'stopped'] });
    const { code, out } = verify(bundle(ctx).files);
    expect(code).not.toBe(0);
    expect(out).toContain('capture.endReason "storage-sound-only" is only for a body-cam file');
  });

  it('has plain words for both reasons, on the record screen and in the hash report', () => {
    expect(END_REASON_KEYS['storage-full']).toBe('ended.storageFull');
    expect(END_REASON_KEYS['storage-sound-only']).toBe('ended.storageSoundOnly');
    expect(describeEndReason('storage-full')).not.toBe('storage-full');
    expect(describeEndReason('storage-sound-only')).not.toBe('storage-sound-only');
  });
});
