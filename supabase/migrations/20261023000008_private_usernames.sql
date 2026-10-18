-- New accounts now go straight into the app after signing up with a password, often without visiting profile setup.
-- So a new account's starting username no longer comes from its email address: it comes from the name the person
-- gave when signing up (if any), or "member", plus a random ending. Nothing from an email address is ever public.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  base text := left(regexp_replace(lower(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '[^a-z0-9_]', '', 'g'), 16);
  candidate text;
begin
  if char_length(base) < 3 then base := 'member'; end if;
  loop
    candidate := base || '_' || substr(md5(random()::text || clock_timestamp()::text), 1, 4);
    exit when not exists (select 1 from public.profiles p where p.username = candidate::extensions.citext);
  end loop;
  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 60), ''));
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
