-- The battery level in every location update (SPEC 5.2; round 2, group 1.4).
--
-- Each position the phone pushes may carry "bat": the battery level, 0 to 100, when the phone sent
-- it. It is kept with that position and shown on the viewer page with its age. The battery travels
-- with each position rather than as a new argument to live_push, so that live_push keeps its exact
-- signature (an app on phones today calls it unchanged, and no second version of the function could
-- leave the API unable to choose between them), and so that a position queued without signal keeps
-- the level it had when it was taken. A missing, non-numeric or out-of-range "bat" is stored as
-- unknown (null) rather than refusing the position.

alter table live.positions add column battery smallint check (battery is null or battery between 0 and 100);

-- Internal: adds a JSON array of {"lat", "lng", "acc", "at", "bat"} to a share. A time in the
-- future is taken as now.
create or replace function live.add_positions(share uuid, points jsonb)
returns void
language sql
set search_path = ''
as $$
  insert into live.positions (share_id, latitude, longitude, accuracy_m, fixed_at, battery)
  select share, (p ->> 'lat')::double precision, (p ->> 'lng')::double precision,
         (p ->> 'acc')::real, least((p ->> 'at')::timestamptz, now()),
         case
           when jsonb_typeof(p -> 'bat') = 'number' and (p ->> 'bat')::numeric between 0 and 100
             then round((p ->> 'bat')::numeric)::smallint
         end
  from jsonb_array_elements(points) as p;
$$;

-- What a contact's link shows: when the share ends, whether it has no fixed end, and its latest
-- positions, newest first, each with the battery level when the phone sent it (or null). Null once
-- the share has ended.
create or replace function public.live_view(view_token text)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'expiresAt', s.expires_at,
    'persistent', s.persistent,
    'positions', coalesce((
      select jsonb_agg(jsonb_build_object('lat', p.latitude, 'lng', p.longitude, 'acc', p.accuracy_m, 'at', p.fixed_at, 'bat', p.battery)
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

revoke all on function live.add_positions(uuid, jsonb) from public;
revoke all on function public.live_view(text) from public;
grant execute on function public.live_view(text) to anon, authenticated;
