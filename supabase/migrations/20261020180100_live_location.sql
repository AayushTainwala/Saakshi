-- Live location by link (spec S3). Holds a user's position only while they share it, and deletes
-- it when they stop or the share expires. There are no accounts: the phone proves it owns a share
-- with a random secret only it knows (stored here as its SHA-256), and a contact reads it with the
-- random token in the link. Tables are not reachable through the API at all; everything goes
-- through the four public functions below. (The Supabase security advisor flags these four as
-- SECURITY DEFINER functions anyone can call; that is the design.)

create schema if not exists live;
revoke all on schema live from public, anon, authenticated;

create table live.shares (
  id uuid primary key default gen_random_uuid(),
  -- In the link contacts open; 144 random bits, URL-safe Base64.
  view_token text not null unique,
  -- SHA-256 of the phone's write secret.
  write_hash bytea not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint expires_within_a_day check (expires_at <= created_at + interval '24 hours')
);

create table live.positions (
  id bigint generated always as identity primary key,
  share_id uuid not null references live.shares (id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m real check (accuracy_m is null or accuracy_m >= 0),
  fixed_at timestamptz not null
);

create index positions_share_fixed_at on live.positions (share_id, fixed_at desc);

alter table live.shares enable row level security;
alter table live.positions enable row level security;
-- No policies: nobody reads or writes the tables directly.

-- At most this many shares at once across everyone, and this many positions kept per share.
create or replace function live.limits()
returns table (max_active_shares int, max_positions int, max_hours int, max_batch int)
language sql immutable
set search_path = ''
as $$ select 20000, 300, 24, 60 $$;

-- Starts a share. The phone sends the SHA-256 of a secret it keeps; returns the share's id, the
-- token for the link, and when it ends.
create or replace function public.live_start(write_hash_hex text, hours int)
returns table (share_id uuid, view_token text, expires_at timestamptz)
language plpgsql security definer
set search_path = ''
as $$
declare
  lim record;
  token text;
  hash bytea;
begin
  select * into lim from live.limits();
  if write_hash_hex !~ '^[0-9a-f]{64}$' then
    raise exception 'write_hash_hex must be 64 lowercase hex digits' using errcode = '22023';
  end if;
  hash := decode(write_hash_hex, 'hex');
  if (select count(*) from live.shares s where s.expires_at > now()) >= lim.max_active_shares then
    raise exception 'Too many live shares right now; try again later' using errcode = '53400';
  end if;
  token := translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_');
  return query
    insert into live.shares as s (view_token, write_hash, expires_at)
    values (token, hash, now() + make_interval(hours => greatest(1, least(coalesce(hours, 1), lim.max_hours))))
    returning s.id, s.view_token, s.expires_at;
end;
$$;

-- Internal: adds a JSON array of {"lat", "lng", "acc", "at"} to a share. A time in the future is
-- taken as now.
create or replace function live.add_positions(share uuid, points jsonb)
returns void
language sql
set search_path = ''
as $$
  insert into live.positions (share_id, latitude, longitude, accuracy_m, fixed_at)
  select share, (p ->> 'lat')::double precision, (p ->> 'lng')::double precision,
         (p ->> 'acc')::real, least((p ->> 'at')::timestamptz, now())
  from jsonb_array_elements(points) as p;
$$;

-- Internal: keeps only a share's most recent positions.
create or replace function live.keep_latest(share uuid, keep_count int)
returns void
language sql
set search_path = ''
as $$
  with ranked as (
    select pos.id, row_number() over (order by pos.fixed_at desc) as n
    from live.positions pos
    where pos.share_id = share
  )
  delete from live.positions target
  using ranked
  where target.id = ranked.id
    and ranked.n > keep_count;
$$;

-- Adds positions to a share: a JSON array of {"lat", "lng", "acc", "at"}. Returns when the share
-- ends, or null if it has ended or the secret is wrong.
create or replace function public.live_push(share_id uuid, write_secret text, points jsonb)
returns timestamptz
language plpgsql security definer
set search_path = ''
as $$
declare
  lim record;
  ends timestamptz;
begin
  select * into lim from live.limits();
  select s.expires_at into ends
    from live.shares s
    where s.id = live_push.share_id
      and s.write_hash = extensions.digest(write_secret, 'sha256')
      and s.expires_at > now();
  if ends is null then
    return null;
  end if;
  if jsonb_typeof(points) is distinct from 'array' then
    raise exception 'points must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(points) > lim.max_batch then
    raise exception 'at most % positions at a time', lim.max_batch using errcode = '22023';
  end if;
  perform live.add_positions(live_push.share_id, points);
  perform live.keep_latest(live_push.share_id, lim.max_positions);
  return ends;
end;
$$;

-- Stops a share and deletes everything held for it. True if there was something to delete.
create or replace function public.live_stop(share_id uuid, write_secret text)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  removed int;
begin
  delete from live.shares s
  where s.id = live_stop.share_id
    and s.write_hash = extensions.digest(write_secret, 'sha256');
  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

-- What a contact's link shows: when the share ends and its latest positions, newest first. Null
-- once the share has ended.
create or replace function public.live_view(view_token text)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'expiresAt', s.expires_at,
    'positions', coalesce((
      select jsonb_agg(jsonb_build_object('lat', p.latitude, 'lng', p.longitude, 'acc', p.accuracy_m, 'at', p.fixed_at)
                       order by p.fixed_at desc)
      from (
        select * from live.positions pos
        where pos.share_id = s.id
        order by pos.fixed_at desc
        limit 100
      ) p
    ), '[]'::jsonb)
  )
  from live.shares s
  where s.view_token = live_view.view_token
    and s.expires_at > now();
$$;

revoke all on function live.limits() from public;
revoke all on function live.add_positions(uuid, jsonb) from public;
revoke all on function live.keep_latest(uuid, int) from public;
revoke all on function public.live_start(text, int) from public;
revoke all on function public.live_push(uuid, text, jsonb) from public;
revoke all on function public.live_stop(uuid, text) from public;
revoke all on function public.live_view(text) from public;
grant execute on function public.live_start(text, int) to anon, authenticated;
grant execute on function public.live_push(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.live_stop(uuid, text) to anon, authenticated;
grant execute on function public.live_view(text) to anon, authenticated;

-- Shares that were never stopped are deleted once they expire, and the cron log keeps a day.
select cron.schedule('live-delete-expired', '*/5 * * * *', 'delete from live.shares where expires_at < now()');
select cron.schedule('live-trim-cron-log', '17 * * * *', $job$delete from cron.job_run_details where end_time < now() - interval '1 day'$job$);
