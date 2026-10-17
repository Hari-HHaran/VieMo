-- SceneAtlas: filming locations with their evidence. Only the server (service role) writes places, claims and
-- sources, after checking them; anyone can read checked claims. Unconfirmed candidates are never readable.

create table public.places (
  id            uuid primary key default gen_random_uuid(),
  wikidata_qid  text unique check (wikidata_qid ~ '^Q[0-9]+$'),
  osm_ref       text unique check (osm_ref ~ '^(node|way|relation)/[0-9]+$'),
  name          text not null check (char_length(name) between 1 and 200),
  country       text check (char_length(country) <= 100),
  region        text check (char_length(region) <= 120),
  lat           double precision not null check (lat between -90 and 90),
  lng           double precision not null check (lng between -180 and 180),
  precision     text not null check (precision in ('exact', 'site', 'city', 'region', 'country')),
  kind          text not null default 'unknown' check (kind in ('on_location', 'studio', 'backlot', 'unknown')),
  image         jsonb check (image is null or (image ? 'url' and image ? 'license' and image ? 'author' and image ? 'source_url')),
  accessibility text check (char_length(accessibility) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index places_country on public.places (country);
create index places_latlng on public.places (lat, lng);
create trigger places_touch before update on public.places for each row execute function public.touch_updated_at();

create table public.location_claims (
  id                uuid primary key default gen_random_uuid(),
  tmdb_id           integer not null references public.films (tmdb_id) on delete cascade,
  wikidata_film     text check (wikidata_film ~ '^Q[0-9]+$'),
  place_id          uuid not null references public.places (id) on delete cascade,
  relation          text not null check (relation in ('filmed_at', 'studio', 'setting')),
  scene             text check (char_length(scene) <= 1000),
  behind_the_scenes text check (char_length(behind_the_scenes) <= 2000),
  status            text not null check (status in ('verified', 'sourced', 'community', 'candidate')),
  last_verified     timestamptz not null default now(),
  notes             text check (char_length(notes) <= 1000),
  unique (tmdb_id, place_id, relation)
);
create index claims_by_film on public.location_claims (tmdb_id);
create index claims_by_place on public.location_claims (place_id);
create index claims_by_status on public.location_claims (status);

create table public.claim_sources (
  id           uuid primary key default gen_random_uuid(),
  claim_id     uuid not null references public.location_claims (id) on delete cascade,
  title        text not null check (char_length(title) <= 300),
  url          text not null check (url ~ '^https://'),
  publisher    text check (char_length(publisher) <= 120),
  quote        text check (char_length(quote) <= 1200),
  method       text not null check (method in ('wikidata', 'wikipedia', 'web')),
  retrieved_at timestamptz not null default now(),
  unique (claim_id, url)
);
create index sources_by_claim on public.claim_sources (claim_id);

-- Research runs once per film; the server takes the lock by inserting the row.
create table public.research_jobs (
  tmdb_id     integer primary key references public.films (tmdb_id) on delete cascade,
  status      text not null check (status in ('running', 'done', 'failed')),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  tokens      integer not null default 0,
  error       text check (char_length(error) <= 500)
);

-- A hard daily cap on AI spending, shared by every server instance.
create table public.ai_budget (
  day         date primary key default current_date,
  tokens_used bigint not null default 0 check (tokens_used >= 0)
);
create or replace function public.spend_ai_tokens(p_tokens integer, p_daily_limit bigint) returns boolean
language plpgsql security definer set search_path = '' as $$
declare used bigint;
begin
  insert into public.ai_budget (day, tokens_used) values (current_date, 0) on conflict (day) do nothing;
  update public.ai_budget set tokens_used = tokens_used + p_tokens
   where day = current_date and tokens_used + p_tokens <= p_daily_limit returning tokens_used into used;
  return used is not null;
end $$;
revoke all on function public.spend_ai_tokens(integer, bigint) from public, anon, authenticated;

-- Location Passport: places someone saved, wants to visit or has visited. Private.
create table public.location_passport (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  place_id   uuid not null references public.places (id) on delete cascade,
  status     text not null check (status in ('saved', 'want', 'visited')),
  updated_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

alter table public.places enable row level security;
revoke all on public.places from anon, authenticated;
alter table public.location_claims enable row level security;
revoke all on public.location_claims from anon, authenticated;
alter table public.claim_sources enable row level security;
revoke all on public.claim_sources from anon, authenticated;
alter table public.research_jobs enable row level security;
revoke all on public.research_jobs from anon, authenticated;
alter table public.ai_budget enable row level security;
revoke all on public.ai_budget from anon, authenticated;
alter table public.location_passport enable row level security;
revoke all on public.location_passport from anon, authenticated;

create policy "places are readable by everyone" on public.places for select to anon, authenticated using (true);
create policy "checked claims are readable by everyone" on public.location_claims for select to anon, authenticated using (status <> 'candidate');
create policy "sources of checked claims are readable" on public.claim_sources for select to anon, authenticated
  using (exists (select 1 from public.location_claims c where c.id = claim_id and c.status <> 'candidate'));
create policy "owners manage their passport" on public.location_passport for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- research_jobs and ai_budget have no policies: only the server can touch them.

grant select on public.places, public.location_claims, public.claim_sources to anon, authenticated;
grant select, insert, update, delete on public.location_passport to authenticated;
