import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHECK = join(__dirname, '../features-table/check.mjs');
const BUILD = join(__dirname, '../features-table/build.mjs');

function check(args: string[] = []) {
  return spawnSync('node', [CHECK, ...args], { encoding: 'utf8' });
}

describe("the owner's features-by-build table", () => {
  it('is well formed, points only at headings the spec has, and has a row for every feature heading', () => {
    const r = check();
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  it('accepts a spec change that brings the table and the change log with it', () => {
    const r = check(['--changed-files', 'docs/SPEC.md,docs/spec/features-by-build.json,docs/SPEC_CHANGELOG.md']);
    expect(r.status).toBe(0);
  });

  it('refuses a spec change that leaves the table behind', () => {
    const r = check(['--changed-files', 'docs/SPEC.md,docs/SPEC_CHANGELOG.md']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('docs/spec/features-by-build.json did not');
  });

  it('refuses a spec change with no line in the change log', () => {
    const r = check(['--changed-files', 'docs/SPEC.md,docs/spec/features-by-build.json']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('docs/SPEC_CHANGELOG.md did not');
  });

  it('leaves a pull request that does not touch the spec alone', () => {
    const r = check(['--changed-files', 'src/app/index.tsx']);
    expect(r.status).toBe(0);
  });

  it('builds the page with the data inside it', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'features-table-')), 'index.html');
    const r = spawnSync('node', [BUILD, out], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    const page = readFileSync(out, 'utf8');
    expect(page.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(page).not.toContain('__DATA__');
    expect(page).toContain('"id":"camera-fingerprint"');
  });
});
