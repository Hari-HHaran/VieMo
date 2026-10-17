-- Community: clearly labelled demo accounts, per-review visibility, and the read paths Explore, profiles and film
-- pages use. Every function below checks the viewer and returns only safe columns (never private notes or tags).

------------------------------------------------------------------------------------------------------------------
-- Demo labelling. Set only by the server's demo importer (service role); not in any user grant, so nobody can mark
-- themselves or anyone else as demo, or remove the label.
------------------------------------------------------------------------------------------------------------------
alter table public.profiles add column is_demo boolean not null default false;
alter table public.profiles add column demo_seed_key text unique;
alter table public.movie_collections add column demo_seed_key text;
create unique index collections_demo_key on public.movie_collections (owner_id, demo_seed_key) where demo_seed_key is not null;
create index profiles_demo on public.profiles (is_demo) where is_demo;

-- What the importer did, for an audit trail. Server only.
create table public.demo_seed_runs (
  id      uuid primary key default gen_random_uuid(),
  ran_at  timestamptz not null default now(),
  ran_by  uuid references public.profiles (id) on delete set null,
  action  text not null check (action in ('seed', 'cleanup', 'dry_run')),
  report  jsonb not null default '{}'::jsonb
);
alter table public.demo_seed_runs enable row level security;
revoke all on public.demo_seed_runs from anon, authenticated;

------------------------------------------------------------------------------------------------------------------
-- Reviews: each one is private, friends-only or public. New reviews start private.
------------------------------------------------------------------------------------------------------------------
alter table public.diary_entries add column review_visibility text not null default 'private'
  check (review_visibility in ('private', 'friends', 'public'));
grant insert (review_visibility), update (review_visibility) on public.diary_entries to authenticated;
create index diary_public_reviews on public.diary_entries (tmdb_id, created_at desc) where review_visibility <> 'private' and review is not null;

-- Friends follow each other.
create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select a is not null and b is not null and a <> b
     and exists (select 1 from public.follows f where f.follower_id = a and f.followee_id = b)
     and exists (select 1 from public.follows f where f.follower_id = b and f.followee_id = a)
$$;
create or replace function public.can_read_review(p_owner uuid, p_visibility text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_owner = (select auth.uid()) or p_visibility = 'public'
      or (p_visibility = 'friends' and public.are_friends(p_owner, (select auth.uid())))
$$;

-- Reviews of one film that the viewer may read, newest first.
create or replace function public.film_reviews(p_tmdb integer, p_limit integer default 20, p_before timestamptz default null, p_include_demo boolean default true)
returns table (entry_id uuid, author_id uuid, username text, display_name text, avatar_url text, is_demo boolean,
               rating numeric, review text, spoiler boolean, watched_on date, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.id, p.id, p.username::text, p.display_name, p.avatar_url, p.is_demo, e.rating, btrim(e.review), e.spoiler, e.watched_on, e.created_at
    from public.diary_entries e join public.profiles p on p.id = e.user_id
   where e.tmdb_id = p_tmdb and coalesce(btrim(e.review), '') <> ''
     and public.can_read_review(e.user_id, e.review_visibility)
     and (p_include_demo or not p.is_demo)
     and (p_before is null or e.created_at < p_before)
   order by e.created_at desc
   limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

-- One person's reviews that the viewer may read, with the film.
create or replace function public.profile_reviews(p_owner uuid, p_limit integer default 20, p_before timestamptz default null)
returns table (entry_id uuid, tmdb_id integer, title text, year smallint, poster_path text,
               rating numeric, review text, spoiler boolean, review_visibility text, watched_on date, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.id, f.tmdb_id, f.title, f.year, f.poster_path, e.rating, btrim(e.review), e.spoiler, e.review_visibility, e.watched_on, e.created_at
    from public.diary_entries e join public.films f on f.tmdb_id = e.tmdb_id
   where e.user_id = p_owner and coalesce(btrim(e.review), '') <> ''
     and public.can_read_review(e.user_id, e.review_visibility)
     and (p_before is null or e.created_at < p_before)
   order by e.watched_on desc, e.created_at desc
   limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

------------------------------------------------------------------------------------------------------------------
-- Explore: public collections only. Unlisted and private ones never appear in lists, whoever is asking.
------------------------------------------------------------------------------------------------------------------
create or replace function public.explore_collections(p_q text default null, p_sort text default 'recent', p_limit integer default 24,
                                                      p_offset integer default 0, p_include_demo boolean default true, p_owner uuid default null)
returns table (id uuid, share_id text, title text, description text, tags text[], owner_id uuid, username text, display_name text,
               avatar_url text, is_demo boolean, film_count integer, covers jsonb, saves integer, saved_by_me boolean, published_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.share_id, c.title, c.description, c.tags, p.id, p.username::text, p.display_name, p.avatar_url, p.is_demo,
         (select count(*)::int from public.collection_items i where i.collection_id = c.id),
         coalesce((select jsonb_agg(jsonb_build_object('tmdb_id', x.tmdb_id, 'title', x.title, 'poster_path', x.poster_path) order by x.position)
                     from (select i.tmdb_id, i.position, f.title, f.poster_path from public.collection_items i
                             join public.films f on f.tmdb_id = i.tmdb_id where i.collection_id = c.id order by i.position limit 4) x), '[]'::jsonb),
         (select count(*)::int from public.collection_saves s where s.collection_id = c.id),
         exists (select 1 from public.collection_saves s where s.collection_id = c.id and s.user_id = (select auth.uid())),
         c.published_at
    from public.movie_collections c join public.profiles p on p.id = c.owner_id
   where c.visibility = 'public'
     and (p_include_demo or not p.is_demo)
     and (p_owner is null or c.owner_id = p_owner)
     and (coalesce(btrim(p_q), '') = '' or c.search @@ websearch_to_tsquery('simple', p_q))
   order by case when p_sort = 'popular' then (select count(*) from public.collection_saves s where s.collection_id = c.id) end desc nulls last,
            c.published_at desc nulls last, c.id
   limit least(greatest(coalesce(p_limit, 24), 1), 60) offset greatest(coalesce(p_offset, 0), 0)
$$;

-- People to discover, with honest counts (public collections only).
create or replace function public.community_members(p_limit integer default 24, p_offset integer default 0, p_include_demo boolean default true)
returns table (id uuid, username text, display_name text, avatar_url text, bio text, is_demo boolean,
               public_collections integer, followers integer, i_follow boolean, follows_me boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username::text, p.display_name, p.avatar_url, p.bio, p.is_demo,
         (select count(*)::int from public.movie_collections c where c.owner_id = p.id and c.visibility = 'public'),
         (select count(*)::int from public.follows f where f.followee_id = p.id),
         exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = p.id),
         exists (select 1 from public.follows f where f.follower_id = p.id and f.followee_id = (select auth.uid()))
    from public.profiles p
   where p.onboarded and (p_include_demo or not p.is_demo) and p.id is distinct from (select auth.uid())
   order by (select count(*) from public.follows f where f.followee_id = p.id) desc, p.username
   limit least(greatest(coalesce(p_limit, 24), 1), 60) offset greatest(coalesce(p_offset, 0), 0)
$$;

-- A collection page by its share id: details, owner, films, counts and what the viewer may do. Works for public and
-- unlisted collections (anyone with the link) and for members of private ones; null for everyone else.
create or replace function public.collection_page(p_share text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', c.id, 'share_id', c.share_id, 'title', c.title, 'description', c.description, 'tags', c.tags, 'visibility', c.visibility,
    'updated_at', c.updated_at, 'role', public.collection_role(c.id),
    'owner', jsonb_build_object('id', p.id, 'username', p.username::text, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'is_demo', p.is_demo),
    'saves', case when c.visibility = 'public' then (select count(*) from public.collection_saves s where s.collection_id = c.id) end,
    'saved_by_me', exists (select 1 from public.collection_saves s where s.collection_id = c.id and s.user_id = (select auth.uid())),
    'films', coalesce((select jsonb_agg(jsonb_build_object('tmdb_id', f.tmdb_id, 'title', f.title, 'year', f.year, 'poster_path', f.poster_path,
                                                            'genres', f.genres, 'runtime', f.runtime, 'note', i.note) order by i.position)
                         from public.collection_items i join public.films f on f.tmdb_id = i.tmdb_id where i.collection_id = c.id), '[]'::jsonb))
    from public.movie_collections c join public.profiles p on p.id = c.owner_id
   where c.share_id = p_share and (c.visibility in ('public', 'unlisted') or public.collection_role(c.id) is not null)
$$;

------------------------------------------------------------------------------------------------------------------
-- Screening Activity's day panel now honours each review's own visibility: the watch and rating show to anyone
-- allowed to see the activity, the review text only to those allowed to read that review.
------------------------------------------------------------------------------------------------------------------
create or replace function public.screening_day(p_owner uuid, p_day date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_view_activity(p_owner) then return null; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('tmdb_id', e.tmdb_id, 'title', f.title, 'year', f.year, 'poster_path', f.poster_path, 'rating', e.rating,
                                        'review', case when public.can_read_review(e.user_id, e.review_visibility) then nullif(btrim(e.review), '') end,
                                        'spoiler', e.spoiler)
                     order by e.created_at)
      from public.diary_entries e join public.films f on f.tmdb_id = e.tmdb_id
     where e.user_id = p_owner and e.watched_on = p_day), '[]'::jsonb);
end $$;

revoke all on function public.are_friends(uuid, uuid), public.can_read_review(uuid, text) from public;
revoke all on function public.film_reviews(integer, integer, timestamptz, boolean), public.profile_reviews(uuid, integer, timestamptz) from public;
revoke all on function public.explore_collections(text, text, integer, integer, boolean, uuid), public.community_members(integer, integer, boolean) from public;
revoke all on function public.collection_page(text) from public;
grant execute on function public.are_friends(uuid, uuid), public.can_read_review(uuid, text) to anon, authenticated;
grant execute on function public.film_reviews(integer, integer, timestamptz, boolean), public.profile_reviews(uuid, integer, timestamptz) to anon, authenticated;
grant execute on function public.explore_collections(text, text, integer, integer, boolean, uuid), public.community_members(integer, integer, boolean) to anon, authenticated;
grant execute on function public.collection_page(text) to anon, authenticated;

------------------------------------------------------------------------------------------------------------------
-- The demo importer's database side (service role only). The server resolves films with TMDB and creates the Auth
-- users with the Admin API, then hands everything to demo_seed_apply in one transaction.
-- Safety: an account is only ever touched when its Auth email is the fixture's own reserved demo address
-- (viemo.demo.*@example.com). Real users, and anything they own, are never changed.
------------------------------------------------------------------------------------------------------------------
create or replace function public.demo_seed_lookup(p_emails text[])
returns table (email text, user_id uuid, has_profile boolean, is_demo boolean, demo_seed_key text)
language sql stable security definer set search_path = '' as $$
  select u.email::text, u.id, p.id is not null, coalesce(p.is_demo, false), p.demo_seed_key
    from auth.users u left join public.profiles p on p.id = u.id
   where lower(u.email) = any (select lower(e) from unnest(p_emails) e)
$$;

create or replace function public.demo_seed_targets()
returns table (user_id uuid, email text, demo_seed_key text)
language sql stable security definer set search_path = '' as $$
  select p.id, u.email::text, p.demo_seed_key
    from public.profiles p join auth.users u on u.id = p.id
   where p.is_demo and lower(u.email) like 'viemo.demo.%@example.com'
$$;

create or replace function public.demo_seed_apply(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  a jsonb; c jsonb; w jsonb; f jsonb;
  uid uuid; em text; want text; uname text; cid uuid; keys text[];
  report jsonb := jsonb_build_object('films', 0, 'accounts', 0, 'skipped', '[]'::jsonb, 'renamed', '[]'::jsonb,
                                     'watched', 0, 'reviews', 0, 'watchlist', 0, 'collections', 0, 'collection_items', 0, 'follows', 0);
  ids jsonb := '{}'::jsonb;
  n int;
begin
  -- Films, exactly as the server resolved them from TMDB.
  for f in select * from jsonb_array_elements(coalesce(p -> 'films', '[]')) loop
    insert into public.films (tmdb_id, title, year, poster_path, genres, runtime, fetched_at)
    values ((f ->> 'tmdb_id')::int, f ->> 'title', (f ->> 'year')::smallint, nullif(f ->> 'poster_path', ''),
            coalesce((select array_agg(x) from jsonb_array_elements_text(f -> 'genres') x), '{}'), (f ->> 'runtime')::smallint, now())
    on conflict (tmdb_id) do update set title = excluded.title, year = excluded.year, poster_path = excluded.poster_path,
                                        genres = excluded.genres, runtime = coalesce(excluded.runtime, public.films.runtime), fetched_at = now();
    report := jsonb_set(report, '{films}', to_jsonb((report ->> 'films')::int + 1));
  end loop;

  for a in select * from jsonb_array_elements(coalesce(p -> 'accounts', '[]')) loop
    uid := (a ->> 'user_id')::uuid;
    select u.email into em from auth.users u where u.id = uid;
    if em is null or lower(em) <> lower(a ->> 'email') or lower(em) not like 'viemo.demo.%@example.com' then
      report := jsonb_set(report, '{skipped}', (report -> 'skipped') || jsonb_build_object('seed_key', a ->> 'seed_key', 'why', 'not the fixture''s demo Auth user'));
      continue;
    end if;
    if not exists (select 1 from public.profiles where id = uid) then
      report := jsonb_set(report, '{skipped}', (report -> 'skipped') || jsonb_build_object('seed_key', a ->> 'seed_key', 'why', 'no profile (is migration 0001 applied?)'));
      continue;
    end if;

    -- Username: the fixture's, unless someone else already has it.
    want := lower(a ->> 'username'); uname := want;
    if exists (select 1 from public.profiles where username = uname::extensions.citext and id <> uid) then
      uname := left('demo_' || want, 24);
      if exists (select 1 from public.profiles where username = uname::extensions.citext and id <> uid) then uname := null; end if;
      report := jsonb_set(report, '{renamed}', (report -> 'renamed') || jsonb_build_object('wanted', want, 'used', uname));
    end if;
    update public.profiles set
      username = coalesce(uname::extensions.citext, username), display_name = left(a ->> 'display_name', 60), bio = left(a ->> 'bio', 280),
      watchlist_visibility = case when a ->> 'watchlist_visibility' = 'public' then 'public' else 'private' end,
      activity_visibility = coalesce(nullif(a ->> 'activity_visibility', ''), 'public'),
      is_demo = true, demo_seed_key = a ->> 'seed_key', onboarded = true
    where id = uid;
    ids := ids || jsonb_build_object(a ->> 'seed_key', uid);
    report := jsonb_set(report, '{accounts}', to_jsonb((report ->> 'accounts')::int + 1));

    -- Diary, ratings and reviews: replaced, so a rerun gives the same result.
    delete from public.diary_entries where user_id = uid;
    for w in select * from jsonb_array_elements(coalesce(a -> 'watched', '[]')) loop
      insert into public.diary_entries (user_id, tmdb_id, watched_on, rating, review, spoiler, review_visibility)
      values (uid, (w ->> 'tmdb_id')::int, (w ->> 'watched_on')::date, (w ->> 'rating')::numeric, nullif(btrim(w ->> 'review'), ''), false,
              case when w ->> 'review_visibility' in ('public', 'friends') then w ->> 'review_visibility' else 'private' end);
      report := jsonb_set(report, '{watched}', to_jsonb((report ->> 'watched')::int + 1));
      if nullif(btrim(w ->> 'review'), '') is not null then report := jsonb_set(report, '{reviews}', to_jsonb((report ->> 'reviews')::int + 1)); end if;
    end loop;

    delete from public.watchlist_items where user_id = uid;
    insert into public.watchlist_items (user_id, tmdb_id) select uid, x::int from jsonb_array_elements_text(coalesce(a -> 'watchlist', '[]')) x on conflict do nothing;
    get diagnostics n = row_count;
    report := jsonb_set(report, '{watchlist}', to_jsonb((report ->> 'watchlist')::int + n));

    -- Collections, matched by seed key; ones no longer in the fixture are removed.
    keys := '{}';
    for c in select * from jsonb_array_elements(coalesce(a -> 'collections', '[]')) loop
      insert into public.movie_collections (owner_id, title, description, visibility, demo_seed_key)
      values (uid, c ->> 'title', c ->> 'description', c ->> 'visibility', c ->> 'seed_key')
      on conflict (owner_id, demo_seed_key) where demo_seed_key is not null
      do update set title = excluded.title, description = excluded.description, visibility = excluded.visibility
      returning id into cid;
      keys := keys || (c ->> 'seed_key');
      delete from public.collection_items where collection_id = cid;
      insert into public.collection_items (collection_id, tmdb_id, position, added_by)
        select cid, x.v::int, (x.o - 1)::int, uid from jsonb_array_elements_text(coalesce(c -> 'films', '[]')) with ordinality x(v, o)
        on conflict do nothing;
      get diagnostics n = row_count;
      report := jsonb_set(report, '{collection_items}', to_jsonb((report ->> 'collection_items')::int + n));
      report := jsonb_set(report, '{collections}', to_jsonb((report ->> 'collections')::int + 1));
    end loop;
    delete from public.movie_collections where owner_id = uid and demo_seed_key is not null and not (demo_seed_key = any (keys));
  end loop;

  -- Follows among demo accounts only. Follows between real people and demo accounts are left alone.
  delete from public.follows where follower_id in (select id from public.profiles where is_demo) and followee_id in (select id from public.profiles where is_demo);
  insert into public.follows (follower_id, followee_id)
    select (ids ->> (x ->> 'follower'))::uuid, (ids ->> (x ->> 'following'))::uuid from jsonb_array_elements(coalesce(p -> 'follows', '[]')) x
     where ids ? (x ->> 'follower') and ids ? (x ->> 'following') and x ->> 'follower' <> x ->> 'following'
    on conflict do nothing;
  get diagnostics n = row_count;
  report := jsonb_set(report, '{follows}', to_jsonb(n));
  return report;
end $$;

revoke all on function public.demo_seed_lookup(text[]), public.demo_seed_targets(), public.demo_seed_apply(jsonb) from public, anon, authenticated;
grant execute on function public.demo_seed_lookup(text[]), public.demo_seed_targets(), public.demo_seed_apply(jsonb) to service_role;
