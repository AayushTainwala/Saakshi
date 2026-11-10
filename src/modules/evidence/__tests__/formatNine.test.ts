import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { bundleFilesOf } from './bundleFiles';
import { app, handedOver } from './handedOver';

// Bundle format 0.9 (round 2, group 1.5; docs/spec/evidence-bundle.md, sections 4, 4a, 12): the
// low-battery handover, capture.batteryPercent and capture.startedFrom.

const VERIFY = join(__dirname, '../../../../tools/verify-bundle.mjs');
const cleanup: string[] = [];
afterAll(() => cleanup.forEach((d) => rmSync(d, { recursive: true, force: true })));

function writeBundle(files: Map<string, Uint8Array>) {
  const dir = mkdtempSync(join(tmpdir(), 'saakshi-0.9-'));
  cleanup.push(dir);
  for (const [name, bytes] of files) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), bytes);
  }
  return dir;
}

function verify(dir: string) {
  const result = spawnSync('node', [VERIFY, dir], { encoding: 'utf8' });
  return { code: result.status, out: result.stdout + result.stderr };
}

describe('bundle format 0.9', () => {
  it('records the low-battery handover: the file closes as "low-battery" and the next file of the clip follows', async () => {
    const { records } = await handedOver({ startedFrom: 'phone-taken' });
    expect(records.map((r) => [r.version, r.segment, r.capture.endReason, r.capture.gapBeforeMs])).toEqual([
      ['0.10', { clip: 0, index: 0 }, 'low-battery', null],
      ['0.10', { clip: 0, index: 1 }, 'stopped', 0],
    ]);
  });

  it('writes the battery level and how a Pocket recording was started, in files and checkpoints', async () => {
    const { records, checkpoints } = await handedOver({ startedFrom: 'phone-taken', battery: 5 });
    for (const record of [...records, ...checkpoints]) {
      expect(record.capture.batteryPercent).toBe(5);
      expect(record.capture.startedFrom).toBe('phone-taken');
    }
  });

  it('leaves the battery level out when the phone doesn’t say, and for a file sealed after a cut-off', async () => {
    for (const battery of [null, 'throws'] as const) {
      const { records, checkpoints } = await handedOver({ battery });
      for (const record of [...records, ...checkpoints]) expect('batteryPercent' in record.capture).toBe(false);
    }
    const cut = await handedOver({ battery: 40, interruptedLast: true });
    expect(cut.records[0].capture.batteryPercent).toBe(40);
    expect('batteryPercent' in cut.records[1].capture).toBe(false);
  });

  it('writes startedFrom only for a sound-only (Pocket recording) record', async () => {
    const { records } = await handedOver({ mode: 'body-cam', startedFrom: 'pocket' });
    for (const record of records) expect('startedFrom' in record.capture).toBe(false);
  });

  it('verifies, with the new members, and names the record "Pocket recording"', async () => {
    const ctx = await handedOver({ startedFrom: 'pocket', battery: 82 });
    const { files, plan } = bundleFilesOf(ctx.locker, ctx.id, ctx.deviceKey, new Date('2026-11-06T06:00:00.000Z'), app);
    const { code, out } = verify(writeBundle(files));
    expect(out).toContain('OK: signatures, files, checkpoints and chain check out.');
    expect(code).toBe(0);
    expect(plan.fileName).toBe('Saakshi 2026-11-06 10-40 IST Pocket recording.zip');
    // The README names the record too, from the same name.
    expect(new TextDecoder().decode(files.get('README.txt'))).toContain('2026-11-06 10-40 IST Pocket recording');
    const manifest = JSON.parse(new TextDecoder().decode(files.get('manifest.json')));
    expect(manifest).toMatchObject({ version: '0.10', name: '2026-11-06 10-40 IST Pocket recording' });
  });

  it('fails a record whose new members are malformed (re-signed, so only their shape is wrong)', async () => {
    const ctx = await handedOver({ startedFrom: 'pocket', battery: 82 });
    const { files } = bundleFilesOf(ctx.locker, ctx.id, ctx.deviceKey, new Date('2026-11-06T06:00:00.000Z'), app);
    // The last record in the chain, so no later record's link changes.
    const last = [...files.keys()].filter((n) => n.startsWith('Signed records/') && n.endsWith('.json')).sort().at(-1)!;
    const record = JSON.parse(new TextDecoder().decode(files.get(last)));
    for (const [change, message] of [
      [{ batteryPercent: 140 }, 'capture.batteryPercent must be a whole number from 0 to 100, not 140'],
      [{ batteryPercent: 4.5 }, 'capture.batteryPercent must be a whole number from 0 to 100, not 4.5'],
      [{ startedFrom: 'lunch' }, 'capture.startedFrom must be "pocket" or "phone-taken", not "lunch"'],
      [{ mode: 'body-cam' }, 'capture.startedFrom is only for a sound-only (Pocket recording) record'],
    ] as const) {
      const changed = { ...record, capture: { ...record.capture, ...change } };
      const body = canonical(changed);
      const signature = await ctx.key.signer.sign(body);
      const copy = new Map(files);
      copy.set(last, new TextEncoder().encode(body));
      copy.set(`${last}.sig`, signature);
      const { code, out } = verify(writeBundle(copy));
      expect(code).not.toBe(0);
      expect(out).toContain(message);
    }
  });
});

/** RFC 8785 for the plain JSON a record holds (strings, numbers, booleans, null, objects, arrays). */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
}
