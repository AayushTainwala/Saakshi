import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const SCRIPT = join(__dirname, '../release-notes.mjs');
const SHA = 'ab'.repeat(32);
const CERT = '0123456789abcdef'.repeat(4);

function run(args: string[]) {
  return spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });
}

const base = [
  '--version', '1.2.3',
  '--build', '7',
  '--apk', 'Saakshi-1.2.3.apk',
  '--sha256', SHA,
  '--cert-sha256', CERT,
  '--repo', 'AayushTainwala/Saakshi',
];

describe('release notes', () => {
  it('shows both fingerprints and the install steps in English and Hindi', () => {
    const r = run(base);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Saakshi 1.2.3 (build 7)');
    expect(r.stdout).toContain(SHA);
    expect(r.stdout).toContain('01:23:45:67:89:AB:CD:EF:01:23');
    expect(r.stdout).toContain('## Install on Android');
    expect(r.stdout).toContain('## Android पर इंस्टॉल करें');
    expect(r.stdout).toContain('call 112');
    expect(r.stdout).toContain('112 पर कॉल करें');
    expect(r.stdout).not.toContain('## iPhone');
    expect(r.stdout).not.toContain('If GitHub is not reachable');
  });

  it('accepts a colon-separated certificate fingerprint', () => {
    const colon = CERT.match(/.{2}/g)!.join(':').toUpperCase();
    const r = run([...base.slice(0, -4), '--cert-sha256', colon, '--repo', 'AayushTainwala/Saakshi']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('01:23:45:67');
  });

  it('adds the TestFlight link and mirrors when given', () => {
    const r = run([
      ...base,
      '--testflight', 'https://testflight.apple.com/join/abc',
      '--mirror', 'https://codeberg.org/x/Saakshi/releases/tag/v1.2.3',
    ]);
    expect(r.stdout).toContain('https://testflight.apple.com/join/abc');
    expect(r.stdout).toContain('https://codeberg.org/x/Saakshi/releases/tag/v1.2.3');
  });

  it('refuses a missing or malformed fingerprint', () => {
    expect(run(base.slice(0, -6).concat(['--repo', 'a/b'])).status).not.toBe(0);
    const bad = [...base];
    bad[bad.indexOf('--sha256') + 1] = 'abc';
    const r = run(bad);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('--sha256');
  });
});
