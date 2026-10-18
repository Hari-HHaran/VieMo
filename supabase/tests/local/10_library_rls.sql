-- Row level security tests for 0001 foundation and 0002 library, as three accounts and a signed-out visitor.
-- A = Alice, B = Bob, C = Cleo. Every check prints PASS or FAIL.
\set A '00000000-0000-0000-0000-00000000000a'
\set B '00000000-0000-0000-0000-00000000000b'
\set C '00000000-0000-0000-0000-00000000000c'

create table test.vars (k text primary key, v text);
grant select, insert on test.vars to anon, authenticated, service_role;

-- Seed: three sign-ups (the trigger makes their profiles) and some films (as the server would).
insert into auth.users (id, email, raw_user_meta_data) values (:'A', 'alice@example.com', '{}'), (:'B', 'Bob.Smith+films@example.com', '{"display_name": "Bob Smith"}'), (:'C', 'c@x.io', '{}');
set role service_role;
insert into public.films (tmdb_id, title, year, genres) values (101, 'Film One', 1994, '{Drama}'), (102, 'Film Two', 2001, '{Comedy}'),
  (103, 'Film Three', 2015, '{Horror}'), (104, 'Film Four', 1977, '{Drama,Romance}'), (105, 'Film Five', 2023, '{Thriller}');
reset role;

select test.ok((select count(*) from public.profiles) = 3, 'sign-up creates a profile for each of the three accounts');
select test.ok((select username::text from public.profiles where id = :'B') ~ '^bobsmith_[0-9a-f]{4}$', 'a starting username comes from the name given at sign-up, lowercased and made unique');
select test.ok((select username::text from public.profiles where id = :'A') ~ '^member_[0-9a-f]{4}$', 'without a name it is member_ plus a random ending');
select test.ok(not exists (select 1 from public.profiles p join auth.users u on u.id = p.id where p.username::text like split_part(lower(u.email), '@', 1) || '%' and char_length(split_part(u.email, '@', 1)) >= 3), 'no starting username contains any part of an email address');
select test.ok((select watchlist_visibility from public.profiles where id = :'A') = 'private', 'watchlists start private');

-- ===== Profiles =====
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
update public.profiles set display_name = 'Alice' where id = :'A';
select test.ok((select display_name from public.profiles where id = :'A') = 'Alice', 'A edits their own profile');
with u as (update public.profiles set display_name = 'hacked' where id = :'B' returning 1) select test.ok((select count(*) from u) = 0, 'A cannot edit B''s profile');
do $$ begin update public.profiles set is_editor = true where id = auth.uid(); perform test.ok(false, 'A cannot make themselves an editor');
exception when insufficient_privilege then perform test.ok(true, 'A cannot make themselves an editor'); end $$;
do $$ begin update public.profiles set username = 'Alice_Upper' where id = auth.uid(); perform test.ok(false, 'usernames must be lowercase');
exception when check_violation then perform test.ok(true, 'usernames must be lowercase'); end $$;
commit;
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
update public.profiles set username = 'alice' where id = :'A';
commit;
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'B')::text, true);
do $$ begin update public.profiles set username = 'alice' where id = auth.uid(); perform test.ok(false, 'usernames are unique');
exception when unique_violation then perform test.ok(true, 'usernames are unique (B cannot take alice)'); end $$;
do $$ begin insert into public.films (tmdb_id, title) values (999, 'Made up'); perform test.ok(false, 'people cannot add films to the cache');
exception when insufficient_privilege then perform test.ok(true, 'people cannot add films to the cache (only the server can)'); end $$;
commit;

-- ===== Watchlist =====
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
insert into public.watchlist_items (user_id, tmdb_id) values (auth.uid(), 101), (auth.uid(), 102);
do $$ begin insert into public.watchlist_items (user_id, tmdb_id) values (auth.uid(), 4242); perform test.ok(false, 'watchlist films must be real cached films');
exception when foreign_key_violation then perform test.ok(true, 'watchlist films must be real cached films'); end $$;
commit;
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'B')::text, true);
select test.ok((select count(*) from public.watchlist_items where user_id = :'A') = 0, 'B cannot see A''s private watchlist');
do $$ begin insert into public.watchlist_items (user_id, tmdb_id) values ('00000000-0000-0000-0000-00000000000a', 103); perform test.ok(false, 'B cannot add to A''s watchlist');
exception when insufficient_privilege then perform test.ok(true, 'B cannot add to A''s watchlist'); end $$;
with d as (delete from public.watchlist_items where user_id = '00000000-0000-0000-0000-00000000000a' returning 1) select test.ok((select count(*) from d) = 0, 'B cannot remove from A''s watchlist');
commit;
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
update public.profiles set watchlist_visibility = 'public' where id = auth.uid();
commit;
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'B')::text, true);
select test.ok((select count(*) from public.watchlist_items where user_id = :'A') = 2, 'once A makes it public, B can see A''s watchlist');
commit;
begin; set local role anon; select set_config('request.jwt.claims', '', true);
select test.ok((select count(*) from public.watchlist_items where user_id = :'A') = 2, 'a signed-out visitor can see a public watchlist');
commit;

-- ===== Diary =====
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
insert into public.diary_entries (user_id, tmdb_id, watched_on, rating, review, notes) values (auth.uid(), 101, current_date, 4.5, 'Loved it', 'seat F12');
do $$ begin insert into public.diary_entries (user_id, tmdb_id, watched_on, rating) values (auth.uid(), 101, current_date, 4.3); perform test.ok(false, 'ratings go in half stars');
exception when check_violation then perform test.ok(true, 'ratings go in half stars (4.3 is refused)'); end $$;
commit;
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'B')::text, true);
select test.ok((select count(*) from public.diary_entries) = 0, 'B cannot see A''s diary, reviews or private notes');
commit;
begin; set local role anon; select set_config('request.jwt.claims', '', true);
do $$ begin perform 1 from public.diary_entries; perform test.ok(false, 'signed-out visitors cannot read diaries');
exception when insufficient_privilege then perform test.ok(true, 'signed-out visitors cannot read diaries'); end $$;
commit;

-- ===== Collections =====
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
insert into public.movie_collections (owner_id, title, visibility, tags) values
  (auth.uid(), 'Secret shelf', 'private', '{secret}'), (auth.uid(), 'Link-only gems', 'unlisted', '{gems}'), (auth.uid(), 'Rainy Sundays', 'public', '{cosy,rain}');
do $$ begin insert into public.movie_collections (owner_id, title) values ('00000000-0000-0000-0000-00000000000b', 'Pretending to be B'); perform test.ok(false, 'A cannot create a collection as B');
exception when insufficient_privilege then perform test.ok(true, 'A cannot create a collection as B'); end $$;
commit;
insert into test.vars select 'priv', id::text from public.movie_collections where title = 'Secret shelf';
insert into test.vars select 'unl', id::text from public.movie_collections where title = 'Link-only gems';
insert into test.vars select 'pub', id::text from public.movie_collections where title = 'Rainy Sundays';
insert into test.vars select 'unl_share', share_id from public.movie_collections where title = 'Link-only gems';
insert into test.vars select 'priv_share', share_id from public.movie_collections where title = 'Secret shelf';
select test.ok((select published_at is not null from public.movie_collections where title = 'Rainy Sundays')
  and (select published_at is null from public.movie_collections where title = 'Secret shelf'), 'going public stamps a publish date; private ones have none');
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
insert into public.collection_items (collection_id, tmdb_id, position, added_by)
  select v.v::uuid, f.tmdb_id, f.tmdb_id - 100, auth.uid() from test.vars v cross join public.films f where v.k in ('priv', 'unl', 'pub') and f.tmdb_id <= 103;
commit;

begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'B')::text, true);
select test.ok((select count(*) from public.movie_collections where owner_id = :'A') = 1, 'B sees only A''s public collection, not the private or unlisted ones');
select test.ok((select count(*) from public.collection_items where collection_id = (select v::uuid from test.vars where k = 'priv')) = 0, 'B cannot read the films in A''s private collection');
select test.ok((select count(*) from public.collection_items where collection_id = (select v::uuid from test.vars where k = 'unl')) = 0, 'B cannot list the films in A''s unlisted collection without the link');
select test.ok((select count(*) from public.collection_items where collection_id = (select v::uuid from test.vars where k = 'pub')) = 3, 'B reads the films in A''s public collection');
select test.ok((select count(*) from public.movie_collections where search @@ plainto_tsquery('simple', 'gems')) = 0, 'search never finds unlisted collections');
select test.ok((select count(*) from public.movie_collections where search @@ plainto_tsquery('simple', 'secret')) = 0, 'search never finds private collections');
select test.ok((select count(*) from public.movie_collections where search @@ plainto_tsquery('simple', 'rainy')) = 1, 'search finds public collections');
select test.ok((select count(*) from public.get_collection_by_share((select v from test.vars where k = 'unl_share'))) = 1
  and (select count(*) from public.get_collection_items_by_share((select v from test.vars where k = 'unl_share'))) = 3, 'with the share link, B can open the unlisted collection and its films');
select test.ok((select count(*) from public.get_collection_by_share((select v from test.vars where k = 'priv_share'))) = 0
  and (select count(*) from public.get_collection_items_by_share((select v from test.vars where k = 'priv_share'))) = 0, 'a private collection''s link opens nothing for B');
with u as (update public.movie_collections set title = 'Mine now' where id = (select v::uuid from test.vars where k = 'pub') returning 1) select test.ok((select count(*) from u) = 0, 'B cannot rename A''s public collection');
with d as (delete from public.movie_collections where owner_id = :'A' returning 1) select test.ok((select count(*) from d) = 0, 'B cannot delete A''s collections');
do $$ begin insert into public.collection_items (collection_id, tmdb_id, position, added_by) select v::uuid, 104, 9, auth.uid() from test.vars where k = 'pub';
  perform test.ok(false, 'B cannot add films to A''s public collection');
exception when insufficient_privilege then perform test.ok(true, 'B cannot add films to A''s public collection'); end $$;
insert into public.collection_saves (user_id, collection_id) select auth.uid(), v::uuid from test.vars where k = 'pub';
select test.ok(true, 'B saves A''s public collection');
do $$ begin insert into public.collection_items (collection_id, tmdb_id, position, added_by) select v::uuid, 104, 9, auth.uid() from test.vars where k = 'pub';
  perform test.ok(false, 'saving gives B no edit rights');
exception when insufficient_privilege then perform test.ok(true, 'saving gives B no edit rights'); end $$;
do $$ begin insert into public.collection_saves (user_id, collection_id) select auth.uid(), v::uuid from test.vars where k = 'unl';
  perform test.ok(false, 'B cannot save an unlisted collection directly');
exception when insufficient_privilege then perform test.ok(true, 'B cannot save a collection that isn''t public'); end $$;
select test.ok(public.collection_save_count((select v::uuid from test.vars where k = 'pub')) = 1, 'the public save count is 1, from B''s real save');
select test.ok(public.collection_save_count((select v::uuid from test.vars where k = 'priv')) is null, 'no save count is given out for a private collection');
insert into test.vars values ('b_copy', public.copy_collection((select v from test.vars where k = 'unl_share')));
commit;
select test.ok((select owner_id = :'B' and visibility = 'private' and copied_from = (select v::uuid from test.vars where k = 'unl') from public.movie_collections where id = (select v::uuid from test.vars where k = 'b_copy'))
  and (select count(*) from public.collection_items where collection_id = (select v::uuid from test.vars where k = 'b_copy')) = 3, 'copying makes B a private, editable copy with all the films');
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
select test.ok((select count(*) from public.movie_collections where id = (select v::uuid from test.vars where k = 'b_copy')) = 0, 'A cannot see B''s private copy');
do $$ begin update public.movie_collections set owner_id = '00000000-0000-0000-0000-00000000000b' where id = (select v::uuid from test.vars where k = 'pub');
  perform test.ok(false, 'owners cannot hand a collection to someone else by editing owner_id');
exception when insufficient_privilege then perform test.ok(true, 'nobody can change a collection''s owner'); end $$;
-- A invites B to the private collection as a viewer.
insert into public.collection_collaborators (collection_id, user_id, role, invited_by) select v::uuid, :'B', 'viewer', auth.uid() from test.vars where k = 'priv';
commit;
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'B')::text, true);
select test.ok((select count(*) from public.movie_collections where id = (select v::uuid from test.vars where k = 'priv')) = 1
  and (select count(*) from public.collection_items where collection_id = (select v::uuid from test.vars where k = 'priv')) = 3, 'as a viewer, B can now see A''s private collection');
do $$ begin insert into public.collection_items (collection_id, tmdb_id, position, added_by) select v::uuid, 104, 9, auth.uid() from test.vars where k = 'priv';
  perform test.ok(false, 'viewers cannot add films');
exception when insufficient_privilege then perform test.ok(true, 'a viewer cannot add films'); end $$;
do $$ begin insert into public.collection_collaborators (collection_id, user_id, role, invited_by) select v::uuid, '00000000-0000-0000-0000-00000000000c', 'editor', auth.uid() from test.vars where k = 'priv';
  perform test.ok(false, 'collaborators cannot invite others');
exception when insufficient_privilege then perform test.ok(true, 'B cannot invite C (only owners invite)'); end $$;
commit;
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
update public.collection_collaborators set role = 'editor' where user_id = :'B';
commit;
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'B')::text, true);
insert into public.collection_items (collection_id, tmdb_id, position, added_by) select v::uuid, 104, 9, auth.uid() from test.vars where k = 'priv';
update public.collection_items set position = 0 where tmdb_id = 104 and collection_id = (select v::uuid from test.vars where k = 'priv');
select test.ok((select count(*) from public.collection_items where collection_id = (select v::uuid from test.vars where k = 'priv')) = 4, 'as an editor, B adds and reorders films');
with u as (update public.movie_collections set visibility = 'public' where id = (select v::uuid from test.vars where k = 'priv') returning 1) select test.ok((select count(*) from u) = 0, 'an editor cannot make A''s private collection public');
do $$ begin insert into public.collection_items (collection_id, tmdb_id, position, added_by) select v::uuid, 105, 10, '00000000-0000-0000-0000-00000000000a' from test.vars where k = 'priv';
  perform test.ok(false, 'editors cannot add films in someone else''s name');
exception when insufficient_privilege then perform test.ok(true, 'B cannot add a film credited to A'); end $$;
commit;
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'C')::text, true);
select test.ok((select count(*) from public.movie_collections where id = (select v::uuid from test.vars where k = 'priv')) = 0, 'C still cannot see A''s private collection');
select test.ok((select count(*) from public.collection_collaborators) = 0, 'C cannot see who collaborates on what');
commit;
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'B')::text, true);
delete from public.collection_collaborators where user_id = auth.uid();
select test.ok((select count(*) from public.movie_collections where id = (select v::uuid from test.vars where k = 'priv')) = 0, 'after leaving, B can no longer see the private collection');
commit;
begin; set local role anon; select set_config('request.jwt.claims', '', true);
select test.ok((select count(*) from public.movie_collections) = 1, 'signed-out visitors see only the one public collection');
do $$ begin perform public.copy_collection('anything'); perform test.ok(false, 'signed-out visitors cannot copy');
exception when insufficient_privilege then perform test.ok(true, 'signed-out visitors cannot copy collections'); end $$;
do $$ begin perform 1 from public.collection_saves; perform test.ok(false, 'signed-out visitors cannot read saves');
exception when insufficient_privilege then perform test.ok(true, 'signed-out visitors cannot read who saved what'); end $$;
commit;
