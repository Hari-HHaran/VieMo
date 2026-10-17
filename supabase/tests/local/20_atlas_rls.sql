-- Row level security tests for 0003 SceneAtlas.
\set A '00000000-0000-0000-0000-00000000000a'
\set B '00000000-0000-0000-0000-00000000000b'

-- The server (service role) records a place with one checked claim and one unconfirmed candidate.
set role service_role;
insert into public.places (wikidata_qid, name, country, lat, lng, precision, kind)
values ('Q84', 'London', 'United Kingdom', 51.5074, -0.1278, 'city', 'on_location');
reset role;
insert into test.vars select 'place', id::text from public.places where wikidata_qid = 'Q84';
set role service_role;
insert into public.location_claims (tmdb_id, place_id, relation, status) select 101, v::uuid, 'filmed_at', 'verified' from test.vars where k = 'place';
insert into public.location_claims (tmdb_id, place_id, relation, status) select 102, v::uuid, 'filmed_at', 'candidate' from test.vars where k = 'place';
insert into public.claim_sources (claim_id, title, url, quote, method)
  select c.id, 'Film One (Wikipedia)', 'https://en.wikipedia.org/wiki/Film_One', 'Principal photography took place in London.', 'wikipedia' from public.location_claims c where c.tmdb_id = 101;
insert into public.claim_sources (claim_id, title, url, method)
  select c.id, 'A blog', 'https://example.com/guess', 'web' from public.location_claims c where c.tmdb_id = 102;
select test.ok(public.spend_ai_tokens(100, 150), 'the server can spend tokens under the daily cap');
select test.ok(not public.spend_ai_tokens(100, 150), 'the server is stopped at the daily cap');
reset role;

begin; set local role anon; select set_config('request.jwt.claims', '', true);
select test.ok((select count(*) from public.location_claims where tmdb_id = 101) = 1, 'everyone can read a verified filming location');
select test.ok((select count(*) from public.location_claims where tmdb_id = 102) = 0, 'unconfirmed candidates are never readable');
select test.ok((select count(*) from public.claim_sources) = 1, 'only the sources of checked claims are readable');
commit;
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, true);
do $$ begin insert into public.location_claims (tmdb_id, place_id, relation, status) select 103, v::uuid, 'filmed_at', 'verified' from test.vars where k = 'place';
  perform test.ok(false, 'people cannot add filming locations');
exception when insufficient_privilege then perform test.ok(true, 'people cannot add or verify filming locations themselves'); end $$;
do $$ begin perform 1 from public.research_jobs; perform test.ok(false, 'research jobs are server-only');
exception when insufficient_privilege then perform test.ok(true, 'research jobs are hidden from people'); end $$;
do $$ begin perform public.spend_ai_tokens(1, 1000000); perform test.ok(false, 'people cannot touch the AI budget');
exception when insufficient_privilege then perform test.ok(true, 'people cannot spend the AI budget'); end $$;
insert into public.location_passport (user_id, place_id, status) select auth.uid(), v::uuid, 'want' from test.vars where k = 'place';
commit;
begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', :'B')::text, true);
select test.ok((select count(*) from public.location_passport) = 0, 'B cannot see A''s Location Passport');
commit;
