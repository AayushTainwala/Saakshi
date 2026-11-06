-- "My phone is being taken" (SPEC 5.4; round 2, group 1.3): live location with no fixed end.
--
-- A share flagged `persistent` is not deleted at 24 hours. Its expiry slides forward to a week after
-- its last position or check-in, so the existing cron job (`live-delete-expired`, every 5 minutes)
-- deletes it a week after the phone last reported. Ordinary shares are unchanged: 1 to 24 hours.
--
-- The `live` schema stays closed to the API: everything still goes through public functions that
-- check the phone's write secret. Backward compatible: an app that calls live_start with two
-- arguments gets an ordinary share, as before.

alter table live.shares add column persistent boolean not null default false;
-- When the phone last sent a position or checked in.
alter table live.shares add column last_seen_at timestamptz not null default now();

alter table live.shares drop constraint expires_within_a_day;
alter table live.shares add constraint expires_within_limits check (
  (not persistent and expires_at <= created_at + interval '24 hours')
  or (persistent and expires_at <= last_seen_at + interval '7 days')
);

-- How long a persistent share is kept after the phone last reported.
create or replace function live.keep_for()
returns interval
language sql immutable
set search_path = ''
as $$ select interval '7 days' $$;

-- Starts a share. The phone sends the SHA-256 of a secret it keeps; returns the share's id, the
-- token for the link, and when it ends. With `persistent`, it has no fixed end (see above).
drop function public.live_start(text, int);
create function public.live_start(write_hash_hex text, hours int, persistent boolean default false)
returns table (share_id uuid, view_token text, expires_at timestamptz)
language plpgsql security definer
set search_path = ''
as $$
declare
  lim record;
  token text;
  hash bytea;
  ends timestamptz;
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
  ends := case
    when coalesce(live_start.persistent, false) then now() + live.keep_for()
    else now() + make_interval(hours => greatest(1, least(coalesce(hours, 1), lim.max_hours)))
  end;
  return query
    insert into live.shares as s (view_token, write_hash, expires_at, persistent)
    values (token, hash, ends, coalesce(live_start.persistent, false))
    returning s.id, s.view_token, s.expires_at;
end;
$$;

-- Adds positions to a share: a JSON array of {"lat", "lng", "acc", "at"}. Returns when the share
-- ends, or null if it has ended or the secret is wrong. A persistent share's end moves to a week
-- from now with every call.
create or replace function public.live_push(share_id uuid, write_secret text, points jsonb)
returns timestamptz
language plpgsql security definer
set search_path = ''
as $$
declare
  lim record;
  ends timestamptz;
  keep boolean;
begin
  select * into lim from live.limits();
  select s.expires_at, s.persistent into ends, keep
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
  if keep then
    update live.shares s
      set last_seen_at = now(), expires_at = now() + live.keep_for()
      where s.id = live_push.share_id
      returning s.expires_at into ends;
  end if;
  return ends;
end;
$$;

-- Keeps a share alive with no fixed end, from now: it becomes persistent and lasts a week after its
-- last position or call to this function (a check-in). Returns when it now ends, or null if it has
-- ended or the secret is wrong. Used when "My phone is being taken" starts while a share runs.
create function public.live_keep(share_id uuid, write_secret text)
returns timestamptz
language plpgsql security definer
set search_path = ''
as $$
declare
  ends timestamptz;
begin
  update live.shares s
    set persistent = true, last_seen_at = now(), expires_at = now() + live.keep_for()
    where s.id = live_keep.share_id
      and s.write_hash = extensions.digest(write_secret, 'sha256')
      and s.expires_at > now()
    returning s.expires_at into ends;
  return ends;
end;
$$;

-- What a contact's link shows: when the share ends, whether it has no fixed end, and its latest
-- positions, newest first. Null once the share has ended.
create or replace function public.live_view(view_token text)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'expiresAt', s.expires_at,
    'persistent', s.persistent,
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

revoke all on function live.keep_for() from public;
revoke all on function public.live_start(text, int, boolean) from public;
revoke all on function public.live_push(uuid, text, jsonb) from public;
revoke all on function public.live_keep(uuid, text) from public;
revoke all on function public.live_view(text) from public;
grant execute on function public.live_start(text, int, boolean) to anon, authenticated;
grant execute on function public.live_push(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.live_keep(uuid, text) to anon, authenticated;
grant execute on function public.live_view(text) to anon, authenticated;
