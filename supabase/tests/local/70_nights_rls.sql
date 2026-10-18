-- Movie Night rooms (0007): members only, private votes, host-run stages, and room spins chosen once by the database.
\set A '00000000-0000-0000-0000-00000000000a'
\set B '00000000-0000-0000-0000-00000000000b'
\set C '00000000-0000-0000-0000-00000000000c'

-- A hosts; B joins by code; C never joins.
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
insert into public.watchlist_items (user_id, tmdb_id) values (auth.uid(), 101), (auth.uid(), 102), (auth.uid(), 103) on conflict do nothing;
create temp table made as select public.create_night('  Friday  ') as r;
select test.ok((select r ->> 'code' ~ '^[A-HJ-NP-Z2-9]{6}$' from made), 'a new room gets a six-character code without look-alike letters');
select test.ok((select title = 'Friday' and status = 'lobby' from public.movie_nights where id = (select (r ->> 'id')::uuid from made)), 'the host sees their room, in the lobby');
commit;
insert into test.vars select 'night', r ->> 'id' from made;
insert into test.vars select 'code', r ->> 'code' from made;
drop table made;

begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'C')::text, true);
select test.ok(not exists (select 1 from public.movie_nights), 'someone outside the room can''t see it');
select test.ok(public.night_state((select v::uuid from test.vars where k = 'night')) is null, 'nor read its state');
do $$ begin perform public.night_add((select v::uuid from test.vars where k = 'night'), array[104], 'search'); perform test.ok(false, 'outsider add');
exception when insufficient_privilege then perform test.ok(true, 'nor add films to it'); end $$;
do $$ begin insert into public.night_participants (night_id, user_id, role) values ((select v::uuid from test.vars where k = 'night'), auth.uid(), 'host'); perform test.ok(false, 'direct join');
exception when insufficient_privilege then perform test.ok(true, 'nobody can write themselves into a room directly'); end $$;
do $$ begin perform public.join_night('ZZZZZZ'); perform test.ok(false, 'bad code');
exception when no_data_found then perform test.ok(true, 'a wrong code finds no room'); end $$;
commit;

begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'B')::text, true);
select test.ok(public.join_night(lower((select v from test.vars where k = 'code'))) = (select v::uuid from test.vars where k = 'night'), 'B joins with the code (any case)');
select public.join_night((select v from test.vars where k = 'code'));
select test.ok((select count(*) from public.night_participants where night_id = (select v::uuid from test.vars where k = 'night')) = 2, 'joining twice doesn''t add B twice');
do $$ begin perform public.night_add((select v::uuid from test.vars where k = 'night'), array[101], 'watchlist'); perform test.ok(false, 'B watchlist');
exception when insufficient_privilege then perform test.ok(true, 'B can''t add from A''s watchlist as their own'); end $$;
do $$ begin perform public.night_add((select v::uuid from test.vars where k = 'night'), array[999999], 'search'); perform test.ok(false, 'unknown film');
exception when invalid_parameter_value then perform test.ok(true, 'a film the server hasn''t checked with TMDB is refused'); end $$;
select test.ok(public.night_add((select v::uuid from test.vars where k = 'night'), array[104, 105], 'search') = 2, 'B adds two films from search');
do $$ begin perform public.night_stage((select v::uuid from test.vars where k = 'night'), 'voting'); perform test.ok(false, 'guest stage');
exception when insufficient_privilege then perform test.ok(true, 'only the host moves the room to voting'); end $$;
commit;

begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
select test.ok(public.night_add((select v::uuid from test.vars where k = 'night'), array[101, 102, 103], 'watchlist') = 3, 'A adds three from their own watchlist');
select test.ok(public.night_add((select v::uuid from test.vars where k = 'night'), array[101], 'search') = 0, 'adding a film already in the pool changes nothing');
select public.night_remove((select v::uuid from test.vars where k = 'night'), 105);
select test.ok(not exists (select 1 from public.night_candidates where tmdb_id = 105), 'the host can take out a film a guest added');
select public.night_add((select v::uuid from test.vars where k = 'night'), array[105], 'search');
do $$ begin perform public.night_vote((select v::uuid from test.vars where k = 'night'), 101, true); perform test.ok(false, 'vote in lobby');
exception when object_not_in_prerequisite_state then perform test.ok(true, 'no votes before voting opens'); end $$;
select public.night_stage((select v::uuid from test.vars where k = 'night'), 'voting');
do $$ begin perform public.night_add((select v::uuid from test.vars where k = 'night'), array[104], 'search'); perform test.ok(false, 'locked');
exception when object_not_in_prerequisite_state then perform test.ok(true, 'the pool locks once voting starts'); end $$;
do $$ begin perform public.night_stage((select v::uuid from test.vars where k = 'night'), 'closed'); perform test.ok(false, 'bad transition');
exception when object_not_in_prerequisite_state then perform test.ok(true, 'stages only move in the allowed order'); end $$;
-- A: yes to 101, 102, 104; no to 103, 105.
select public.night_vote((select v::uuid from test.vars where k = 'night'), t, t in (101, 102, 104)) from unnest(array[101, 102, 103, 104, 105]) t;
commit;

begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'B')::text, true);
select test.ok(not exists (select 1 from public.night_votes where user_id = :'A'), 'B can''t read A''s votes');
create temp table st as select public.night_state((select v::uuid from test.vars where k = 'night')) as s;
select test.ok((select s -> 'shortlist' = 'null'::jsonb and not exists (select 1 from jsonb_array_elements(s -> 'candidates') c where c ->> 'yes' is not null) from st), 'while voting, nobody sees totals or the shortlist');
select test.ok((select (p ->> 'votes_cast')::int = 5 from st, jsonb_array_elements(s -> 'participants') p where p ->> 'user_id' = :'A'), 'only how many votes each person has cast');
select test.ok((select s::text !~ '"vote"' from st), 'and no individual vote appears anywhere in the state');
drop table st;
-- B: yes to 101, 104; no to the rest.
select public.night_vote((select v::uuid from test.vars where k = 'night'), t, t in (101, 104)) from unnest(array[101, 102, 103, 104, 105]) t;
select public.night_vote((select v::uuid from test.vars where k = 'night'), 102, false);
select test.ok((select count(*) from public.night_votes where night_id = (select v::uuid from test.vars where k = 'night')) = 5, 'changing a vote replaces it; B sees only their own five');
do $$ begin perform public.night_stage((select v::uuid from test.vars where k = 'night'), 'results'); perform test.ok(false, 'guest results');
exception when insufficient_privilege then perform test.ok(true, 'only the host shows the results'); end $$;
commit;

begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
do $$ begin perform public.spin_night(gen_random_uuid(), (select v::uuid from test.vars where k = 'night'), 'decider', array[101, 104]); perform test.ok(false, 'decider early');
exception when object_not_in_prerequisite_state then perform test.ok(true, 'Match Decider waits for the results'); end $$;
select public.night_stage((select v::uuid from test.vars where k = 'night'), 'results');
create temp table st as select public.night_state((select v::uuid from test.vars where k = 'night')) as s;
select test.ok((select array(select x::int from jsonb_array_elements_text(s -> 'shortlist') x order by 1) = array[101, 104] from st), 'the shortlist is exactly the films both said yes to');
select test.ok((select (c ->> 'yes')::int = 1 and (c ->> 'no')::int = 1 from st, jsonb_array_elements(s -> 'candidates') c where (c ->> 'tmdb_id')::int = 102), 'totals appear after results, without names');
drop table st;
do $$ begin perform public.spin_night(gen_random_uuid(), (select v::uuid from test.vars where k = 'night'), 'decider', array[101, 102, 104]); perform test.ok(false, 'decider extra');
exception when insufficient_privilege then perform test.ok(true, 'Match Decider refuses a film someone said no to'); end $$;
do $$ begin perform public.spin_night(gen_random_uuid(), (select v::uuid from test.vars where k = 'night'), 'decider', array[101]); perform test.ok(false, 'decider short');
exception when insufficient_privilege then perform test.ok(true, 'and refuses leaving out an accepted film'); end $$;
do $$ begin perform public.spin_night(gen_random_uuid(), (select v::uuid from test.vars where k = 'night'), 'group', array[101, 4242]); perform test.ok(false, 'outside pool');
exception when insufficient_privilege then perform test.ok(true, 'a group wheel can''t include films outside the room''s pool'); end $$;
insert into test.vars values ('nreq', gen_random_uuid()::text);
create temp table sp as select public.spin_night((select v::uuid from test.vars where k = 'nreq'), (select v::uuid from test.vars where k = 'night'), 'decider', array[104, 101]) as r;
select test.ok((select (r ->> 'winner_tmdb_id')::int in (101, 104) and r ->> 'mode' = 'decider' from sp), 'Match Decider picks between the accepted films');
select test.ok((select count(distinct (public.spin_night((select v::uuid from test.vars where k = 'nreq'), (select v::uuid from test.vars where k = 'night'), 'decider', array[104, 101]) ->> 'winner_tmdb_id')) = 1 from generate_series(1, 5)), 'a repeated request (a reconnect) gets the same winner');
do $$ begin perform public.spin_night(gen_random_uuid(), (select v::uuid from test.vars where k = 'night'), 'group', array[101, 102]); perform test.ok(false, 'two active');
exception when unique_violation then perform test.ok(true, 'a second spin can''t start while one is still turning'); end $$;
commit;
insert into test.vars select 'nspin', r ->> 'id' from sp;
insert into test.vars select 'nwin', r ->> 'winner_tmdb_id' from sp;

begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'B')::text, true);
select test.ok((select s -> 'spin' ->> 'id' = (select v from test.vars where k = 'nspin') and s -> 'spin' ->> 'winner_tmdb_id' = (select v from test.vars where k = 'nwin')
  from (select public.night_state((select v::uuid from test.vars where k = 'night')) s) x), 'B sees the same spin and the same winner');
do $$ begin perform public.spin_night(gen_random_uuid(), (select v::uuid from test.vars where k = 'night'), 'group', array[101, 102]); perform test.ok(false, 'guest spin');
exception when insufficient_privilege then perform test.ok(true, 'only the host spins for the room'); end $$;
do $$ begin perform public.spin_night((select v::uuid from test.vars where k = 'nreq'), (select v::uuid from test.vars where k = 'night'), 'decider', array[101, 104]); perform test.ok(false, 'guest replay');
exception when insufficient_privilege then perform test.ok(true, 'nor replays the host''s request'); end $$;
do $$ begin perform public.night_confirm((select v::uuid from test.vars where k = 'night'), 101, 'host'); perform test.ok(false, 'guest confirm');
exception when insufficient_privilege then perform test.ok(true, 'only the host confirms the film'); end $$;
commit;

begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'C')::text, true);
select test.ok(not exists (select 1 from public.wheel_spins where night_id = (select v::uuid from test.vars where k = 'night')), 'someone outside the room can''t see its spins');
commit;

-- Ten seconds later: the earlier spin has finished turning, so a new one may start.
update public.wheel_spins set created_at = now() - interval '10 seconds' where id = (select v::uuid from test.vars where k = 'nspin');
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
select test.ok((public.spin_night(gen_random_uuid(), (select v::uuid from test.vars where k = 'night'), 'group', array[101, 102, 103]) ->> 'winner_tmdb_id')::int in (101, 102, 103), 'after the first spin ends, the host can spin a group wheel');
select test.ok((select status = 'revealed' from public.wheel_spins where id = (select v::uuid from test.vars where k = 'nspin')), 'and the finished spin counts as revealed');
do $$ begin perform public.night_confirm((select v::uuid from test.vars where k = 'night'), case (select v from test.vars where k = 'nwin') when '101' then 104 else 101 end, 'decider', (select v::uuid from test.vars where k = 'nspin'));
  perform test.ok(false, 'wrong film for spin'); exception when insufficient_privilege then perform test.ok(true, 'a spin can''t be confirmed as a film it didn''t choose'); end $$;
select public.night_confirm((select v::uuid from test.vars where k = 'night'), (select v::int from test.vars where k = 'nwin'), 'decider', (select v::uuid from test.vars where k = 'nspin'));
select test.ok((select status = 'closed' and pick_tmdb_id = (select v::int from test.vars where k = 'nwin') from public.movie_nights where id = (select v::uuid from test.vars where k = 'night')), 'confirming closes the room with tonight''s film');
select test.ok((select jsonb_array_length(public.my_nights()) = 1 and public.my_nights() -> 0 ->> 'pick' is not null), 'the room and its film appear in the host''s history');
commit;

begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'C')::text, true);
do $$ begin perform public.join_night((select v from test.vars where k = 'code')); perform test.ok(false, 'join closed');
exception when no_data_found then perform test.ok(true, 'a closed room can''t be joined'); end $$;
select test.ok(public.my_nights() = '[]'::jsonb, 'C has no rooms');
commit;

begin; set local role anon; select set_config('request.jwt.claims', '', true);
do $$ begin perform public.create_night('x'); perform test.ok(false, 'anon create');
exception when insufficient_privilege then perform test.ok(true, 'signed-out visitors can''t open rooms'); end $$;
commit;
delete from public.movie_nights where id = (select v::uuid from test.vars where k = 'night');
