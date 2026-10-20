import { createHash, verify } from 'node:crypto';

import { CaptureSession } from '../capture/pipeline';
import { canonicalize } from '../integrity/canonical';
import type { EvidenceRecord } from '../integrity/record';
import { createSealer } from '../integrity/seal';
import type { ClosedFile, FileDigests } from '../types';
import { memoryLocker } from './memoryLocker';
import { nodeSha256Hex, testSigner } from './testSigner';

const device = { manufacturer: 'samsung', brand: 'samsung', model: 'SM-A546E', modelName: null, os: 'Android', osVersion: '15' };
const app = { id: 'in.aayushtainwala.saakshi', version: '1.0.0', build: '1' };

function digestsOf(bytes: Uint8Array): FileDigests {
  const h = (algorithm: string) => createHash(algorithm).update(bytes).digest('hex');
  return { size: bytes.length, sha256: h('sha256'), sha1: h('sha1'), md5: h('md5'), crc32: 0 };
}

function setup() {
  const files = new Map<string, Uint8Array>([
    ['cache://p.jpg', new TextEncoder().encode('photo bytes')],
    ['cache://s0.mp4', new TextEncoder().encode('segment zero')],
    ['cache://s1.mp4', new TextEncoder().encode('segment one')],
  ]);
  const locker = memoryLocker(files);
  const key = testSigner();
  let ids = 0;
  const newId = () => `00000000-0000-4000-8000-${String(ids++).padStart(12, '0')}`;
  const session = new CaptureSession({
    store: locker.store,
    now: () => new Date('2026-10-20T09:03:04.000Z'),
    newId,
    hash: async (uri) => digestsOf(files.get(uri)!),
    seal: createSealer({
      store: locker.store,
      signer: async () => key.signer,
      sha256Hex: nodeSha256Hex,
      newId,
      device: () => device,
      app: () => app,
      timeZone: () => 'Asia/Kolkata',
    }),
  });
  return { locker, key, session };
}

const fix = { latitude: 19.076, longitude: 72.8777, accuracyMeters: 12.5, altitudeMeters: null, fixedAt: '2026-10-20T09:02:58.002Z' };

function file(uri: string, kind: ClosedFile['kind'], segment: ClosedFile['segment']): ClosedFile {
  return {
    uri,
    kind,
    segment,
    startedAt: new Date('2026-10-20T09:02:03.123Z'),
    endedAt: new Date('2026-10-20T09:03:03.140Z'),
    location: { status: 'fixed', fix },
  };
}

async function captureThree() {
  const ctx = setup();
  const clip = ctx.session.nextClip();
  await Promise.all([
    ctx.session.add(file('cache://p.jpg', 'photo', null)),
    ctx.session.add(file('cache://s0.mp4', 'video', { clip, index: 0 })),
    ctx.session.add(file('cache://s1.mp4', 'video', { clip, index: 1 })),
  ]);
  const id = ctx.session.id!;
  const state = ctx.locker.store.readSession(id)!;
  const records = state.items.map((item) => {
    const stored = ctx.locker.records.get(`${id}/${item.record!.file}`)!;
    return { item, body: stored.body, signature: stored.signature, record: JSON.parse(stored.body) as EvidenceRecord };
  });
  return { ...ctx, id, state, records };
}

describe('sealing', () => {
  it('writes one signed record per file, in canonical form', async () => {
    const { records, key, state } = await captureThree();
    expect(state.items.map((i) => i.status)).toEqual(['sealed', 'sealed', 'sealed']);
    for (const { body, signature, record } of records) {
      expect(body).toBe(canonicalize(record));
      expect(verify('sha256', Buffer.from(body, 'utf8'), key.publicKey, Buffer.from(signature))).toBe(true);
      expect(record.key).toEqual({ id: key.keyId, algorithm: 'ES256' });
    }
  });

  it('fills the record as the spec defines', async () => {
    const { records, id } = await captureThree();
    const r = records[1].record;
    expect(r).toMatchObject({
      type: 'saakshi.evidence.record',
      version: '0.2',
      session: id,
      sequence: 1,
      segment: { clip: 0, index: 0 },
      interrupted: false,
      file: { name: '0001-clip0-seg0.mp4', mediaType: 'video/mp4', size: 12 },
      capture: {
        mode: 'camera',
        startedAt: '2026-10-20T09:02:03.123Z',
        endedAt: '2026-10-20T09:03:03.140Z',
        endedAtSource: 'recorder',
        endReason: 'stopped',
        gapBeforeMs: null,
        hashedAt: '2026-10-20T09:03:04.000Z',
        timeZone: 'Asia/Kolkata',
      },
      location: fix,
      locationStatus: 'fixed',
      device,
      app,
    });
    expect(r.file.sha256).toBe(createHash('sha256').update('segment zero').digest('hex'));
    expect(r.file.md5).toBe(createHash('md5').update('segment zero').digest('hex'));
  });

  it('chains each record to the one before', async () => {
    const { records } = await captureThree();
    expect(records[0].record.previous).toBeNull();
    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1];
      expect(records[i].record.previous).toEqual({
        id: prev.record.id,
        recordSha256: createHash('sha256').update(prev.body, 'utf8').digest('hex'),
        fileSha256: prev.record.file.sha256,
      });
      expect(records[i].item.recordSha256).toBe(createHash('sha256').update(records[i].body, 'utf8').digest('hex'));
    }
  });

  it('detects a changed record', async () => {
    const { records, key } = await captureThree();
    const tampered = records[0].body.replace('"latitude":19.076', '"latitude":19.077');
    expect(tampered).not.toBe(records[0].body);
    expect(verify('sha256', Buffer.from(tampered, 'utf8'), key.publicKey, Buffer.from(records[0].signature))).toBe(false);
  });

  it('records why there is no location', async () => {
    const ctx = setup();
    await ctx.session.add({ ...file('cache://p.jpg', 'photo', null), location: { status: 'denied', fix: null } });
    const state = ctx.locker.store.readSession(ctx.session.id!)!;
    const record = JSON.parse(ctx.locker.records.get(`${ctx.session.id}/${state.items[0].record!.file}`)!.body);
    expect(record.location).toBeNull();
    expect(record.locationStatus).toBe('denied');
  });
});
