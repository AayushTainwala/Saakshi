import { createHash } from 'node:crypto';

import { createLiveApi, type LiveApi, type LivePoint } from '../live/api';
import { LIVE_VIEWER_URL } from '../live/config';
import { type LiveDeps, LiveShareController, MAX_PENDING, withBattery } from '../live/share';

const point = (minute: number): LivePoint => ({
  lat: 19.076,
  lng: 72.8777,
  acc: 10,
  at: new Date(Date.UTC(2026, 9, 20, 9, minute)).toISOString(),
});

function setup() {
  let text: string | null = null;
  let clock = new Date('2026-10-20T09:00:00Z');
  const server = {
    start: jest.fn(async () => ({ shareId: 'share-1', viewToken: 'tok_ABCDEFGHIJKLMNOPQRSTU', expiresAt: '2026-10-20T13:00:00Z' })),
    push: jest.fn(async (): Promise<string | null> => '2026-10-20T13:00:00Z'),
    keep: jest.fn(async (): Promise<string | null> => '2026-10-27T09:00:00Z'),
    stop: jest.fn(async () => true),
  } satisfies LiveApi;
  const tracker = { start: jest.fn(async () => undefined), stop: jest.fn(async () => undefined) };
  const deps: LiveDeps = {
    api: server,
    storage: { read: () => text, write: (value) => void (text = value) },
    randomHex: () => 'ab'.repeat(32),
    sha256Hex: async (value) => createHash('sha256').update(value).digest('hex'),
    tracker,
    now: () => clock,
  };
  return {
    live: new LiveShareController(deps),
    deps,
    server,
    tracker,
    saved: () => (text ? JSON.parse(text) : null),
    setClock: (iso: string) => (clock = new Date(iso)),
  };
}

const notice = { title: 'Saakshi', body: 'Sharing your location' };

describe('the battery level in location updates (round 2, groups 1.4 and 1.6)', () => {
  it('goes with the newest position of each delivery, at 20% or less', () => {
    expect(withBattery([point(2), point(5), point(3)], 18)).toEqual([point(2), { ...point(5), bat: 18 }, point(3)]);
    expect(withBattery([point(2)], 20)).toEqual([{ ...point(2), bat: 20 }]);
    expect(withBattery([point(2)], 0)).toEqual([{ ...point(2), bat: 0 }]);
    expect(withBattery([point(2)], null)).toEqual([point(2)]);
    expect(withBattery([], 12)).toEqual([]);
  });

  it('is left out of every position above 20%', () => {
    for (const level of [21, 64, 100]) {
      const points = withBattery([point(2), point(5)], level);
      expect(points).toEqual([point(2), point(5)]);
      expect(points.some((p) => 'bat' in p)).toBe(false);
    }
  });

  it('is sent to the server with its position, and kept while there is no signal', async () => {
    const { live, server, saved } = setup();
    await live.start(4, notice);
    server.push.mockRejectedValueOnce(new Error('offline'));
    await live.receive([{ ...point(1), bat: 14 }]);
    expect(saved().active.pending).toEqual([{ ...point(1), bat: 14 }]);
    await live.receive([{ ...point(2), bat: 13 }]);
    expect(server.push).toHaveBeenLastCalledWith('share-1', 'ab'.repeat(32), [
      { ...point(1), bat: 14 },
      { ...point(2), bat: 13 },
    ]);
  });
});

describe('saving mode keeps the position updates as they are (round 2, group 1.7)', () => {
  it('never stops, restarts or changes the running updates', async () => {
    const { live, deps } = setup();
    await live.start(4, notice);
    await live.setSaving(true);
    await live.setSaving(false);
    expect(deps.tracker.stop).not.toHaveBeenCalled();
    expect(deps.tracker.start).toHaveBeenCalledTimes(1);
    expect(Object.keys(deps.tracker).sort()).toEqual(['start', 'stop']);
  });
});

describe('saving mode at 5% battery (round 2, group 1.5)', () => {
  it('sends positions in one burst every 5 minutes, and as they come again once it ends', async () => {
    const { live, server, setClock, saved } = setup();
    await live.start(4, notice);
    await live.receive([point(0)]);
    expect(server.push).toHaveBeenCalledTimes(1);
    await live.setSaving(true);
    expect(saved().active.saving).toBe(true);

    setClock('2026-10-20T09:02:00Z');
    await live.receive([point(2)]);
    setClock('2026-10-20T09:04:00Z');
    await live.receive([point(4)]);
    // Held: less than 5 minutes since the last send.
    expect(server.push).toHaveBeenCalledTimes(1);
    expect(saved().active.pending).toEqual([point(2), point(4)]);

    setClock('2026-10-20T09:05:30Z');
    await live.receive([point(5)]);
    expect(server.push).toHaveBeenCalledTimes(2);
    expect(server.push).toHaveBeenLastCalledWith('share-1', 'ab'.repeat(32), [point(2), point(4), point(5)]);

    await live.setSaving(false);
    setClock('2026-10-20T09:06:00Z');
    await live.receive([point(6)]);
    expect(server.push).toHaveBeenCalledTimes(3);
  });
});

describe('LiveShareController: "My phone is being taken" (round 2, group 1.3)', () => {
  it('starts a share with no fixed end', async () => {
    const { live, server, saved } = setup();
    server.start.mockResolvedValueOnce({ shareId: 'share-1', viewToken: 'tok_ABCDEFGHIJKLMNOPQRSTU', expiresAt: '2026-10-27T09:00:00Z' });
    const share = await live.start(4, notice, { persistent: true });
    expect(server.start).toHaveBeenCalledWith(expect.any(String), 4, true);
    expect(share.persistent).toBe(true);
    expect(saved().active.persistent).toBe(true);
  });

  it('makes a share already running persistent, keeping its link', async () => {
    const { live, server } = setup();
    const first = await live.start(4, notice);
    const kept = await live.start(4, notice, { persistent: true });
    expect(server.keep).toHaveBeenCalledWith('share-1', 'ab'.repeat(32));
    expect(server.start).toHaveBeenCalledTimes(1);
    expect(kept).toEqual({ ...first, persistent: true, expiresAt: '2026-10-27T09:00:00Z' });
    // Asked again, it is already persistent: nothing more to do.
    await live.start(4, notice, { persistent: true });
    expect(server.keep).toHaveBeenCalledTimes(1);
  });

  it('starts afresh if the running share had already ended on the server', async () => {
    const { live, server, tracker } = setup();
    await live.start(4, notice);
    server.keep.mockResolvedValueOnce(null);
    server.start.mockResolvedValueOnce({ shareId: 'share-2', viewToken: 'tok_ZYXWVUTSRQPONMLKJIHGF', expiresAt: '2026-10-27T09:00:00Z' });
    const share = await live.start(4, notice, { persistent: true });
    expect(share.shareId).toBe('share-2');
    expect(share.persistent).toBe(true);
    expect(tracker.stop).toHaveBeenCalled();
  });

  it('moves the end on with every position the server takes', async () => {
    const { live, server } = setup();
    await live.start(4, notice, { persistent: true });
    server.push.mockResolvedValueOnce('2026-10-27T09:05:00Z');
    await live.receive([point(5)]);
    expect(live.getShare()?.expiresAt).toBe('2026-10-27T09:05:00Z');
  });

  it('asks the server for an ordinary share exactly as before', async () => {
    const calls: { url: string; body: string }[] = [];
    const api = createLiveApi(async (url, init) => {
      calls.push({ url, body: init.body });
      return { ok: true, status: 200, json: async () => (url.endsWith('live_keep') ? '2026-10-27T09:00:00Z' : [{ share_id: 's', view_token: 't', expires_at: 'e' }]) };
    });
    await api.start('ab'.repeat(32), 4);
    await api.start('ab'.repeat(32), 4, true);
    expect(await api.keep('s', 'secret')).toBe('2026-10-27T09:00:00Z');
    expect(JSON.parse(calls[0].body)).toEqual({ write_hash_hex: 'ab'.repeat(32), hours: 4 });
    expect(JSON.parse(calls[1].body)).toEqual({ write_hash_hex: 'ab'.repeat(32), hours: 4, persistent: true });
    expect(calls[2].url).toMatch(/\/rest\/v1\/rpc\/live_keep$/);
    expect(JSON.parse(calls[2].body)).toEqual({ share_id: 's', write_secret: 'secret' });
  });
});

describe('LiveShareController', () => {
  it('starts a share with only the hash of its secret, and gives a link with the token after #', async () => {
    const { live, server, tracker, saved } = setup();
    const share = await live.start(4, notice);

    const expectedHash = createHash('sha256').update('ab'.repeat(32)).digest('hex');
    expect(server.start).toHaveBeenCalledWith(expectedHash, 4, false);
    expect(tracker.start).toHaveBeenCalledWith(notice);
    expect(share.link).toBe(`${LIVE_VIEWER_URL}#tok_ABCDEFGHIJKLMNOPQRSTU`);
    expect(live.getShare()).toEqual(share);
    expect(saved().active.writeSecret).toBe('ab'.repeat(32));
  });

  it('returns the running share instead of starting a second', async () => {
    const { live, server } = setup();
    const first = await live.start(4, notice);
    expect(await live.start(1, notice)).toEqual(first);
    expect(server.start).toHaveBeenCalledTimes(1);
  });

  it('takes the share down again if positions cannot start', async () => {
    const { live, server, tracker } = setup();
    tracker.start.mockRejectedValueOnce(new Error('denied'));
    await expect(live.start(4, notice)).rejects.toThrow('denied');
    expect(server.stop).toHaveBeenCalledWith('share-1', 'ab'.repeat(32));
    expect(live.getShare()).toBeNull();
  });

  it('sends positions, and keeps them while there is no signal', async () => {
    const { live, server, saved } = setup();
    await live.start(4, notice);
    server.push.mockRejectedValueOnce(new Error('offline'));
    await live.receive([point(1)]);
    expect(saved().active.pending).toEqual([point(1)]);

    await live.receive([point(2)]);
    expect(server.push).toHaveBeenLastCalledWith('share-1', 'ab'.repeat(32), [point(1), point(2)]);
    expect(saved().active.pending).toEqual([]);
    expect(saved().active.lastSentAt).toBe('2026-10-20T09:00:00.000Z');
  });

  it(`keeps at most ${MAX_PENDING} unsent positions, dropping the oldest`, async () => {
    const { live, server, saved } = setup();
    await live.start(4, notice);
    server.push.mockRejectedValue(new Error('offline'));
    for (let i = 0; i < MAX_PENDING + 5; i++) await live.receive([point(i % 60)]);
    expect(saved().active.pending).toHaveLength(MAX_PENDING);
  });

  it('ends on its own when the server says the share is over', async () => {
    const { live, server, tracker } = setup();
    await live.start(4, notice);
    server.push.mockResolvedValueOnce(null);
    await live.receive([point(1)]);
    expect(live.getShare()).toBeNull();
    expect(tracker.stop).toHaveBeenCalled();
  });

  it('ends at its expiry without calling the server', async () => {
    const { live, server, setClock } = setup();
    await live.start(4, notice);
    setClock('2026-10-20T13:00:01Z');
    await live.receive([point(1)]);
    expect(server.push).not.toHaveBeenCalled();
    expect(live.getShare()).toBeNull();
  });

  it('stops: position updates end and the server deletes the share', async () => {
    const { live, server, tracker, saved } = setup();
    await live.start(4, notice);
    await live.stop();
    expect(tracker.stop).toHaveBeenCalled();
    expect(server.stop).toHaveBeenCalledWith('share-1', 'ab'.repeat(32));
    expect(saved()).toEqual({ version: 1, active: null, unstopped: [] });
  });

  it('remembers a stop made offline and repeats it later', async () => {
    const { live, server, saved } = setup();
    await live.start(4, notice);
    server.stop.mockRejectedValueOnce(new Error('offline'));
    await live.stop();
    expect(live.getShare()).toBeNull();
    expect(saved().unstopped).toEqual([{ shareId: 'share-1', writeSecret: 'ab'.repeat(32) }]);

    await live.retryStops();
    expect(server.stop).toHaveBeenCalledTimes(2);
    expect(saved().unstopped).toEqual([]);
  });

  it('tells subscribers when a share starts and stops', async () => {
    const { live } = setup();
    const listener = jest.fn();
    live.subscribe(listener);
    await live.start(4, notice);
    await live.stop();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('createLiveApi', () => {
  const server = { url: 'https://example.supabase.co', publishableKey: 'sb_publishable_test' };

  it('calls the four functions with the publishable key', async () => {
    const calls: { url: string; init: { headers: Record<string, string>; body: string } }[] = [];
    const responses: unknown[] = [
      [{ share_id: 's', view_token: 't', expires_at: '2026-10-20T13:00:00Z' }],
      '2026-10-20T13:00:00Z',
      true,
    ];
    const api = createLiveApi(async (url, init) => {
      calls.push({ url, init });
      return { ok: true, status: 200, json: async () => responses.shift() };
    }, server);

    expect(await api.start('ff'.repeat(32), 4)).toEqual({ shareId: 's', viewToken: 't', expiresAt: '2026-10-20T13:00:00Z' });
    expect(await api.push('s', 'secret', [point(1)])).toBe('2026-10-20T13:00:00Z');
    expect(await api.stop('s', 'secret')).toBe(true);

    expect(calls.map((c) => c.url)).toEqual([
      'https://example.supabase.co/rest/v1/rpc/live_start',
      'https://example.supabase.co/rest/v1/rpc/live_push',
      'https://example.supabase.co/rest/v1/rpc/live_stop',
    ]);
    expect(calls[0].init.headers.apikey).toBe('sb_publishable_test');
    expect(JSON.parse(calls[0].init.body)).toEqual({ write_hash_hex: 'ff'.repeat(32), hours: 4 });
    expect(JSON.parse(calls[1].init.body)).toEqual({ share_id: 's', write_secret: 'secret', points: [point(1)] });
  });

  it('reports server errors', async () => {
    const api = createLiveApi(
      async () => ({ ok: false, status: 400, json: async () => ({ message: 'points must be an array' }) }),
      server,
    );
    await expect(api.push('s', 'x', [])).rejects.toThrow('points must be an array');
  });
});
