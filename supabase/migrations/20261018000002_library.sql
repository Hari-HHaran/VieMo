-- My Cinema Library: watchlist, diary (Wall of Fame), favourites and collections with collaborators and saves.
-- Visibility is enforced here, not in the interface: private rows never leave the database for anyone else.

------------------------------------------------------------------------------------------------------------------
-- Watchlist. Private unless the owner sets profiles.watchlist_visibility = 'public'.
------------------------------------------------------------------------------------------------------------------
create table public.watchlist_items (
  user_id   uuid not null references public.profiles (id) on delete cascade,
  tmdb_id   integer not null references public.films (tmdb_id),
  note      text check (char_length(note) <= 500),
  added_at  timestamptz not null default now(),
  primary key (user_id, tmdb_id)
);
create index watchlist_by_film on public.watchlist_items (tmdb_id);
alter table public.watchlist_items enable row level security;
revoke all on public.watchlist_items from anon, authenticated;
create policy "owners read their watchlist; anyone reads a public one" on public.watchlist_items for select to anon, authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.profiles p where p.id = user_id and p.watchlist_visibility = 'public'));
create policy "owners add to their watchlist" on public.watchlist_items for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owners edit their watchlist" on public.watchlist_items for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "owners remove from their watchlist" on public.watchlist_items for delete to authenticated using (user_id = (select auth.uid()));
grant select on public.watchlist_items to anon, authenticated;
grant insert (user_id, tmdb_id, note), delete on public.watchlist_items to authenticated;
grant update (note) on public.watchlist_items to authenticated;

------------------------------------------------------------------------------------------------------------------
-- Diary: every watch, rating and review (the Wall of Fame's data). Private to its owner for now.
------------------------------------------------------------------------------------------------------------------
create table public.diary_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  tmdb_id     integer not null references public.films (tmdb_id),
  watched_on  date not null check (watched_on <= current_date + 1),
  rating      numeric(2, 1) check (rating between 0.5 and 5 and rating * 2 = floor(rating * 2)),
  review      text check (char_length(review) <= 5000),
  spoiler     boolean not null default false,
  notes       text check (char_length(notes) <= 1000),
  tags        text[] not null default '{}' check (cardinality(tags) <= 12),
  created_at  timestamptz not null default now()
);
create index diary_by_user on public.diary_entries (user_id, watched_on desc);
create index diary_by_film on public.diary_entries (tmdb_id);
alter table public.diary_entries enable row level security;
revoke all on public.diary_entries from anon, authenticated;
create policy "owners manage their diary" on public.diary_entries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, delete on public.diary_entries to authenticated;
grant insert (user_id, tmdb_id, watched_on, rating, review, spoiler, notes, tags) on public.diary_entries to authenticated;
grant update (watched_on, rating, review, spoiler, notes, tags) on public.diary_entries to authenticated;

create table public.favourites (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  tmdb_id    integer not null references public.films (tmdb_id),
  created_at timestamptz not null default now(),
  primary key (user_id, tmdb_id)
);
alter table public.favourites enable row level security;
revoke all on public.favourites from anon, authenticated;
create policy "owners manage their favourites" on public.favourites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, delete on public.favourites to authenticated;
grant insert (user_id, tmdb_id) on public.favourites to authenticated;

------------------------------------------------------------------------------------------------------------------
-- Collections. private (owner and collaborators), unlisted (also anyone with the share link, through
-- get_collection_by_share only, never in lists or search), public (everyone).
------------------------------------------------------------------------------------------------------------------
-- array_to_string is only "stable" in Postgres; for text[] it can't vary, so this wrapper is safely immutable
-- and can feed the generated search column.
create or replace function public.tags_text(tags text[]) returns text language sql immutable parallel safe set search_path = '' as $$
  select coalesce(array_to_string(tags, ' '), '')
$$;

create table public.movie_collections (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  title         text not null check (char_length(btrim(title)) between 1 and 120),
  description   text check (char_length(description) <= 2000),
  tags          text[] not null default '{}' check (cardinality(tags) <= 10),
  cover_tmdb_id integer references public.films (tmdb_id),
  visibility    text not null default 'private' check (visibility in ('private', 'unlisted', 'public')),
  share_id      text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  copied_from   uuid references public.movie_collections (id) on delete set null,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  search        tsvector generated always as (
                  setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
                  setweight(to_tsvector('simple'::regconfig, public.tags_text(tags)), 'B') ||
                  setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'C')) stored
);
create index collections_by_owner on public.movie_collections (owner_id);
create index collections_public_recent on public.movie_collections (published_at desc) where visibility = 'public';
create index collections_search on public.movie_collections using gin (search);
create index collections_tags on public.movie_collections using gin (tags);
create trigger collections_touch before update on public.movie_collections for each row execute function public.touch_updated_at();

-- published_at marks the first time a collection went public (for "recently published").
create or replace function public.stamp_published() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.visibility = 'public' and new.published_at is null then new.published_at := now(); end if;
  return new;
end $$;
revoke all on function public.stamp_published() from public, anon, authenticated;
create trigger collections_publish before insert or update of visibility on public.movie_collections
  for each row execute function public.stamp_published();

create table public.collection_items (
  collection_id uuid not null references public.movie_collections (id) on delete cascade,
  tmdb_id       integer not null references public.films (tmdb_id),
  position      integer not null check (position >= 0),
  note          text check (char_length(note) <= 500),
  added_by      uuid references public.profiles (id) on delete set null,
  added_at      timestamptz not null default now(),
  primary key (collection_id, tmdb_id)
);
create index collection_items_order on public.collection_items (collection_id, position);
create index collection_items_by_film on public.collection_items (tmdb_id);

create table public.collection_collaborators (
  collection_id uuid not null references public.movie_collections (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  role          text not null check (role in ('editor', 'viewer')),
  invited_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  primary key (collection_id, user_id)
);
create index collaborators_by_user on public.collection_collaborators (user_id);

create table public.collection_saves (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  collection_id uuid not null references public.movie_collections (id) on delete cascade,
  saved_at      timestamptz not null default now(),
  primary key (user_id, collection_id)
);
create index saves_by_collection on public.collection_saves (collection_id);

-- Membership checks run as the definer so policies on related tables don't recurse into each other.
create or replace function public.collection_role(cid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when c.owner_id = (select auth.uid()) then 'owner'
    else (select cc.role from public.collection_collaborators cc where cc.collection_id = cid and cc.user_id = (select auth.uid()))
  end
  from public.movie_collections c where c.id = cid
$$;
create or replace function public.can_view_collection(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.movie_collections c where c.id = cid and c.visibility = 'public')
      or public.collection_role(cid) is not null
$$;
create or replace function public.can_edit_collection_items(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.collection_role(cid) in ('owner', 'editor'), false)
$$;
revoke all on function public.collection_role(uuid), public.can_view_collection(uuid), public.can_edit_collection_items(uuid) from public, anon, authenticated;
grant execute on function public.collection_role(uuid), public.can_view_collection(uuid), public.can_edit_collection_items(uuid) to anon, authenticated;

alter table public.movie_collections enable row level security;
revoke all on public.movie_collections from anon, authenticated;
alter table public.collection_items enable row level security;
revoke all on public.collection_items from anon, authenticated;
alter table public.collection_collaborators enable row level security;
revoke all on public.collection_collaborators from anon, authenticated;
alter table public.collection_saves enable row level security;
revoke all on public.collection_saves from anon, authenticated;

-- Collections: public ones for everyone; private and unlisted ones only for the owner and collaborators.
create policy "public collections and your own" on public.movie_collections for select to anon, authenticated
  using (visibility = 'public' or owner_id = (select auth.uid()) or public.collection_role(id) is not null);
create policy "you create collections as yourself" on public.movie_collections for insert to authenticated with check (owner_id = (select auth.uid()));
-- Only the owner changes a collection's details and visibility; editors change its films.
create policy "owners edit their collections" on public.movie_collections for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owners delete their collections" on public.movie_collections for delete to authenticated using (owner_id = (select auth.uid()));
grant select on public.movie_collections to anon, authenticated;
grant delete on public.movie_collections to authenticated;
grant insert (owner_id, title, description, tags, cover_tmdb_id, visibility) on public.movie_collections to authenticated;
grant update (title, description, tags, cover_tmdb_id, visibility) on public.movie_collections to authenticated;

create policy "films in collections you can see" on public.collection_items for select to anon, authenticated using (public.can_view_collection(collection_id));
create policy "owners and editors add films" on public.collection_items for insert to authenticated
  with check (public.can_edit_collection_items(collection_id) and added_by = (select auth.uid()));
create policy "owners and editors reorder films" on public.collection_items for update to authenticated
  using (public.can_edit_collection_items(collection_id)) with check (public.can_edit_collection_items(collection_id));
create policy "owners and editors remove films" on public.collection_items for delete to authenticated using (public.can_edit_collection_items(collection_id));
grant select on public.collection_items to anon, authenticated;
grant delete on public.collection_items to authenticated;
grant insert (collection_id, tmdb_id, position, note, added_by) on public.collection_items to authenticated;
grant update (position, note) on public.collection_items to authenticated;

create policy "owners see collaborators; collaborators see themselves" on public.collection_collaborators for select to authenticated
  using (user_id = (select auth.uid()) or public.collection_role(collection_id) = 'owner');
create policy "owners invite collaborators" on public.collection_collaborators for insert to authenticated
  with check (public.collection_role(collection_id) = 'owner' and invited_by = (select auth.uid()) and user_id <> (select auth.uid()));
create policy "owners change roles" on public.collection_collaborators for update to authenticated
  using (public.collection_role(collection_id) = 'owner') with check (public.collection_role(collection_id) = 'owner');
create policy "owners remove collaborators; collaborators can leave" on public.collection_collaborators for delete to authenticated
  using (user_id = (select auth.uid()) or public.collection_role(collection_id) = 'owner');
grant select, delete on public.collection_collaborators to authenticated;
grant insert (collection_id, user_id, role, invited_by) on public.collection_collaborators to authenticated;
grant update (role) on public.collection_collaborators to authenticated;

-- Saving a collection bookmarks it; it gives no edit rights. Only public collections can be saved directly.
create policy "you see your saves" on public.collection_saves for select to authenticated using (user_id = (select auth.uid()));
create policy "you save public collections" on public.collection_saves for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.movie_collections c where c.id = collection_id and c.visibility = 'public'));
create policy "you unsave" on public.collection_saves for delete to authenticated using (user_id = (select auth.uid()));
grant select, delete on public.collection_saves to authenticated;
grant insert (user_id, collection_id) on public.collection_saves to authenticated;

------------------------------------------------------------------------------------------------------------------
-- Functions for links, copies and honest counts.
------------------------------------------------------------------------------------------------------------------
-- Open a collection from its share link: works for public and unlisted ones (and for members of private ones).
create or replace function public.get_collection_by_share(p_share text)
returns table (id uuid, owner_id uuid, owner_username text, title text, description text, tags text[], cover_tmdb_id integer,
               visibility text, share_id text, published_at timestamptz, updated_at timestamptz, your_role text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.owner_id, p.username::text, c.title, c.description, c.tags, c.cover_tmdb_id, c.visibility, c.share_id,
         c.published_at, c.updated_at, public.collection_role(c.id)
  from public.movie_collections c join public.profiles p on p.id = c.owner_id
  where c.share_id = p_share and (c.visibility in ('public', 'unlisted') or public.collection_role(c.id) is not null)
$$;
create or replace function public.get_collection_items_by_share(p_share text)
returns table (tmdb_id integer, title text, year smallint, poster_path text, genres text[], runtime smallint, item_position integer, note text)
language sql stable security definer set search_path = '' as $$
  select f.tmdb_id, f.title, f.year, f.poster_path, f.genres, f.runtime, i.position, i.note
  from public.movie_collections c
  join public.collection_items i on i.collection_id = c.id
  join public.films f on f.tmdb_id = i.tmdb_id
  where c.share_id = p_share and (c.visibility in ('public', 'unlisted') or public.collection_role(c.id) is not null)
  order by i.position
$$;

-- Make your own editable, private copy of a collection you can see (or open by link).
create or replace function public.copy_collection(p_share text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare src public.movie_collections; new_id uuid; me uuid := (select auth.uid());
begin
  if me is null then raise exception 'sign in to copy a collection' using errcode = '42501'; end if;
  select * into src from public.movie_collections c
   where c.share_id = p_share and (c.visibility in ('public', 'unlisted') or public.collection_role(c.id) is not null);
  if src.id is null then raise exception 'collection not found' using errcode = 'P0002'; end if;
  insert into public.movie_collections (owner_id, title, description, tags, cover_tmdb_id, visibility, copied_from)
  values (me, left('Copy of ' || src.title, 120), src.description, src.tags, src.cover_tmdb_id, 'private', src.id)
  returning id into new_id;
  insert into public.collection_items (collection_id, tmdb_id, position, note, added_by)
  select new_id, i.tmdb_id, i.position, i.note, me from public.collection_items i where i.collection_id = src.id;
  return new_id;
end $$;

-- Save counts, only ever for public collections, counted from real saves.
create or replace function public.collection_save_count(cid uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from public.movie_collections c where c.id = cid and c.visibility = 'public')
              then (select count(*)::integer from public.collection_saves s where s.collection_id = cid) end
$$;

revoke all on function public.get_collection_by_share(text), public.get_collection_items_by_share(text),
  public.copy_collection(text), public.collection_save_count(uuid) from public, anon, authenticated;
grant execute on function public.get_collection_by_share(text), public.get_collection_items_by_share(text), public.collection_save_count(uuid) to anon, authenticated;
grant execute on function public.copy_collection(text) to authenticated;
