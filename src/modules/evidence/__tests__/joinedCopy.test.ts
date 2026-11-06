import { createHash, createPublicKey, verify } from 'node:crypto';

import type { JoinRequest } from '../export/joinedCopy';
import { JOINED_COPY_NAME, makeJoinedCopy, needsJoinedCopy, planJoin } from '../export/joinedCopy';
import type { EvidenceItem, SessionState } from '../types';
import { memoryLocker } from './memoryLocker';
import { nodeSha256Hex, testSigner } from './testSigner';

const at = (m: number, s = 0, msec = 0) => new Date(Date.UTC(2026, 10, 6, 5, m, s, msec)).toISOString();
const sha = (text: string) => createHash('sha256').update(text).digest('hex');

function item(sequence: number, over: Partial<EvidenceItem>): EvidenceItem {
  return {
    sequence,
    kind: 'video',
    segment: { clip: 0, index: 0 },
    media: `000${sequence}-clip0-seg0.mp4`,
    mediaType: 'video/mp4',
    startedAt: at(10),
    endedAt: at(12),
    status: 'sealed',
    mode: 'body-cam',
    record: { file: `000${sequence}.json`, recordId: `rec-${sequence}` },
    recordSha256: `record-sha-${sequence}`,
    digests: { size: 3, sha256: `file-sha-${sequence}`, sha1: '', md5: '', crc32: 0 },
    ...over,
  };
}

// An iPhone body-cam record: video, then sound only while the user was away, then video again.
const items = [
  item(3, { startedAt: at(10), endedAt: at(12) }),
  item(5, { kind: 'audio', media: '0005-audio1-seg0.aac', mediaType: 'audio/aac', startedAt: at(11, 59, 500), endedAt: at(14, 0, 500) }),
  item(9, { media: '0009-clip2-seg0.mp4', startedAt: at(14), endedAt: at(20) }),
];

describe('planJoin', () => {
  it('puts each video file at its place, and takes each stretch of sound once', () => {
    const plan = planJoin(items);
    expect(plan.video.map((s) => [s.item.sequence, s.at, s.from, s.length])).toEqual([
      [3, 0, 0, 120],
      [9, 240, 0, 360],
    ]);
    expect(plan.audio.map((s) => [s.item.sequence, s.at, s.from, s.length])).toEqual([
      [3, 0, 0, 120],
      [5, 120, 0.5, 120.5],
      [9, 240.5, 0.5, 359.5],
    ]);
    expect(plan.sources.map((s) => s.sequence)).toEqual([3, 5, 9]);
    expect(plan.parts[1]).toEqual({ track: 'video', source: '0009-clip2-seg0.mp4', atMs: 240_000, fromMs: 0, lengthMs: 360_000 });
  });

  it('takes an older record\'s sound from its sound files, alongside its muted videos', () => {
    const old = [
      item(0, { startedAt: at(10), endedAt: at(11) }),
      item(1, { kind: 'audio', media: '1.m4a', startedAt: at(10, 0, 500), endedAt: at(11, 0, 600) }),
      item(2, { media: '2.mp4', startedAt: at(11), endedAt: at(12) }),
      item(3, { kind: 'audio', media: '3.m4a', startedAt: at(11, 0, 500), endedAt: at(12, 0, 400) }),
    ];
    const plan = planJoin(old);
    expect(plan.video.map((s) => [s.item.sequence, s.at])).toEqual([
      [0, 0],
      [2, 60],
    ]);
    expect(plan.audio.map((s) => [s.item.sequence, s.at, s.from])).toEqual([
      [1, 0.5, 0],
      [3, 60.6, 0.1],
    ]);
  });

  it('uses only sealed files, and asks for a joined copy only with more than one video', () => {
    const unsealed = [items[0], { ...items[2], status: 'failed' as const }];
    expect(planJoin(unsealed).video).toHaveLength(1);
    const session = (list: EvidenceItem[]): SessionState => ({
      version: 1,
      id: 's',
      createdAt: at(9),
      updatedAt: at(20),
      items: list,
      witness: [],
      certificate: null,
    });
    expect(needsJoinedCopy(session(items))).toBe(true);
    expect(needsJoinedCopy(session(unsealed))).toBe(false);
  });
});

describe('makeJoinedCopy', () => {
  function setup(rotations: (number | null)[] = [null, null, null]) {
    const locker = memoryLocker();
    const state = locker.store.createSession('s', at(9));
    locker.store.writeSession({ ...state, items });
    items.forEach((i, n) => {
      const record = { id: i.record!.recordId, file: { sha256: i.digests!.sha256 }, capture: { rotationDegrees: rotations[n] } };
      locker.store.writeRecord('s', i.record!.file, JSON.stringify(record), new Uint8Array([1]));
    });
    const key = testSigner();
    const requests: JoinRequest[] = [];
    const deps = {
      store: locker.store,
      join: async (request: JoinRequest) => {
        requests.push(request);
        return { uri: request.output, reencoded: false };
      },
      hash: async () => ({ size: 9000, sha256: 'c'.repeat(64), sha1: 's1', md5: 'm5', crc32: 0 }),
      signer: async () => key.signer,
      sha256Hex: nodeSha256Hex,
      newId: () => 'copy-1',
      device: () => ({ manufacturer: 'Apple', brand: 'Apple', model: 'iPhone17,1', modelName: 'iPhone 16 Pro', os: 'iOS', osVersion: '26.1' }),
      app: () => ({ id: 'in.aayushtainwala.saakshi', version: '1.0.0', build: '1' }),
      now: () => new Date(at(30)),
    };
    return { locker, deps, requests, key };
  }

  it('joins the files and signs a record naming every source and where each part went', async () => {
    const { locker, deps, requests, key } = setup();
    const uri = await makeJoinedCopy(deps, 's');
    expect(uri).toBe(`mem://s/copies/${JOINED_COPY_NAME}`);
    expect(requests).toHaveLength(1);
    expect(requests[0].video.map((v) => [v.uri, v.at])).toEqual([
      ['mem://s/media/0003-clip0-seg0.mp4', 0],
      ['mem://s/media/0009-clip2-seg0.mp4', 240],
    ]);
    expect(requests[0].audio.map((a) => a.uri)).toEqual([
      'mem://s/media/0003-clip0-seg0.mp4',
      'mem://s/media/0005-audio1-seg0.aac',
      'mem://s/media/0009-clip2-seg0.mp4',
    ]);
    expect(requests[0].rotationDegrees).toBeNull();

    const stored = locker.copyRecords.get(`s/${JOINED_COPY_NAME}`)!;
    const record = JSON.parse(stored.body);
    expect(record).toMatchObject({
      type: 'saakshi.evidence.joined-copy',
      version: '0.8',
      session: 's',
      method: { name: 'join-mp4', reencoded: false },
      file: { name: JOINED_COPY_NAME, mediaType: 'video/mp4', size: 9000, sha256: 'c'.repeat(64) },
    });
    expect(record.sources).toEqual([
      { recordId: 'rec-3', recordSha256: 'record-sha-3', fileName: '0003-clip0-seg0.mp4', fileSha256: 'file-sha-3' },
      { recordId: 'rec-5', recordSha256: 'record-sha-5', fileName: '0005-audio1-seg0.aac', fileSha256: 'file-sha-5' },
      { recordId: 'rec-9', recordSha256: 'record-sha-9', fileName: '0009-clip2-seg0.mp4', fileSha256: 'file-sha-9' },
    ]);
    expect(record.parts).toHaveLength(5);
    // Signed over exactly the stored bytes.
    const publicKey = createPublicKey({ key: Buffer.from(key.spki), format: 'der', type: 'spki' });
    expect(verify('sha256', Buffer.from(stored.body), publicKey, Buffer.from(stored.signature))).toBe(true);

    const session = locker.store.readSession('s')!;
    expect(session.joined).toEqual({
      file: JOINED_COPY_NAME,
      sha256: 'c'.repeat(64),
      recordSha256: sha(stored.body),
      madeAt: at(30),
      sources: [3, 5, 9],
      reencoded: false,
    });
  });

  it('makes it once, and again only if the record has gained a file', async () => {
    const { locker, deps, requests } = setup();
    await makeJoinedCopy(deps, 's');
    await makeJoinedCopy(deps, 's');
    expect(requests).toHaveLength(1);
    const state = locker.store.readSession('s')!;
    const extra = item(11, { media: '0011-clip3-seg0.mp4', startedAt: at(21), endedAt: at(22) });
    locker.store.writeRecord('s', extra.record!.file, JSON.stringify({ id: 'rec-11', file: { sha256: 'file-sha-11' }, capture: {} }), new Uint8Array([1]));
    locker.store.writeSession({ ...state, items: [...state.items, extra] });
    await makeJoinedCopy(deps, 's');
    expect(requests).toHaveLength(2);
    expect(locker.store.readSession('s')!.joined!.sources).toEqual([3, 5, 9, 11]);
  });

  it('names in its record only what the phone could place', async () => {
    const { locker, deps } = setup();
    // The second video file was recorded without sound (for example, during a phone call).
    await makeJoinedCopy({ ...deps, join: async (r) => ({ uri: r.output, reencoded: false, placedVideo: [true, true], placedAudio: [true, true, false] }) }, 's');
    const record = JSON.parse(locker.copyRecords.get(`s/${JOINED_COPY_NAME}`)!.body);
    expect(record.parts.map((p: { track: string; source: string }) => `${p.track} ${p.source}`)).toEqual([
      'video 0003-clip0-seg0.mp4',
      'video 0009-clip2-seg0.mp4',
      'audio 0003-clip0-seg0.mp4',
      'audio 0005-audio1-seg0.aac',
    ]);
    expect(record.sources.map((s: { fileName: string }) => s.fileName)).toEqual(['0003-clip0-seg0.mp4', '0005-audio1-seg0.aac', '0009-clip2-seg0.mp4']);
  });

  it('refuses to delete the record while the copy is being made, and joins it once', async () => {
    const { locker, deps } = setup();
    let finish: () => void = () => undefined;
    let calls = 0;
    const slow = {
      ...deps,
      join: (r: JoinRequest) => {
        calls++;
        return new Promise<{ uri: string; reencoded: boolean }>((resolve) => (finish = () => resolve({ uri: r.output, reencoded: false })));
      },
    };
    const first = makeJoinedCopy(slow, 's');
    const second = makeJoinedCopy(slow, 's');
    await Promise.resolve();
    const { deleteSession, SessionBusyError } = jest.requireActual('../locker/delete');
    expect(() => deleteSession(locker.store, 's')).toThrow(SessionBusyError);
    finish();
    expect(await first).toBe(await second);
    expect(calls).toBe(1);
    expect(() => deleteSession(locker.store, 's')).not.toThrow();
  });

  it('writes nothing back if the record was deleted meanwhile', async () => {
    const { locker, deps } = setup();
    await expect(
      makeJoinedCopy({ ...deps, hash: async () => (locker.store.deleteSession('s'), { size: 1, sha256: 'x', sha1: '', md5: '', crc32: 0 }) }, 's'),
    ).rejects.toThrow('deleted');
    expect(locker.store.readSession('s')).toBeNull();
    expect(locker.copyRecords.size).toBe(0);
  });

  it('says so when the phone had to re-encode', async () => {
    const { locker, deps } = setup();
    await makeJoinedCopy({ ...deps, join: async (r) => ({ uri: r.output, reencoded: true }) }, 's');
    const record = JSON.parse(locker.copyRecords.get(`s/${JOINED_COPY_NAME}`)!.body);
    expect(record.method.reencoded).toBe(true);
    expect(record.method.description).toContain('re-encoded and are not the original samples');
    expect(locker.store.readSession('s')!.joined!.reencoded).toBe(true);
  });

  it('refuses Android files turned different ways (that would need re-encoding)', async () => {
    const { deps } = setup([90, null, 0]);
    await expect(makeJoinedCopy(deps, 's')).rejects.toMatchObject({ code: 'turned' });
  });
});
