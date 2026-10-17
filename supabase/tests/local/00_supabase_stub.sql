-- A small stand-in for the parts of Supabase the migrations rely on, so they can be tested on plain Postgres:
-- the anon / authenticated / service_role roles, auth.users, auth.uid() and Supabase's permissive default grants.
-- Local testing only; never run this on a real Supabase project.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}');
create function auth.uid() returns uuid language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub', '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
create schema if not exists extensions;
grant usage on schema public, extensions to anon, authenticated, service_role;
-- Supabase grants everything in public to these roles by default; the migrations must take it back.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

create schema test;
grant usage on schema test to anon, authenticated, service_role;
create function test.ok(cond boolean, msg text) returns void language plpgsql as $$
begin raise notice '%', case when coalesce(cond, false) then 'PASS ' else 'FAIL ' end || msg; end $$;
grant execute on function test.ok(boolean, text) to anon, authenticated, service_role;
