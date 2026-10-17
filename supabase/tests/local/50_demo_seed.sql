-- Demo importer (0005): idempotent, labelled, and never touches real users.
\set A '00000000-0000-0000-0000-00000000000a'
\set D1 '00000000-0000-0000-0000-0000000000d1'
\set D2 '00000000-0000-0000-0000-0000000000d2'
\set R '00000000-0000-0000-0000-0000000000e1'

-- What the Admin API would create: two demo users with reserved addresses, plus a real person who already took
-- one of the demo usernames, plus a real person whose id someone might try to slip into the payload.
insert into auth.users (id, email, raw_user_meta_data) values
  (:'D1', 'viemo.demo.cosmicframes@example.com', '{"display_name": "Mira Tan"}'),
  (:'D2', 'viemo.demo.plotdetective@example.com', '{}'),
  (:'R', 'real.person@gmail.com', '{}');
update public.profiles set username = 'plotdetective', onboarded = true where id = :'R';
insert into public.diary_entries (user_id, tmdb_id, watched_on, rating, review) values (:'R', 101, current_date, 3, 'my own words');

-- Ordinary people can't run the importer.
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
do $$ begin perform public.demo_seed_apply('{}'::jsonb); perform test.ok(false, 'demo_seed_apply is server-only');
exception when insufficient_privilege then perform test.ok(true, 'people cannot run the demo importer'); end $$;
do $$ begin perform public.demo_seed_targets(); perform test.ok(false, 'demo_seed_targets is server-only');
exception when insufficient_privilege then perform test.ok(true, 'people cannot list demo accounts for deletion'); end $$;
commit;

create temp table seed_payload as select jsonb_build_object(
  'films', jsonb_build_array(jsonb_build_object('tmdb_id', 157336, 'title', 'Interstellar', 'year', 2014, 'poster_path', '/i.jpg', 'genres', jsonb_build_array('Science Fiction'), 'runtime', 169)),
  'accounts', jsonb_build_array(
    jsonb_build_object('seed_key', 'viemo_demo_cosmicframes', 'user_id', :'D1', 'email', 'viemo.demo.cosmicframes@example.com', 'username', 'cosmicframes',
      'display_name', 'Mira Tan', 'bio', 'Sci-fi.', 'watchlist_visibility', 'public',
      'watched', jsonb_build_array(jsonb_build_object('tmdb_id', 157336, 'watched_on', '2026-10-13', 'rating', 4, 'review', 'Big and moving.', 'review_visibility', 'public'),
                                   jsonb_build_object('tmdb_id', 101, 'watched_on', '2026-10-01', 'rating', 2.5, 'review', null, 'review_visibility', 'private')),
      'watchlist', jsonb_build_array(102, 103),
      'collections', jsonb_build_array(jsonb_build_object('seed_key', 'cosmic_1', 'title', 'Beyond the Stars', 'description', 'Demo.', 'visibility', 'public', 'films', jsonb_build_array(157336, 101)),
                                       jsonb_build_object('seed_key', 'cosmic_3', 'title', 'Personal Space Archive', 'description', 'Demo.', 'visibility', 'private', 'films', jsonb_build_array(101)))),
    jsonb_build_object('seed_key', 'viemo_demo_plotdetective', 'user_id', :'D2', 'email', 'viemo.demo.plotdetective@example.com', 'username', 'plotdetective',
      'display_name', 'Noah Lim', 'bio', 'Twists.', 'watchlist_visibility', 'private',
      'watched', jsonb_build_array(jsonb_build_object('tmdb_id', 101, 'watched_on', '2026-10-02', 'rating', 4.5, 'review', 'Loved the setup.', 'review_visibility', 'public')),
      'watchlist', '[]'::jsonb, 'collections', '[]'::jsonb),
    jsonb_build_object('seed_key', 'viemo_demo_impostor', 'user_id', :'R', 'email', 'real.person@gmail.com', 'username', 'hijack', 'display_name', 'x', 'bio', 'x',
      'watched', '[]'::jsonb, 'watchlist', '[]'::jsonb, 'collections', '[]'::jsonb)),
  'follows', jsonb_build_array(jsonb_build_object('follower', 'viemo_demo_cosmicframes', 'following', 'viemo_demo_plotdetective'),
                               jsonb_build_object('follower', 'viemo_demo_plotdetective', 'following', 'viemo_demo_cosmicframes'))) as p;
grant select on seed_payload to service_role;

set role service_role;
create temp table r1 as select public.demo_seed_apply(p) as r from seed_payload;
create temp table r2 as select public.demo_seed_apply(p) as r from seed_payload;
reset role;

select test.ok((select (r ->> 'accounts')::int = 2 and (r ->> 'watched')::int = 3 and (r ->> 'collections')::int = 2 and (r ->> 'follows')::int = 2 from r1), 'the importer creates two demo accounts with their diary, collections and follows');
select test.ok((select r -> 'skipped' -> 0 ->> 'seed_key' = 'viemo_demo_impostor' from r1), 'an account that is not a reserved demo address is skipped');
select test.ok((select username::text from public.profiles where id = :'R') = 'plotdetective' and (select not is_demo from public.profiles where id = :'R'), 'the real person keeps their username and is never labelled demo');
select test.ok((select review from public.diary_entries where user_id = :'R') = 'my own words', 'the real person''s content is untouched');
select test.ok((select username::text from public.profiles where id = :'D2') = 'demo_plotdetective' and (select r -> 'renamed' -> 0 ->> 'used' = 'demo_plotdetective' from r1), 'a taken username gets a demo_ prefix, and the report says so');
select test.ok((select count(*) from public.profiles where is_demo) = 2 and (select bool_and(onboarded) from public.profiles where is_demo), 'both demo profiles are labelled and set up');
select test.ok((select count(*) from public.diary_entries where user_id in (:'D1', :'D2')) = 3, 'rerunning does not duplicate diary entries');
select test.ok((select count(*) from public.movie_collections where owner_id = :'D1') = 2 and (select count(*) from public.collection_items i join public.movie_collections c on c.id = i.collection_id where c.owner_id = :'D1') = 3, 'rerunning does not duplicate collections or their films');
select test.ok((select count(*) from public.follows where follower_id in (:'D1', :'D2') and followee_id in (:'D1', :'D2')) = 2, 'rerunning does not duplicate follows');
select test.ok((select title from public.films where tmdb_id = 157336) = 'Interstellar', 'resolved films are stored');
select test.ok((select watched = 1 from public.activity_days where user_id = :'D1' and day = '2026-10-13'), 'Screening Activity totals follow the seeded diary');
select test.ok((select count(*) from public.demo_seed_targets() ) = 2 and not exists (select 1 from public.demo_seed_targets() where user_id = :'R'), 'cleanup targets only the demo accounts');

-- A real person sees the demo community labelled, and private demo things stay private.
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'R')::text, true);
select test.ok((select is_demo from public.explore_collections() where title = 'Beyond the Stars'), 'demo collections show in Explore, labelled demo');
select test.ok(not exists (select 1 from public.explore_collections() where title = 'Personal Space Archive') and not exists (select 1 from public.movie_collections where title = 'Personal Space Archive'), 'a demo account''s private collection stays private');
select test.ok((select count(*) from public.watchlist_items where user_id = :'D1') = 2 and (select count(*) from public.watchlist_items where user_id = :'D2') = 0, 'a public demo watchlist is visible; a private one is not');
select test.ok((select count(*) from public.film_reviews(157336)) = 1 and (select is_demo from public.film_reviews(157336)), 'demo reviews show on the film page, labelled demo');
do $$ begin update public.movie_collections set title = 'mine' where title = 'Beyond the Stars';
  perform test.ok((select count(*) from public.movie_collections where title = 'Beyond the Stars') = 1, 'nobody can edit a demo collection');
end $$;
insert into public.follows (follower_id, followee_id) values (auth.uid(), :'D1');
commit;

-- Rerunning keeps the real person's follow of a demo account.
set role service_role; select public.demo_seed_apply(p) from seed_payload; reset role;
select test.ok(exists (select 1 from public.follows where follower_id = :'R' and followee_id = :'D1'), 'a rerun keeps real people''s follows of demo accounts');

-- Cleanup (the Admin API deletes the Auth users; deleting them here has the same cascade).
delete from auth.users where id in (select user_id from public.demo_seed_targets());
select test.ok(not exists (select 1 from public.profiles where is_demo) and not exists (select 1 from public.movie_collections where demo_seed_key is not null), 'cleanup removes every demo profile and collection');
select test.ok(exists (select 1 from public.profiles where id = :'R') and (select count(*) from public.diary_entries where user_id = :'R') = 1, 'cleanup leaves the real person and their diary alone');
select test.ok(not exists (select 1 from public.follows where followee_id in (:'D1', :'D2')), 'follows of demo accounts go with them');
