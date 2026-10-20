import { createHash, verify } from 'node:crypto';

import { CaptureSession } from '../capture/pipeline';
import { copyName, type CopyRecord, makePlayableCopy } from '../export/playableCopy';
import { canonicalize } from '../integrity/canonical';
import type { EvidenceRecord } from '../integrity/record';
import { createSealer } from '../integrity/seal';
import type { FileDigests } from '../types';
import { memoryLocker } from './memoryLocker';
import { nodeSha256Hex, testSigner } from './testSigner';

const device = { manufacturer: 'Google', brand: 'google', model: 'Pixel 8', modelName: null, os: 'Android', osVersion: '15' };
const app = { id: 'in.aayushtainwala.saakshi', version: '1.0.0', build: '1' };

function digestsOf(bytes: Uint8Array): FileDigests {
  const h = (a: string) => createHash(a).update(bytes).digest('hex');
  return { size: bytes.length, sha256: h('sha256'), sha1: h('sha1'), md5: h('md5'), crc32: 0 };
}

async function sealedSession() {
  const files = new Map<string, Uint8Array>([
    ['mem://incoming/rec.ts', new Uint8Array(188 * 10).fill(0x47)],
    ['cache://p.jpg', new Uint8Array([1, 2])],
  ]);
  const locker = memoryLocker(files);
  const key = testSigner();
  let ids = 0;
  const newId = () => `id-${ids++}`;
  const hash = async (uri: string) => digestsOf(files.get(uri)!);
  const session = new CaptureSession({
    store: locker.store,
    now: () => new Date('2026-10-22T09:00:00Z'),
    newId,
    hash,
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
  const base = { startedAt: new Date('2026-10-22T08:59:00Z'), endedAt: new Date('2026-10-22T09:00:00Z'), location: { status: 'denied' as const, fix: null } };
  await session.add({ uri: 'mem://incoming/rec.ts', kind: 'video', segment: null, rotationDegrees: 90, ...base });
  await session.add({ uri: 'cache://p.jpg', kind: 'photo', segment: null, ...base });
  await session.finish();

  const remuxed: { input: string; output: string; rotation: number | null }[] = [];
  const deps = {
    store: locker.store,
    remux: async (input: string, output: string, rotation: number | null) => {
      remuxed.push({ input, output, rotation });
      files.set(output, new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70])); // "ftyp"
      return output;
    },
    hash,
    signer: async () => key.signer,
    sha256Hex: nodeSha256Hex,
    newId,
    device: () => device,
    app: () => app,
    now: () => new Date('2026-10-22T10:00:00Z'),
  };
  return { files, locker, key, deps, remuxed, id: session.id! };
}

describe('playable MP4 copy of an Android .ts video', () => {
  it('makes the copy with its own signed record naming the original and the method', async () => {
    const { locker, key, deps, remuxed, id, files } = await sealedSession();
    const state = locker.store.readSession(id)!;
    const video = state.items[0];
    expect(video.mediaType).toBe('video/mp2t');
    const originalBytes = files.get(locker.store.mediaUri(id, video.media))!.slice();

    const uri = await makePlayableCopy(deps, id, 0);
    expect(uri).toBe(`mem://${id}/copies/0000-video.copy.mp4`);
    expect(remuxed).toEqual([{ input: `mem://${id}/media/0000-video.ts`, output: uri, rotation: 90 }]);

    const { body, signature } = locker.copyRecords.get(`${id}/0000-video.copy.mp4`)!;
    expect(verify('sha256', Buffer.from(body, 'utf8'), key.publicKey, Buffer.from(signature))).toBe(true);
    const record = JSON.parse(body) as CopyRecord;
    expect(body).toBe(canonicalize(record));
    const original = JSON.parse(locker.records.get(`${id}/${video.record!.file}`)!.body) as EvidenceRecord;
    expect(original.capture.rotationDegrees).toBe(90);
    expect(record).toMatchObject({
      type: 'saakshi.evidence.copy',
      version: '0.2',
      session: id,
      original: { recordId: original.id, recordSha256: video.recordSha256, fileName: '0000-video.ts', fileSha256: original.file.sha256 },
      method: { name: 'remux-mpegts-to-mp4', reencoded: false, rotationDegrees: 90 },
      file: { name: '0000-video.copy.mp4', mediaType: 'video/mp4', size: 8 },
      madeAt: '2026-10-22T10:00:00.000Z',
      key: { id: key.keyId, algorithm: 'ES256' },
    });

    // The original is untouched, and the copy is not an item, so the chain, bundle and certificate don't change.
    expect(files.get(locker.store.mediaUri(id, video.media))).toEqual(originalBytes);
    const after = locker.store.readSession(id)!;
    expect(after.items).toEqual(state.items);
    expect(after.copies?.['0']).toMatchObject({ file: '0000-video.copy.mp4', sha256: record.file.sha256 });
  });

  it('reuses a copy already made', async () => {
    const { deps, remuxed, id } = await sealedSession();
    await makePlayableCopy(deps, id, 0);
    await makePlayableCopy(deps, id, 0);
    expect(remuxed).toHaveLength(1);
  });

  it('copies only sealed MPEG-TS videos', async () => {
    const { deps, id } = await sealedSession();
    await expect(makePlayableCopy(deps, id, 1)).rejects.toThrow('Only MPEG-TS videos need a copy');
    await expect(makePlayableCopy(deps, id, 7)).rejects.toThrow('Only a sealed video can be copied');
  });

  it('names copies clearly', () => {
    expect(copyName('0003-clip1-seg2.ts')).toBe('0003-clip1-seg2.copy.mp4');
  });
});
