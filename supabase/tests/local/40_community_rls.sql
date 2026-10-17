-- Community (0005): demo labels, per-review visibility, Explore and collection pages.
-- From earlier files: A and B follow each other (friends); C follows A one way. A has reviewed films 101, 102, 105.
\set A '00000000-0000-0000-0000-00000000000a'
\set B '00000000-0000-0000-0000-00000000000b'
\set C '00000000-0000-0000-0000-00000000000c'

select test.ok((select bool_and(not is_demo) from public.profiles), 'real accounts are never demo by default');
select test.ok((select bool_and(review_visibility = 'private') from public.diary_entries), 'existing reviews stay private after the migration');

-- Nobody can label themselves (or anyone) as demo.
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
do $$ begin update public.profiles set is_demo = true where id = auth.uid(); perform test.ok(false, 'is_demo is not user-editable');
exception when insufficient_privilege then perform test.ok(true, 'people cannot mark themselves as demo'); end $$;
do $$ begin update public.profiles set demo_seed_key = 'x' where id = auth.uid(); perform test.ok(false, 'demo_seed_key is not user-editable');
exception when insufficient_privilege then perform test.ok(true, 'people cannot set a demo seed key'); end $$;
do $$ begin perform 1 from public.demo_seed_runs; perform test.ok(false, 'seed runs are server-only');
exception when insufficient_privilege then perform test.ok(true, 'the demo importer''s log is hidden from people'); end $$;
-- A sets one review public, one friends-only, one private.
update public.diary_entries set review_visibility = 'public' where user_id = auth.uid() and tmdb_id = 105;
update public.diary_entries set review_visibility = 'friends' where user_id = auth.uid() and tmdb_id = 102;
select test.ok((select count(*) from public.profile_reviews(auth.uid())) = 3, 'A sees all three of their own reviews');
-- Collections for Explore
insert into public.movie_collections (owner_id, title, visibility, tags) values
  (auth.uid(), 'Public picks', 'public', '{tense}'), (auth.uid(), 'Link only', 'unlisted', '{}'), (auth.uid(), 'Just mine', 'private', '{}');
insert into public.collection_items (collection_id, tmdb_id, position, added_by)
  select c.id, f.t, f.n, auth.uid() from public.movie_collections c, (values (101, 0), (102, 1), (103, 2), (104, 3), (105, 4)) f(t, n)
   where c.owner_id = auth.uid() and c.title in ('Public picks', 'Link only', 'Just mine');
commit;
insert into test.vars select 'unlisted_share', share_id from public.movie_collections where title = 'Link only';
insert into test.vars select 'private_share', share_id from public.movie_collections where title = 'Just mine';
insert into test.vars select 'public_share', share_id from public.movie_collections where title = 'Public picks';

-- B, a friend
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'B')::text, true);
select test.ok((select count(*) from public.profile_reviews(:'A')) = 2, 'a friend reads A''s public and friends-only reviews, not the private one');
select test.ok((select count(*) from public.film_reviews(102)) = 1, 'friends-only review shows on the film page for a friend');
select test.ok(not exists (select 1 from public.film_reviews(101)), 'A''s private review never shows on the film page');
commit;

-- C, one-way follower
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'C')::text, true);
select test.ok((select count(*) from public.profile_reviews(:'A')) = 1, 'a non-friend reads only A''s public review');
select test.ok(not exists (select 1 from public.film_reviews(102)), 'friends-only reviews are hidden from non-friends');
select test.ok(not exists (select 1 from public.film_reviews(105) r where r.review is null) and exists (select 1 from public.film_reviews(105)), 'public reviews show with their text');
select test.ok((select count(*) from public.explore_collections() where username is not null and title in ('Public picks', 'Link only', 'Just mine')) = 1, 'Explore lists only the public collection, never unlisted or private');
select test.ok((select film_count from public.explore_collections() where title = 'Public picks') = 5 and (select jsonb_array_length(covers) from public.explore_collections() where title = 'Public picks') = 4, 'Explore cards carry a film count and four covers');
select test.ok(exists (select 1 from public.explore_collections('tense')), 'Explore search finds collections by tag');
select test.ok(public.collection_page((select v from test.vars where k = 'unlisted_share')) ->> 'title' = 'Link only', 'an unlisted collection opens by its link');
select test.ok(public.collection_page((select v from test.vars where k = 'private_share')) is null, 'a private collection does not open for others, even with its id');
select test.ok(public.collection_page((select v from test.vars where k = 'public_share')) -> 'films' -> 0 ->> 'title' = 'Film One', 'the collection page lists its films in order');
select test.ok((select count(*) from public.community_members() where username::text like 'alice%') = 1 or not (select onboarded from public.profiles where id = :'A'), 'members directory lists people who finished setting up');
insert into public.collection_saves (user_id, collection_id) select auth.uid(), id from public.movie_collections where title = 'Public picks';
select test.ok((select saved_by_me from public.explore_collections() where title = 'Public picks'), 'saving a public collection shows as saved');
do $$ begin update public.movie_collections set title = 'mine now' where title = 'Public picks';
  perform test.ok((select title from public.movie_collections where share_id = (select v from test.vars where k = 'public_share')) = 'Public picks', 'saving gives no edit rights');
end $$;
commit;

-- Signed-out visitors
begin; set local role anon; select set_config('request.jwt.claims', '', true);
select test.ok((select count(*) from public.film_reviews(105)) = 1 and not exists (select 1 from public.film_reviews(102)), 'visitors see public reviews only');
select test.ok(exists (select 1 from public.explore_collections() where title = 'Public picks'), 'visitors can browse Explore');
commit;

-- Demo labelling, as the importer would set it (service role).
set role service_role;
update public.profiles set is_demo = true, demo_seed_key = 'viemo_demo_test' where id = :'C';
insert into public.movie_collections (owner_id, title, visibility, demo_seed_key) values (:'C', 'Demo shelf', 'public', 'c_col_1');
do $$ begin insert into public.movie_collections (owner_id, title, visibility, demo_seed_key) values ('00000000-0000-0000-0000-00000000000c', 'Again', 'public', 'c_col_1');
  perform test.ok(false, 'seed keys are unique per owner');
exception when unique_violation then perform test.ok(true, 'a demo collection can''t be duplicated by a rerun'); end $$;
reset role;
begin; set local role anon; select set_config('request.jwt.claims', '', true);
select test.ok((select is_demo from public.explore_collections() where title = 'Demo shelf'), 'demo collections are labelled as demo in Explore');
select test.ok(not exists (select 1 from public.explore_collections(p_include_demo => false) where title = 'Demo shelf'), 'demo collections can be left out entirely');
select test.ok(not exists (select 1 from public.community_members(p_include_demo => false) where is_demo), 'and demo members too');
commit;

-- Screening Activity respects each review's own visibility.
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
update public.profiles set activity_visibility = 'public' where id = auth.uid();
commit;
begin; set local role anon; select set_config('request.jwt.claims', '', true);
select test.ok((select bool_and(x ->> 'review' is null) from jsonb_array_elements(public.screening_day(:'A', current_date)) x), 'public activity still hides a private review''s text');
commit;
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
update public.profiles set activity_visibility = 'private' where id = auth.uid();
commit;
-- Undo the demo label for the next file.
set role service_role;
delete from public.movie_collections where demo_seed_key = 'c_col_1';
update public.profiles set is_demo = false, demo_seed_key = null where id = :'C';
reset role;
