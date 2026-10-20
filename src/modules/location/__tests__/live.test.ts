import { createHash } from 'node:crypto';

import { createLiveApi, type LiveApi, type LivePoint } from '../live/api';
import { LIVE_VIEWER_URL } from '../live/config';
import { type LiveDeps, LiveShareController, MAX_PENDING } from '../live/share';

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

describe('LiveShareController', () => {
  it('starts a share with only the hash of its secret, and gives a link with the token after #', async () => {
    const { live, server, tracker, saved } = setup();
    const share = await live.start(4, notice);

    const expectedHash = createHash('sha256').update('ab'.repeat(32)).digest('hex');
    expect(server.start).toHaveBeenCalledWith(expectedHash, 4);
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
