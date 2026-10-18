-- Movie Night rooms: a host and friends join by code, pool films, vote privately, see results together, and can let
-- WheelMo choose (from the whole pool, or as Match Decider from the films everyone said yes to). Everything here is
-- visible only to the room's participants; each person's votes stay their own until the host shows the results.

create table public.movie_nights (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  host_id       uuid not null references public.profiles (id) on delete cascade,
  title         text not null default 'Movie Night' check (char_length(btrim(title)) between 1 and 80),
  status        text not null default 'lobby' check (status in ('lobby', 'voting', 'results', 'closed')),
  pick_tmdb_id  integer references public.films (tmdb_id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '24 hours'
);
create trigger nights_touch before update on public.movie_nights for each row execute function public.touch_updated_at();

create table public.night_participants (
  night_id  uuid not null references public.movie_nights (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null check (role in ('host', 'guest')),
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (night_id, user_id)
);
create index participants_by_user on public.night_participants (user_id);

create table public.night_candidates (
  night_id   uuid not null references public.movie_nights (id) on delete cascade,
  tmdb_id    integer not null references public.films (tmdb_id),
  added_by   uuid references public.profiles (id) on delete set null,
  source     text not null check (source in ('watchlist', 'collection', 'search', 'surprise')),
  added_at   timestamptz not null default now(),
  primary key (night_id, tmdb_id)
);

create table public.night_votes (
  night_id uuid not null references public.movie_nights (id) on delete cascade,
  user_id  uuid not null references public.profiles (id) on delete cascade,
  tmdb_id  integer not null,
  vote     boolean not null,
  voted_at timestamptz not null default now(),
  primary key (night_id, user_id, tmdb_id),
  foreign key (night_id, tmdb_id) references public.night_candidates (night_id, tmdb_id) on delete cascade
);

create table public.night_picks (
  id           uuid primary key default gen_random_uuid(),
  night_id     uuid not null references public.movie_nights (id) on delete cascade,
  tmdb_id      integer not null references public.films (tmdb_id),
  spin_id      uuid references public.wheel_spins (id) on delete set null,
  how          text not null check (how in ('match', 'decider', 'wheel', 'host')),
  confirmed_by uuid references public.profiles (id) on delete set null,
  confirmed_at timestamptz not null default now()
);

alter table public.wheel_spins add constraint wheel_spins_night_fk foreign key (night_id) references public.movie_nights (id) on delete cascade;

-- Membership checks run as the definer so the policies below don't recurse.
create or replace function public.is_night_member(p_night uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.night_participants p where p.night_id = p_night and p.user_id = (select auth.uid()))
$$;
create or replace function public.is_night_host(p_night uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.movie_nights n where n.id = p_night and n.host_id = (select auth.uid()))
$$;
revoke all on function public.is_night_member(uuid), public.is_night_host(uuid) from public, anon;
grant execute on function public.is_night_member(uuid), public.is_night_host(uuid) to authenticated;

alter table public.movie_nights enable row level security;      revoke all on public.movie_nights from anon, authenticated;
alter table public.night_participants enable row level security; revoke all on public.night_participants from anon, authenticated;
alter table public.night_candidates enable row level security;  revoke all on public.night_candidates from anon, authenticated;
alter table public.night_votes enable row level security;       revoke all on public.night_votes from anon, authenticated;
alter table public.night_picks enable row level security;       revoke all on public.night_picks from anon, authenticated;
-- Reads only; every change goes through the functions below, which check who is asking and the room's stage.
create policy "members see their nights" on public.movie_nights for select to authenticated using (public.is_night_member(id));
create policy "members see who's in" on public.night_participants for select to authenticated using (public.is_night_member(night_id));
create policy "members see the pool" on public.night_candidates for select to authenticated using (public.is_night_member(night_id));
create policy "you see only your own votes" on public.night_votes for select to authenticated using (user_id = (select auth.uid()));
create policy "members see the picks" on public.night_picks for select to authenticated using (public.is_night_member(night_id));
create policy "members see the room's spins" on public.wheel_spins for select to authenticated using (night_id is not null and public.is_night_member(night_id));
grant select on public.movie_nights, public.night_participants, public.night_candidates, public.night_votes, public.night_picks to authenticated;

-- Live updates: every change to a room also touches its movie_nights row, and only that table is published to
-- Supabase Realtime (which applies the policy above, so only members hear about it). The event carries no votes or
-- films; each screen then asks night_state for what it may see. Skipped where Realtime isn't installed.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'movie_nights') then
    alter publication supabase_realtime add table public.movie_nights;
  end if;
end $$;

------------------------------------------------------------------------------------------------------------------
-- Room actions
------------------------------------------------------------------------------------------------------------------
create or replace function public.create_night(p_title text default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); c text; nid uuid; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if me is null then raise exception 'sign in to host a Movie Night' using errcode = '42501'; end if;
  if (select count(*) from public.movie_nights where host_id = me and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'too many rooms' using errcode = '54000';
  end if;
  loop
    c := (select string_agg(substr(alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 32), 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from public.movie_nights where code = c);
  end loop;
  insert into public.movie_nights (code, host_id, title) values (c, me, coalesce(nullif(left(btrim(p_title), 80), ''), 'Movie Night')) returning id into nid;
  insert into public.night_participants (night_id, user_id, role) values (nid, me, 'host');
  return jsonb_build_object('id', nid, 'code', c);
end $$;

create or replace function public.join_night(p_code text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); n public.movie_nights;
begin
  if me is null then raise exception 'sign in to join' using errcode = '42501'; end if;
  select * into n from public.movie_nights where code = upper(btrim(p_code));
  if n.id is null or n.expires_at < now() or n.status = 'closed' then raise exception 'no open room with that code' using errcode = 'P0002'; end if;
  insert into public.night_participants (night_id, user_id, role) values (n.id, me, 'guest') on conflict (night_id, user_id) do update set last_seen = now();
  update public.movie_nights set updated_at = now() where id = n.id;
  return n.id;
end $$;

create or replace function public.night_heartbeat(p_night uuid) returns void
language sql volatile security definer set search_path = '' as $$
  update public.night_participants set last_seen = now() where night_id = p_night and user_id = (select auth.uid())
$$;

-- Add films to the pool while the room is in the lobby. Where they come from is checked:
--   watchlist: your own account watchlist; collection: a collection you can open (by share id);
--   search / surprise: real films the server has already checked with TMDB.
create or replace function public.night_add(p_night uuid, p_ids integer[], p_source text, p_ref text default null) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); n public.movie_nights; cid uuid; added integer;
begin
  select * into n from public.movie_nights where id = p_night;
  if n.id is null or not public.is_night_member(p_night) then raise exception 'not in this room' using errcode = '42501'; end if;
  if n.status <> 'lobby' then raise exception 'the pool is locked once voting starts' using errcode = '55000'; end if;
  if p_source = 'watchlist' then
    if exists (select 1 from unnest(p_ids) x where not exists (select 1 from public.watchlist_items w where w.user_id = me and w.tmdb_id = x)) then
      raise exception 'not on your watchlist' using errcode = '42501'; end if;
  elsif p_source = 'collection' then
    select c.id into cid from public.movie_collections c where c.share_id = p_ref and (c.visibility in ('public', 'unlisted') or public.collection_role(c.id) is not null);
    if cid is null or exists (select 1 from unnest(p_ids) x where not exists (select 1 from public.collection_items i where i.collection_id = cid and i.tmdb_id = x)) then
      raise exception 'not in a collection you can open' using errcode = '42501'; end if;
  elsif p_source not in ('search', 'surprise') then
    raise exception 'unknown source' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_ids) x where not exists (select 1 from public.films f where f.tmdb_id = x)) then
    raise exception 'unknown film' using errcode = '22023'; end if;
  if (select count(*) from public.night_candidates where night_id = p_night) + cardinality(p_ids) > 40 then
    raise exception 'a room holds up to 40 films' using errcode = '54000'; end if;
  insert into public.night_candidates (night_id, tmdb_id, added_by, source) select p_night, x, me, p_source from unnest(p_ids) x on conflict do nothing;
  get diagnostics added = row_count;
  update public.movie_nights set updated_at = now() where id = p_night;
  return added;
end $$;

create or replace function public.night_remove(p_night uuid, p_tmdb integer) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.movie_nights where id = p_night and status = 'lobby') or not public.is_night_member(p_night) then raise exception 'the pool is locked' using errcode = '55000'; end if;
  delete from public.night_candidates where night_id = p_night and tmdb_id = p_tmdb
    and (added_by = (select auth.uid()) or public.is_night_host(p_night));
  update public.movie_nights set updated_at = now() where id = p_night;
end $$;

-- Host moves the room between stages.
create or replace function public.night_stage(p_night uuid, p_status text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare n public.movie_nights;
begin
  select * into n from public.movie_nights where id = p_night;
  if n.id is null or n.host_id <> (select auth.uid()) then raise exception 'only the host can do that' using errcode = '42501'; end if;
  if not ((n.status = 'lobby' and p_status = 'voting') or (n.status = 'voting' and p_status in ('results', 'lobby')) or (n.status = 'results' and p_status in ('closed', 'voting')) or (n.status = 'lobby' and p_status = 'closed')) then
    raise exception 'can''t go from % to %', n.status, p_status using errcode = '55000';
  end if;
  if p_status = 'voting' and (select count(*) from public.night_candidates where night_id = p_night) < 2 then
    raise exception 'add at least two films first' using errcode = '55000';
  end if;
  update public.movie_nights set status = p_status where id = p_night;
end $$;

-- A private yes or no while voting is open.
create or replace function public.night_vote(p_night uuid, p_tmdb integer, p_vote boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_night_member(p_night) then raise exception 'not in this room' using errcode = '42501'; end if;
  if not exists (select 1 from public.movie_nights where id = p_night and status = 'voting') then raise exception 'voting isn''t open' using errcode = '55000'; end if;
  insert into public.night_votes (night_id, user_id, tmdb_id, vote) values (p_night, (select auth.uid()), p_tmdb, p_vote)
  on conflict (night_id, user_id, tmdb_id) do update set vote = excluded.vote, voted_at = now();
  update public.movie_nights set updated_at = now() where id = p_night;
end $$;

-- Everything a participant may see, in one call. Votes: during voting only how many each person has cast; after
-- the host shows results, totals per film and the shortlist everyone said yes to. Never who voted what.
create or replace function public.night_state(p_night uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare n public.movie_nights; me uuid := (select auth.uid()); shown boolean; voters integer;
begin
  select * into n from public.movie_nights where id = p_night;
  if n.id is null or not public.is_night_member(p_night) then return null; end if;
  shown := n.status in ('results', 'closed');
  select count(distinct user_id) into voters from public.night_votes where night_id = p_night;
  return jsonb_build_object(
    'id', n.id, 'code', n.code, 'title', n.title, 'status', n.status, 'host_id', n.host_id, 'is_host', n.host_id = me, 'me', me,
    'pick_tmdb_id', n.pick_tmdb_id, 'expires_at', n.expires_at,
    'participants', coalesce((select jsonb_agg(jsonb_build_object('user_id', p.user_id, 'role', p.role, 'username', pr.username::text, 'display_name', pr.display_name,
        'avatar_url', pr.avatar_url, 'is_demo', pr.is_demo, 'last_seen', p.last_seen,
        'votes_cast', (select count(*) from public.night_votes v where v.night_id = p_night and v.user_id = p.user_id)) order by p.joined_at)
      from public.night_participants p join public.profiles pr on pr.id = p.user_id where p.night_id = p_night), '[]'::jsonb),
    'candidates', coalesce((select jsonb_agg(jsonb_build_object('tmdb_id', f.tmdb_id, 'title', f.title, 'year', f.year, 'poster_path', f.poster_path,
        'genres', f.genres, 'runtime', f.runtime, 'source', c.source, 'added_by', c.added_by, 'mine', c.added_by = me,
        'my_vote', (select v.vote from public.night_votes v where v.night_id = p_night and v.user_id = me and v.tmdb_id = c.tmdb_id),
        'yes', case when shown then (select count(*) from public.night_votes v where v.night_id = p_night and v.tmdb_id = c.tmdb_id and v.vote) end,
        'no', case when shown then (select count(*) from public.night_votes v where v.night_id = p_night and v.tmdb_id = c.tmdb_id and not v.vote) end) order by c.added_at)
      from public.night_candidates c join public.films f on f.tmdb_id = c.tmdb_id where c.night_id = p_night), '[]'::jsonb),
    'voters', voters,
    'shortlist', case when shown then coalesce((select jsonb_agg(c.tmdb_id order by c.added_at) from public.night_candidates c
        where c.night_id = p_night and voters > 0
          and (select count(*) from public.night_votes v where v.night_id = p_night and v.tmdb_id = c.tmdb_id and v.vote) = voters), '[]'::jsonb) end,
    'spin', (select to_jsonb(s) from public.wheel_spins s where s.night_id = p_night order by s.created_at desc limit 1),
    'picks', coalesce((select jsonb_agg(jsonb_build_object('tmdb_id', k.tmdb_id, 'title', f.title, 'how', k.how, 'at', k.confirmed_at) order by k.confirmed_at desc)
      from public.night_picks k join public.films f on f.tmdb_id = k.tmdb_id where k.night_id = p_night), '[]'::jsonb)
  );
end $$;

-- The host spins for the room. group: any 2–12 films from the room's pool. decider: exactly the films every voter said
-- yes to (after results), so a random pick is only ever made between films the whole group accepted.
create or replace function public.spin_night(p_request uuid, p_night uuid, p_mode text, p_ids integer[]) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare n public.movie_nights; short integer[]; voters integer; existing public.wheel_spins; made jsonb;
begin
  select * into n from public.movie_nights where id = p_night;
  if n.id is null or n.host_id <> (select auth.uid()) then raise exception 'only the host can spin for the room' using errcode = '42501'; end if;
  -- The same request again (a double click, a retry, a reconnect) returns the same spin, never a new winner.
  select * into existing from public.wheel_spins where request_id = p_request;
  if existing.id is not null then
    if existing.night_id is distinct from p_night then raise exception 'request id already used' using errcode = '42501'; end if;
    return to_jsonb(existing) || jsonb_build_object('repeat', true);
  end if;
  if n.status = 'closed' then raise exception 'this Movie Night is over' using errcode = '55000'; end if;
  if exists (select 1 from unnest(p_ids) x where not exists (select 1 from public.night_candidates c where c.night_id = p_night and c.tmdb_id = x)) then
    raise exception 'every film must be in the room''s pool' using errcode = '42501';
  end if;
  if p_mode = 'decider' then
    if n.status <> 'results' then raise exception 'Match Decider needs the results' using errcode = '55000'; end if;
    select count(distinct user_id) into voters from public.night_votes where night_id = p_night;
    short := array(select c.tmdb_id from public.night_candidates c where c.night_id = p_night and voters > 0
                    and (select count(*) from public.night_votes v where v.night_id = p_night and v.tmdb_id = c.tmdb_id and v.vote) = voters);
    if (select array_agg(x order by x) from unnest(p_ids) x) is distinct from (select array_agg(x order by x) from unnest(short) x) then
      raise exception 'Match Decider spins exactly the films everyone said yes to' using errcode = '42501';
    end if;
  elsif p_mode <> 'group' then
    raise exception 'unknown mode' using errcode = '22023';
  end if;
  -- A spin older than its animation counts as revealed; one still turning blocks a second (unique index).
  update public.wheel_spins set status = 'revealed', revealed_at = now() where night_id = p_night and status = 'spinning' and created_at < now() - interval '7 seconds';
  made := public.wheel_spin_core(p_request, (select auth.uid()), p_night, p_mode, n.code, p_ids);
  update public.movie_nights set updated_at = now() where id = p_night;
  return made;
end $$;

-- The host confirms tonight's film; it goes into the room's history for everyone.
create or replace function public.night_confirm(p_night uuid, p_tmdb integer, p_how text, p_spin uuid default null) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_night_host(p_night) then raise exception 'only the host confirms' using errcode = '42501'; end if;
  if not exists (select 1 from public.night_candidates where night_id = p_night and tmdb_id = p_tmdb) then raise exception 'not in the pool' using errcode = '42501'; end if;
  if p_spin is not null and not exists (select 1 from public.wheel_spins where id = p_spin and night_id = p_night and winner_tmdb_id = p_tmdb) then
    raise exception 'that spin chose a different film' using errcode = '42501'; end if;
  insert into public.night_picks (night_id, tmdb_id, spin_id, how, confirmed_by) values (p_night, p_tmdb, p_spin, p_how, (select auth.uid()));
  update public.movie_nights set pick_tmdb_id = p_tmdb, status = 'closed' where id = p_night;
  update public.wheel_spins set status = 'confirmed', confirmed_at = now() where id = p_spin;
end $$;

-- Your recent rooms.
create or replace function public.my_nights() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'code', n.code, 'title', n.title, 'status', n.status, 'is_host', n.host_id = (select auth.uid()),
    'pick', (select f.title from public.films f where f.tmdb_id = n.pick_tmdb_id), 'created_at', n.created_at) order by n.created_at desc), '[]'::jsonb)
  from public.movie_nights n join public.night_participants p on p.night_id = n.id and p.user_id = (select auth.uid())
  where n.created_at > now() - interval '30 days'
$$;

revoke all on function public.create_night(text), public.join_night(text), public.night_heartbeat(uuid), public.night_add(uuid, integer[], text, text),
  public.night_remove(uuid, integer), public.night_stage(uuid, text), public.night_vote(uuid, integer, boolean), public.night_state(uuid),
  public.spin_night(uuid, uuid, text, integer[]), public.night_confirm(uuid, integer, text, uuid), public.my_nights() from public, anon;
grant execute on function public.create_night(text), public.join_night(text), public.night_heartbeat(uuid), public.night_add(uuid, integer[], text, text),
  public.night_remove(uuid, integer), public.night_stage(uuid, text), public.night_vote(uuid, integer, boolean), public.night_state(uuid),
  public.spin_night(uuid, uuid, text, integer[]), public.night_confirm(uuid, integer, text, uuid), public.my_nights() to authenticated;
