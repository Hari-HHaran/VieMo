-- Screening Activity: a seat for every day, lit by how much someone watched, rated and reviewed.
-- activity_days keeps one row per person per active day, updated by a trigger on diary_entries, so a month
-- is at most 31 indexed rows and nothing is recounted when a profile opens. Nobody reads it directly: the
-- functions below check who is asking against the owner's setting first.

alter table public.profiles add column activity_visibility text not null default 'private'
  check (activity_visibility in ('private', 'friends', 'public'));
grant update (activity_visibility) on public.profiles to authenticated;

create table public.activity_days (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  day      date not null,
  watched  integer not null default 0 check (watched >= 0),
  rated    integer not null default 0 check (rated >= 0),
  reviewed integer not null default 0 check (reviewed >= 0),
  primary key (user_id, day)
);
alter table public.activity_days enable row level security;
revoke all on public.activity_days from anon, authenticated;
-- No policies: only the trigger and the functions below (security definer) touch it.

-- A rating or review counts on the day the film was watched, the same rule the app uses on a device.
create or replace function public.track_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.activity_days
       set watched = watched - 1,
           rated = rated - (old.rating is not null)::int,
           reviewed = reviewed - (coalesce(btrim(old.review), '') <> '')::int
     where user_id = old.user_id and day = old.watched_on;
    delete from public.activity_days where user_id = old.user_id and day = old.watched_on and watched <= 0;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    insert into public.activity_days as a (user_id, day, watched, rated, reviewed)
    values (new.user_id, new.watched_on, 1, (new.rating is not null)::int, (coalesce(btrim(new.review), '') <> '')::int)
    on conflict (user_id, day) do update
      set watched = a.watched + excluded.watched, rated = a.rated + excluded.rated, reviewed = a.reviewed + excluded.reviewed;
  end if;
  return null;
end $$;
revoke all on function public.track_activity() from public, anon, authenticated;
create trigger diary_activity after insert or delete or update of watched_on, rating, review on public.diary_entries
  for each row execute function public.track_activity();

-- Anything already in diaries.
insert into public.activity_days (user_id, day, watched, rated, reviewed)
select user_id, watched_on, count(*), count(rating), count(*) filter (where coalesce(btrim(review), '') <> '')
  from public.diary_entries group by user_id, watched_on
on conflict (user_id, day) do nothing;

-- Who may see someone's activity: themselves; anyone if public; friends (they follow each other) if friends.
create or replace function public.can_view_activity(p_owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
     where p.id = p_owner
       and (p.id = (select auth.uid())
            or p.activity_visibility = 'public'
            or (p.activity_visibility = 'friends' and (select auth.uid()) is not null
                and exists (select 1 from public.follows f where f.follower_id = p_owner and f.followee_id = (select auth.uid()))
                and exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = p_owner))))
$$;

-- One month of seats, the streaks and the month's top genre, in one call. p_today is the viewer's date (time
-- zones differ from the server's); it only moves the streak, and is kept within a day of the server's date.
create or replace function public.screening_month(p_owner uuid, p_month date, p_today date default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  start  date := date_trunc('month', p_month)::date;
  finish date := (date_trunc('month', p_month) + interval '1 month')::date;
  today  date := least(greatest(coalesce(p_today, current_date), current_date - 1), current_date + 1);
  result jsonb;
begin
  if not public.can_view_activity(p_owner) then return jsonb_build_object('allowed', false); end if;
  with d as (select day from public.activity_days where user_id = p_owner and day <= today),
       g as (select day, day - (row_number() over (order by day))::int as grp from d),
       runs as (select max(day) as last_day, count(*) as n from g group by grp)
  select jsonb_build_object(
    'allowed', true,
    'days', coalesce((select jsonb_object_agg(a.day::text, jsonb_build_array(a.watched, a.rated, a.reviewed))
                        from public.activity_days a where a.user_id = p_owner and a.day >= start and a.day < finish), '{}'::jsonb),
    'longest', coalesce((select max(n) from runs), 0),
    'current', coalesce((select max(n) from runs where last_day >= today - 1), 0),
    'first_day', (select min(day) from public.activity_days where user_id = p_owner),
    'titles', coalesce((select jsonb_object_agg(t.day::text, t.titles) from (
                  select e.watched_on as day, jsonb_agg(f.title order by e.created_at) as titles
                    from public.diary_entries e join public.films f on f.tmdb_id = e.tmdb_id
                   where e.user_id = p_owner and e.watched_on >= start and e.watched_on < finish group by e.watched_on) t), '{}'::jsonb),
    'top_genre', (select g2.genre from public.diary_entries e join public.films f on f.tmdb_id = e.tmdb_id
                    cross join lateral unnest(f.genres) as g2(genre)
                   where e.user_id = p_owner and e.watched_on >= start and e.watched_on < finish
                   group by g2.genre order by count(*) desc, g2.genre limit 1)
  ) into result;
  return result;
end $$;

-- One day's films, with ratings and reviews. Never private notes or tags.
create or replace function public.screening_day(p_owner uuid, p_day date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_view_activity(p_owner) then return null; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('tmdb_id', e.tmdb_id, 'title', f.title, 'year', f.year, 'poster_path', f.poster_path,
                                        'rating', e.rating, 'review', nullif(btrim(e.review), ''), 'spoiler', e.spoiler)
                     order by e.created_at)
      from public.diary_entries e join public.films f on f.tmdb_id = e.tmdb_id
     where e.user_id = p_owner and e.watched_on = p_day), '[]'::jsonb);
end $$;

revoke all on function public.can_view_activity(uuid) from public;
revoke all on function public.screening_month(uuid, date, date) from public;
revoke all on function public.screening_day(uuid, date) from public;
grant execute on function public.can_view_activity(uuid) to anon, authenticated;
grant execute on function public.screening_month(uuid, date, date) to anon, authenticated;
grant execute on function public.screening_day(uuid, date) to anon, authenticated;
