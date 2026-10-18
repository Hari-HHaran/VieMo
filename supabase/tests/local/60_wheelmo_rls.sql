-- WheelMo (0006): winners chosen by the database, from the shown pool only, fairly, once per request.
\set A '00000000-0000-0000-0000-00000000000a'
\set B '00000000-0000-0000-0000-00000000000b'

-- A's account watchlist and two of A's collections (one public, one private).
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
insert into public.watchlist_items (user_id, tmdb_id) values (auth.uid(), 101), (auth.uid(), 102), (auth.uid(), 103) on conflict do nothing;
insert into public.movie_collections (owner_id, title, visibility) values (auth.uid(), 'Wheel public', 'public'), (auth.uid(), 'Wheel private', 'private');
insert into public.collection_items (collection_id, tmdb_id, position, added_by)
  select c.id, f.t, f.n, auth.uid() from public.movie_collections c, (values (101, 0), (104, 1), (105, 2)) f(t, n) where c.owner_id = auth.uid() and c.title like 'Wheel %';
commit;
insert into test.vars select 'wpub', share_id from public.movie_collections where title = 'Wheel public';
insert into test.vars select 'wpriv', share_id from public.movie_collections where title = 'Wheel private';
insert into test.vars values ('req1', gen_random_uuid()::text);

begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
create temp table s1 as select public.spin_wheel((select v::uuid from test.vars where k = 'req1'), 'watchlist', 'account', array[101, 102, 103]) as r;
select test.ok((select (r ->> 'winner_tmdb_id')::int = any (array[101, 102, 103]) from s1), 'the winner is one of the films shown');
select test.ok((select r -> 'pool' -> 0 ->> 'title' = 'Film One' and jsonb_array_length(r -> 'pool') = 3 from s1), 'the saved pool is the films shown, with details from the films table');
select test.ok((select r ->> 'selection' = 'uniform' and r ->> 'status' = 'spinning' from s1), 'the spin is saved as spinning, uniform selection disclosed');
create temp table again as select public.spin_wheel((select v::uuid from test.vars where k = 'req1'), 'watchlist', 'account', array[101, 102, 103]) as r from generate_series(1, 5);
select test.ok((select count(distinct r ->> 'winner_tmdb_id') = 1 and bool_and((r ->> 'repeat')::boolean) from again)
           and (select (r ->> 'winner_tmdb_id') from again limit 1) = (select r ->> 'winner_tmdb_id' from s1), 'repeating the same request returns the same winner, never a new roll');
select test.ok((select count(*) from public.wheel_spins where request_id = (select v::uuid from test.vars where k = 'req1')) = 1, 'and no duplicate spin is saved');
do $$ begin perform public.spin_wheel(gen_random_uuid(), 'watchlist', 'account', array[101, 104]); perform test.ok(false, 'pool must be on the watchlist');
exception when insufficient_privilege then perform test.ok(true, 'a film that is not on your watchlist is refused'); end $$;
do $$ begin perform public.spin_wheel(gen_random_uuid(), 'surprise', 'x', array[101, 101, 102]); perform test.ok(false, 'duplicates');
exception when invalid_parameter_value then perform test.ok(true, 'duplicate films in a pool are refused'); end $$;
do $$ begin perform public.spin_wheel(gen_random_uuid(), 'surprise', 'x', array[101]); perform test.ok(false, 'one film');
exception when invalid_parameter_value then perform test.ok(true, 'a one-film wheel is refused'); end $$;
do $$ begin perform public.spin_wheel(gen_random_uuid(), 'surprise', 'x', array[101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113]); perform test.ok(false, '13 films');
exception when invalid_parameter_value then perform test.ok(true, 'more than 12 films is refused'); end $$;
do $$ begin perform public.spin_wheel(gen_random_uuid(), 'surprise', 'x', array[101, 999999]); perform test.ok(false, 'unknown film');
exception when invalid_parameter_value then perform test.ok(true, 'a film that isn''t a stored TMDB film is refused (nothing is invented)'); end $$;
do $$ begin insert into public.wheel_spins (request_id, user_id, mode, source, pool, pool_ids, winner_index, winner_tmdb_id) values (gen_random_uuid(), auth.uid(), 'surprise', 'x', '[{},{}]', array[101, 102], 0, 101);
  perform test.ok(false, 'direct insert'); exception when insufficient_privilege then perform test.ok(true, 'nobody can write a spin (or its winner) directly'); end $$;
do $$ begin perform public.wheel_pick(3); perform test.ok(false, 'wheel_pick private');
exception when insufficient_privilege then perform test.ok(true, 'the random picker can''t be called directly'); end $$;
select public.wheel_reveal((select (r ->> 'id')::uuid from s1));
select test.ok((select status = 'revealed' from public.wheel_spins where request_id = (select v::uuid from test.vars where k = 'req1')), 'the owner marks their spin revealed');
commit;

-- B: someone else's spins and collections.
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'B')::text, true);
select test.ok(not exists (select 1 from public.wheel_spins where user_id = :'A'), 'B cannot see A''s spins');
do $$ begin perform public.spin_wheel((select v::uuid from test.vars where k = 'req1'), 'watchlist', 'account', array[101, 102, 103]); perform test.ok(false, 'request reuse');
exception when insufficient_privilege then perform test.ok(true, 'B cannot replay A''s request id'); end $$;
select test.ok((public.spin_wheel(gen_random_uuid(), 'playlist', (select v from test.vars where k = 'wpub'), array[101, 104, 105]) ->> 'winner_tmdb_id')::int in (101, 104, 105), 'B spins A''s public collection');
do $$ begin perform public.spin_wheel(gen_random_uuid(), 'playlist', (select v from test.vars where k = 'wpriv'), array[101, 104]); perform test.ok(false, 'private collection');
exception when insufficient_privilege then perform test.ok(true, 'B cannot spin A''s private collection'); end $$;
do $$ begin perform public.spin_wheel(gen_random_uuid(), 'playlist', (select v from test.vars where k = 'wpub'), array[101, 102]); perform test.ok(false, 'film not in collection');
exception when insufficient_privilege then perform test.ok(true, 'films outside the collection can''t be slipped into its wheel'); end $$;
do $$ begin perform public.spin_wheel(gen_random_uuid(), 'watchlist', 'account', array[101, 102]); perform test.ok(false, 'B watchlist');
exception when insufficient_privilege then perform test.ok(true, 'B cannot spin A''s watchlist as their own'); end $$;
select public.wheel_reveal((select id from public.wheel_spins where request_id = (select v::uuid from test.vars where k = 'req1')));
commit;

begin; set local role anon; select set_config('request.jwt.claims', '', true);
do $$ begin perform public.spin_wheel(gen_random_uuid(), 'surprise', 'x', array[101, 102]); perform test.ok(false, 'anon direct');
exception when insufficient_privilege then perform test.ok(true, 'signed-out visitors can''t call the spin directly (the server does it for them)'); end $$;
commit;

-- The server, for a signed-out visitor
set role service_role;
select test.ok((public.spin_wheel_service(gen_random_uuid(), 'playlist', (select v from test.vars where k = 'wpub'), array[101, 104]) ->> 'user_id') is null, 'the server spins a public collection for a visitor');
do $$ begin perform public.spin_wheel_service(gen_random_uuid(), 'playlist', (select v from test.vars where k = 'wpriv'), array[101, 104]); perform test.ok(false, 'service private');
exception when insufficient_privilege then perform test.ok(true, 'not even the server spins a private collection for a visitor'); end $$;
-- Fairness: 6,000 spins of a three-film wheel. Each film should win about 2,000 times; 5 standard deviations is ±183.
create temp table fair as select (public.spin_wheel_service(gen_random_uuid(), 'surprise', 'fairness', array[101, 102, 103]) ->> 'winner_tmdb_id')::int as w from generate_series(1, 6000);
reset role;
select test.ok((select bool_and(n between 1817 and 2183) and count(*) = 3 from (select count(*) n from fair group by w) x), 'over 6,000 spins every film wins within 5 standard deviations of a third: ' || (select string_agg(w || '=' || n, ', ' order by w) from (select w, count(*) n from fair group by w) x));
select test.ok(not exists (select 1 from public.wheel_spins s where not (s.winner_tmdb_id = any (s.pool_ids))), 'every saved winner is in its saved pool');
do $$ begin update public.wheel_spins set winner_tmdb_id = 104 where id = (select id from public.wheel_spins limit 1); perform test.ok(false, 'constraint');
exception when check_violation then perform test.ok(true, 'the database itself refuses a winner outside the pool'); end $$;
delete from public.wheel_spins where source = 'fairness';
