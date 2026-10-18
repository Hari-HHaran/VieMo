-- WheelMo: a film roulette (no betting, no prizes). The database picks the winner, before any animation, from
-- the exact pool the person sees; every film in the pool has the same chance. Each spin is saved with its pool,
-- winner and status, and a request id makes a double click or a reconnect return the same spin, never a new one.

-- Supabase installs pgcrypto in the extensions schema; this makes sure of it elsewhere.
create extension if not exists pgcrypto with schema extensions;

create table public.wheel_spins (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null unique,
  user_id        uuid references public.profiles (id) on delete cascade,   -- null for signed-out visitors
  night_id       uuid,                                                      -- Movie Night spins (see 0007)
  mode           text not null check (mode in ('watchlist', 'playlist', 'surprise', 'group', 'decider')),
  source         text not null check (char_length(source) <= 120),         -- 'account', 'device', a share id, filters
  pool           jsonb not null check (jsonb_typeof(pool) = 'array' and jsonb_array_length(pool) between 2 and 12),
  pool_ids       integer[] not null,
  winner_index   integer not null,
  winner_tmdb_id integer not null,
  selection      text not null default 'uniform' check (selection = 'uniform'),  -- disclosed; nothing weighted
  status         text not null default 'spinning' check (status in ('spinning', 'revealed', 'confirmed', 'superseded')),
  created_at     timestamptz not null default now(),
  revealed_at    timestamptz,
  confirmed_at   timestamptz,
  check (cardinality(pool_ids) = jsonb_array_length(pool)),
  check (winner_index >= 0 and winner_index < cardinality(pool_ids) and pool_ids[winner_index + 1] = winner_tmdb_id)
);
create index spins_by_user on public.wheel_spins (user_id, created_at desc);
create index spins_by_night on public.wheel_spins (night_id, created_at desc) where night_id is not null;
-- One spin in motion per Movie Night at a time.
create unique index one_active_spin_per_night on public.wheel_spins (night_id) where status = 'spinning' and night_id is not null;

alter table public.wheel_spins enable row level security;
revoke all on public.wheel_spins from anon, authenticated;
create policy "your own spins" on public.wheel_spins for select to authenticated using (user_id = (select auth.uid()) and night_id is null);
grant select on public.wheel_spins to authenticated;
-- No insert or update grants: spins are only made and changed by the functions below.

-- A uniformly random index in [0, n) from the operating system's cryptographic generator, by rejection sampling
-- (so no index is even slightly more likely than another).
create or replace function public.wheel_pick(n integer) returns integer
language plpgsql volatile set search_path = '' as $$
declare r bigint; lim bigint;
begin
  if n < 1 then raise exception 'empty pool'; end if;
  lim := (4294967296 / n) * n;
  loop
    r := ('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint;
    exit when r < lim;
  end loop;
  return (r % n)::integer;
end $$;
revoke all on function public.wheel_pick(integer) from public, anon, authenticated;

-- The shared core: checks the pool, picks the winner, saves the spin. Not callable directly.
create or replace function public.wheel_spin_core(p_request uuid, p_user uuid, p_night uuid, p_mode text, p_source text, p_ids integer[])
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare existing public.wheel_spins; pool jsonb; ids integer[]; idx integer; made public.wheel_spins;
begin
  -- The same request again (a double click, a retry, a reconnect): the same spin, never a new winner.
  select * into existing from public.wheel_spins where request_id = p_request;
  if existing.id is not null then
    if existing.user_id is distinct from p_user then raise exception 'request id already used' using errcode = '42501'; end if;
    return to_jsonb(existing) || jsonb_build_object('repeat', true);
  end if;
  ids := array(select x from (select x, min(o) o from unnest(p_ids) with ordinality u(x, o) group by x) d order by o);
  if cardinality(ids) <> cardinality(p_ids) then raise exception 'the pool has duplicates' using errcode = '22023'; end if;
  if cardinality(ids) < 2 or cardinality(ids) > 12 then raise exception 'a wheel holds 2 to 12 films' using errcode = '22023'; end if;
  -- Every film must be a real, stored TMDB film; the snapshot takes its details from the films table, not the client.
  select jsonb_agg(jsonb_build_object('tmdb_id', f.tmdb_id, 'title', f.title, 'year', f.year, 'poster_path', f.poster_path) order by u.o)
    into pool from unnest(ids) with ordinality u(x, o) join public.films f on f.tmdb_id = u.x;
  if pool is null or jsonb_array_length(pool) <> cardinality(ids) then raise exception 'unknown film in the pool' using errcode = '22023'; end if;
  idx := public.wheel_pick(cardinality(ids));
  insert into public.wheel_spins (request_id, user_id, night_id, mode, source, pool, pool_ids, winner_index, winner_tmdb_id)
  values (p_request, p_user, p_night, p_mode, left(coalesce(p_source, ''), 120), pool, ids, idx, ids[idx + 1])
  returning * into made;
  return to_jsonb(made) || jsonb_build_object('repeat', false);
end $$;
revoke all on function public.wheel_spin_core(uuid, uuid, uuid, text, text, integer[]) from public, anon, authenticated;

-- A signed-in person's solo spin. The pool must come from where it says:
--   watchlist + 'account': every film is on their account watchlist;
--   playlist + a share id: every film is in that collection, which they can see;
--   watchlist + 'device', or surprise: real films the server has checked.
create or replace function public.spin_wheel(p_request uuid, p_mode text, p_source text, p_ids integer[]) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); cid uuid;
begin
  if me is null then raise exception 'sign in to save spins' using errcode = '42501'; end if;
  if p_mode = 'watchlist' and p_source = 'account' then
    if exists (select 1 from unnest(p_ids) x where not exists (select 1 from public.watchlist_items w where w.user_id = me and w.tmdb_id = x)) then
      raise exception 'a film in the pool is not on your watchlist' using errcode = '42501';
    end if;
  elsif p_mode = 'playlist' then
    select c.id into cid from public.movie_collections c
     where c.share_id = p_source and (c.visibility in ('public', 'unlisted') or public.collection_role(c.id) is not null);
    if cid is null then raise exception 'collection not found' using errcode = '42501'; end if;
    if exists (select 1 from unnest(p_ids) x where not exists (select 1 from public.collection_items i where i.collection_id = cid and i.tmdb_id = x)) then
      raise exception 'a film in the pool is not in this collection' using errcode = '42501';
    end if;
  elsif not (p_mode = 'surprise' or (p_mode = 'watchlist' and p_source = 'device')) then
    raise exception 'unknown wheel source' using errcode = '22023';
  end if;
  return public.wheel_spin_core(p_request, me, null, p_mode, p_source, p_ids);
end $$;

-- Signed-out visitors spin through the server (service role), with the same checks for collections.
create or replace function public.spin_wheel_service(p_request uuid, p_mode text, p_source text, p_ids integer[]) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare cid uuid;
begin
  if p_mode = 'playlist' then
    select c.id into cid from public.movie_collections c where c.share_id = p_source and c.visibility in ('public', 'unlisted');
    if cid is null then raise exception 'collection not found' using errcode = '42501'; end if;
    if exists (select 1 from unnest(p_ids) x where not exists (select 1 from public.collection_items i where i.collection_id = cid and i.tmdb_id = x)) then
      raise exception 'a film in the pool is not in this collection' using errcode = '42501';
    end if;
  elsif not (p_mode = 'surprise' or (p_mode = 'watchlist' and p_source = 'device')) then
    raise exception 'unknown wheel source' using errcode = '22023';
  end if;
  return public.wheel_spin_core(p_request, null, null, p_mode, p_source, p_ids);
end $$;

-- The animation finished (or was skipped): the spin is revealed. Only your own.
create or replace function public.wheel_reveal(p_spin uuid) returns void
language sql volatile security definer set search_path = '' as $$
  update public.wheel_spins set status = 'revealed', revealed_at = coalesce(revealed_at, now())
   where id = p_spin and status = 'spinning' and user_id = (select auth.uid()) and night_id is null
$$;

revoke all on function public.spin_wheel(uuid, text, text, integer[]), public.spin_wheel_service(uuid, text, text, integer[]), public.wheel_reveal(uuid) from public, anon, authenticated;
grant execute on function public.spin_wheel(uuid, text, text, integer[]), public.wheel_reveal(uuid) to authenticated;
grant execute on function public.spin_wheel_service(uuid, text, text, integer[]) to service_role;
