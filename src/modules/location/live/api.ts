import { LIVE_SERVER } from './config';

export type LivePoint = { lat: number; lng: number; acc: number | null; at: string };

export type StartedShare = { shareId: string; viewToken: string; expiresAt: string };

/** The four calls to the live-location server (supabase/migrations). */
export type LiveApi = {
  start(writeHashHex: string, hours: number): Promise<StartedShare>;
  /** Resolves to when the share ends, or null if it has ended (or was stopped). */
  push(shareId: string, writeSecret: string, points: LivePoint[]): Promise<string | null>;
  /** True if the server had something to delete. */
  stop(shareId: string, writeSecret: string): Promise<boolean>;
};

type Fetch = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export class LiveServerError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function createLiveApi(fetchImpl: Fetch = fetch, server = LIVE_SERVER): LiveApi {
  async function rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
    const response = await fetchImpl(`${server.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: server.publishableKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new LiveServerError(response.status, body?.message ?? `HTTP ${response.status}`);
    }
    return response.json();
  }

  return {
    async start(writeHashHex, hours) {
      const rows = (await rpc('live_start', { write_hash_hex: writeHashHex, hours })) as {
        share_id: string;
        view_token: string;
        expires_at: string;
      }[];
      const row = rows[0];
      if (!row) throw new LiveServerError(500, 'The server did not start a share');
      return { shareId: row.share_id, viewToken: row.view_token, expiresAt: row.expires_at };
    },
    async push(shareId, writeSecret, points) {
      return (await rpc('live_push', { share_id: shareId, write_secret: writeSecret, points })) as string | null;
    },
    async stop(shareId, writeSecret) {
      return (await rpc('live_stop', { share_id: shareId, write_secret: writeSecret })) === true;
    },
  };
}
