-- REEL / VieMo foundation: the film cache every other table points at, profiles for accounts, and follows.
-- Row level security is on for every table and denies by default; each policy below is the only way in.
-- Safe to run once on a fresh Supabase project (SQL Editor, or `supabase db push`).

create schema if not exists extensions;
create extension if not exists citext with schema extensions;

-- Shared helper: keep updated_at honest.
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

------------------------------------------------------------------------------------------------------------------
-- films: a cache of TMDB facts. Only the server writes it (service role), always from TMDB, so a film id
-- anywhere in the database is a real TMDB film.
------------------------------------------------------------------------------------------------------------------
create table public.films (
  tmdb_id     integer primary key check (tmdb_id > 0),
  title       text not null check (char_length(title) between 1 and 300),
  year        smallint check (year between 1870 and 2100),
  poster_path text check (poster_path ~ '^/[A-Za-z0-9._-]+$'),
  genres      text[] not null default '{}' check (cardinality(genres) <= 12),
  runtime     smallint check (runtime between 1 and 1000),
  fetched_at  timestamptz not null default now()
);
alter table public.films enable row level security;
revoke all on public.films from anon, authenticated;
create policy "films are readable by everyone" on public.films for select to anon, authenticated using (true);
grant select on public.films to anon, authenticated;

------------------------------------------------------------------------------------------------------------------
-- profiles: one per account, created automatically at sign-up.
------------------------------------------------------------------------------------------------------------------
create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  username             extensions.citext not null unique check (username::text ~ '^[a-z0-9_]{3,24}$'),
  display_name         text check (char_length(display_name) <= 60),
  avatar_url           text check (avatar_url is null or avatar_url ~ '^https://'),
  bio                  text check (char_length(bio) <= 280),
  watchlist_visibility text not null default 'private' check (watchlist_visibility in ('private', 'public')),
  onboarded            boolean not null default false,
  is_editor            boolean not null default false,   -- set by the site owner in Supabase; never by users
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- Profiles are public (username, name, avatar), so collections and match rooms can show who's who.
create policy "profiles are readable by everyone" on public.profiles for select to anon, authenticated using (true);
create policy "people edit their own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
grant select on public.profiles to anon, authenticated;
-- Column-level: people can change these, and nothing else (not is_editor, not id).
grant update (username, display_name, avatar_url, bio, watchlist_visibility, onboarded) on public.profiles to authenticated;

-- A new account gets a profile with a username made from the email, made unique with a short suffix.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  base text := left(regexp_replace(lower(split_part(coalesce(new.email, 'member'), '@', 1)), '[^a-z0-9_]', '', 'g'), 16);
  candidate text;
begin
  if char_length(base) < 3 then base := 'member'; end if;
  loop
    candidate := base || '_' || substr(md5(random()::text || clock_timestamp()::text), 1, 4);
    exit when not exists (select 1 from public.profiles p where p.username = candidate::extensions.citext);
  end loop;
  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 60), ''));
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

------------------------------------------------------------------------------------------------------------------
-- follows: who follows whom. Public, like profiles.
------------------------------------------------------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee on public.follows (followee_id);
alter table public.follows enable row level security;
revoke all on public.follows from anon, authenticated;
create policy "follows are readable by everyone" on public.follows for select to anon, authenticated using (true);
create policy "people follow as themselves" on public.follows for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "people unfollow as themselves" on public.follows for delete to authenticated using (follower_id = (select auth.uid()));
grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;
