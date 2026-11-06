import { splitLength, summarize } from '../locker/summary';
import type { EvidenceItem, SessionState } from '../types';
import { partAt, planPlayback } from '../ui/playback';

function item(sequence: number, over: Partial<EvidenceItem>): EvidenceItem {
  return {
    sequence,
    kind: 'video',
    segment: null,
    media: `${sequence}.mp4`,
    mediaType: 'video/mp4',
    startedAt: '2026-11-06T05:10:00.000Z',
    endedAt: '2026-11-06T05:11:00.000Z',
    status: 'sealed',
    ...over,
  };
}

function session(items: EvidenceItem[], over: Partial<SessionState> = {}): SessionState {
  return {
    version: 1,
    id: 's',
    createdAt: '2026-11-06T05:09:00.000Z',
    updatedAt: '2026-11-06T05:20:00.000Z',
    items,
    witness: [],
    certificate: null,
    ...over,
  };
}

const at = (m: number, s = 0, msec = 0) => new Date(Date.UTC(2026, 10, 6, 5, m, s, msec)).toISOString();

describe('summarize (the records list)', () => {
  it('counts an evidence-camera session by what it holds, and adds up its videos', () => {
    const summary = summarize(
      session([
        item(0, { kind: 'photo', media: '0.jpg', startedAt: at(10), endedAt: at(10), mode: 'camera' }),
        item(1, { startedAt: at(11), endedAt: at(11, 30), mode: 'camera' }),
        item(2, { startedAt: at(15), endedAt: at(16), mode: 'camera' }),
      ]),
    );
    expect(summary).toMatchObject({ kind: 'camera', photos: 1, videos: 2, sounds: 0, startedAt: at(10), lengthMs: 90_000 });
    expect(summary.thumbnail?.sequence).toBe(0);
  });

  it('gives photos alone no length', () => {
    const summary = summarize(session([item(0, { kind: 'photo', media: '0.jpg', mode: 'camera' })]));
    expect(summary).toMatchObject({ kind: 'camera', photos: 1, lengthMs: null });
  });

  it('measures body-cam from Start to Stop, gaps and sound-only files included', () => {
    const summary = summarize(
      session([
        item(3, { segment: { clip: 0, index: 0 }, startedAt: at(10), endedAt: at(12), mode: 'body-cam' }),
        item(5, { kind: 'audio', segment: { clip: 1, index: 0 }, startedAt: at(11, 59, 500), endedAt: at(14, 0, 500), mode: 'body-cam' }),
        item(9, { segment: { clip: 2, index: 0 }, startedAt: at(14), endedAt: at(20), mode: 'body-cam' }),
      ]),
    );
    expect(summary).toMatchObject({ kind: 'body-cam', videos: 2, sounds: 1, startedAt: at(10), lengthMs: 10 * 60_000 });
    expect(summary.thumbnail?.sequence).toBe(3);
  });

  it('knows bug mode, with no picture', () => {
    const summary = summarize(
      session([item(4, { kind: 'audio', segment: { clip: 0, index: 0 }, media: '4.aac', startedAt: at(10), endedAt: at(40), mode: 'bug' })], {
        checkpoints: [{ sequence: 0, recording: 'r', index: 0, bytes: 1, sha256: 'x', at: at(10, 10), status: 'sealed', mode: 'bug' }],
      }),
    );
    expect(summary).toMatchObject({ kind: 'bug', sounds: 1, lengthMs: 30 * 60_000, thumbnail: null });
  });

  it('reads the mode from the signed record for older sessions, or infers it', () => {
    const old = session([item(0, { kind: 'audio', segment: { clip: 0, index: 0 }, media: '0.m4a' })]);
    expect(summarize(old).kind).toBe('bug');
    expect(summarize(old, () => 'body-cam').kind).toBe('body-cam');
    // Body-cam sound with video in the same session, or with body-cam checkpoints (before 0.6).
    expect(summarize(session([...old.items, item(1, { segment: { clip: 1, index: 0 } })])).kind).toBe('body-cam');
    expect(
      summarize(session(old.items, { checkpoints: [{ sequence: 1, recording: 'r', index: 0, bytes: 1, sha256: 'x', at: at(10), status: 'sealed' }] })).kind,
    ).toBe('body-cam');
    expect(summarize(session([item(0, {})])).kind).toBe('camera');
  });

  it('shows a body-cam recording still being made, before its file closes', () => {
    const summary = summarize(
      session([], { checkpoints: [{ sequence: 0, recording: 'r', index: 0, bytes: 1, sha256: 'x', at: at(10, 10), status: 'sealed', mode: 'body-cam' }] }),
    );
    expect(summary).toMatchObject({ kind: 'body-cam', lengthMs: null, startedAt: '2026-11-06T05:09:00.000Z' });
  });

  it('splits a length into hours, minutes and seconds', () => {
    expect(splitLength(3_725_400)).toEqual({ h: 1, m: 2, s: 5 });
    expect(splitLength(59_600)).toEqual({ h: 0, m: 1, s: 0 });
  });
});

describe('planPlayback (one recording, played end to end)', () => {
  it('plays body-cam files in order, skipping the sound each hand-over overlaps', () => {
    const plan = planPlayback([
      item(9, { segment: { clip: 2, index: 0 }, startedAt: at(14), endedAt: at(20) }),
      item(3, { segment: { clip: 0, index: 0 }, startedAt: at(10), endedAt: at(12) }),
      item(5, { kind: 'audio', segment: { clip: 1, index: 0 }, startedAt: at(11, 59, 500), endedAt: at(14, 0, 500) }),
      item(1, { kind: 'photo', startedAt: at(10, 30), endedAt: at(10, 30) }),
    ]);
    expect(plan.parts.map((p) => [p.item.sequence, p.startAt, p.offsetMs, p.lengthMs, p.gapBeforeMs])).toEqual([
      [3, 0, 0, 120_000, 0],
      [5, 0.5, 120_000, 120_500, 0],
      [9, 0.5, 240_500, 359_500, 0],
    ]);
    expect(plan.totalMs).toBe(600_000);
    expect(partAt(plan, 250_000)).toEqual({ index: 2, intoMs: 9_500 });
    expect(partAt(plan, 0)).toEqual({ index: 0, intoMs: 0 });
  });

  it('keeps a gap where nothing was recorded, and leaves out a file the others cover', () => {
    const plan = planPlayback([
      item(0, { kind: 'audio', startedAt: at(10), endedAt: at(20) }),
      item(1, { kind: 'audio', startedAt: at(12), endedAt: at(15) }),
      item(2, { kind: 'audio', startedAt: at(22), endedAt: at(30) }),
      item(3, { kind: 'audio', startedAt: at(31), endedAt: at(32), status: 'failed' }),
    ]);
    expect(plan.parts.map((p) => [p.item.sequence, p.offsetMs, p.gapBeforeMs])).toEqual([
      [0, 0, 0],
      [2, 12 * 60_000, 2 * 60_000],
    ]);
    expect(plan.totalMs).toBe(20 * 60_000);
  });

  it('has nothing to play for photos only', () => {
    expect(planPlayback([item(0, { kind: 'photo' })])).toEqual({ parts: [], totalMs: 0 });
  });
});
