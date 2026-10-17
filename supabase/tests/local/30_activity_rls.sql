-- Screening Activity (0004): daily totals kept by the trigger, and who may see them.
-- A already logged Film One today (rated, reviewed, with a private note) in 10_library_rls.sql.
\set A '00000000-0000-0000-0000-00000000000a'
\set B '00000000-0000-0000-0000-00000000000b'
\set C '00000000-0000-0000-0000-00000000000c'

select test.ok((select activity_visibility from public.profiles where id = :'A') = 'private', 'Screening Activity starts private');
select test.ok((select watched = 1 and rated = 1 and reviewed = 1 from public.activity_days where user_id = :'A' and day = current_date), 'the trigger counted A''s rated, reviewed watch today');

-- A logs more, edits and deletes, as themselves.
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
insert into public.diary_entries (user_id, tmdb_id, watched_on, rating, review) values
  (auth.uid(), 104, current_date - 1, 4, null), (auth.uid(), 102, current_date - 1, null, '   '),
  (auth.uid(), 103, current_date - 3, null, null), (auth.uid(), 105, current_date - 20, 5, 'Tense');
select test.ok(public.screening_month(auth.uid(), current_date - 1, current_date) -> 'days' -> ((current_date - 1)::text) = '[2, 1, 0]'::jsonb, 'two watches yesterday, one rating, and a blank review is not a review');
update public.diary_entries set review = 'Funnier the second time' where tmdb_id = 102 and user_id = auth.uid();
select test.ok(public.screening_month(auth.uid(), current_date - 1, current_date) -> 'days' -> ((current_date - 1)::text) = '[2, 1, 1]'::jsonb, 'adding a review later counts on the watch day');
update public.diary_entries set watched_on = current_date - 4 where tmdb_id = 103 and user_id = auth.uid();
select test.ok(public.screening_month(auth.uid(), current_date - 3, current_date) -> 'days' -> ((current_date - 3)::text) is null
           and public.screening_month(auth.uid(), current_date - 4, current_date) -> 'days' -> ((current_date - 4)::text) = '[1, 0, 0]'::jsonb, 'moving a watch moves its seat, and an emptied day disappears');
delete from public.diary_entries where tmdb_id = 103 and user_id = auth.uid();
select test.ok(public.screening_month(auth.uid(), current_date - 4, current_date) -> 'days' -> ((current_date - 4)::text) is null, 'deleting the only watch of a day clears it');
do $$ begin perform 1 from public.activity_days; perform test.ok(false, 'activity_days is not directly readable');
exception when insufficient_privilege then perform test.ok(true, 'nobody reads activity_days directly, not even its owner'); end $$;
do $$ begin insert into public.activity_days (user_id, day, watched) values (auth.uid(), current_date, 99); perform test.ok(false, 'activity cannot be written directly');
exception when insufficient_privilege then perform test.ok(true, 'nobody can write activity totals directly (no inflating your seats)'); end $$;
select test.ok((public.screening_month(auth.uid(), current_date, current_date) ->> 'allowed')::boolean, 'A always sees their own activity');
select test.ok((public.screening_month(auth.uid(), current_date, current_date) ->> 'current')::int = 2, 'current streak: today and yesterday');
select test.ok(public.screening_day(auth.uid(), current_date) -> 0 ->> 'review' = 'Loved it', 'A sees their own reviews in the day panel');
select test.ok(not (public.screening_day(auth.uid(), current_date) -> 0 ? 'notes'), 'the day panel never includes private notes, even for the owner');
commit;

-- Private: B and signed-out visitors are refused, without learning whether A has any activity.
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'B')::text, true);
select test.ok(public.screening_month(:'A', current_date) = '{"allowed": false}'::jsonb, 'private: B gets only "not allowed", no counts');
select test.ok(public.screening_day(:'A', current_date) is null, 'private: B cannot open A''s days');
commit;
begin; set local role anon; select set_config('request.jwt.claims', '', true);
select test.ok(public.screening_month(:'A', current_date) = '{"allowed": false}'::jsonb, 'private: signed-out visitors are refused');
commit;

-- Friends: only people A follows who follow A back.
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
update public.profiles set activity_visibility = 'friends' where id = auth.uid();
insert into public.follows (follower_id, followee_id) values (auth.uid(), :'B');
commit;
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'B')::text, true);
select test.ok(not (public.screening_month(:'A', current_date) ->> 'allowed')::boolean, 'friends: A following B is not enough for B to see');
insert into public.follows (follower_id, followee_id) values (auth.uid(), :'A');
select test.ok((public.screening_month(:'A', current_date) ->> 'allowed')::boolean, 'friends: once they follow each other, B sees A''s activity');
select test.ok((public.screening_month(:'A', current_date) -> 'days' -> (current_date::text)) = '[1, 1, 1]'::jsonb, 'B sees today''s totals');
select test.ok(public.screening_month(:'A', current_date) ->> 'top_genre' is not null, 'the month''s top genre comes back');
select test.ok(jsonb_array_length(public.screening_day(:'A', current_date - 1)) = 2, 'B opens a day and sees both films');
do $$ begin update public.profiles set activity_visibility = 'public' where id = '00000000-0000-0000-0000-00000000000a';
  perform test.ok((select activity_visibility from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'friends', 'B cannot change A''s setting');
end $$;
commit;
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'C')::text, true);
insert into public.follows (follower_id, followee_id) values (auth.uid(), :'A');
select test.ok(not (public.screening_month(:'A', current_date) ->> 'allowed')::boolean, 'friends: C following A one way is refused');
commit;
begin; set local role anon; select set_config('request.jwt.claims', '', true);
select test.ok(not (public.screening_month(:'A', current_date) ->> 'allowed')::boolean, 'friends: signed-out visitors are refused');
commit;

-- Public: anyone, signed in or not.
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
update public.profiles set activity_visibility = 'public' where id = auth.uid();
commit;
begin; set local role anon; select set_config('request.jwt.claims', '', true);
select test.ok((public.screening_month(:'A', current_date - 20) -> 'days') ? ((current_date - 20)::text), 'public: signed-out visitors see any month (here, 20 days ago)');
select test.ok(public.screening_day(:'A', current_date) -> 0 ->> 'title' = 'Film One', 'public: and can open a day');
do $$ begin perform 1 from public.diary_entries; perform test.ok(false, 'diaries stay closed');
exception when insufficient_privilege then perform test.ok(true, 'public activity still doesn''t open the diary table itself'); end $$;
commit;
-- Back to private: access ends at once.
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
update public.profiles set activity_visibility = 'private' where id = auth.uid();
commit;
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'B')::text, true);
select test.ok(not (public.screening_month(:'A', current_date) ->> 'allowed')::boolean, 'switching back to private hides it from friends straight away');
commit;
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
select test.ok(public.screening_month(auth.uid(), current_date, current_date) -> 'titles' -> (current_date::text) = '["Film One"]'::jsonb, 'the month carries each day''s film titles for the tooltips');
commit;
