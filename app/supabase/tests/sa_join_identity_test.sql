-- Exercises sa_join's identity rules on the real database without leaving a trace:
-- run it after any not-yet-applied migrations in the same transaction, which this file rolls back.
--   (echo 'begin;'; cat <pending migrations> supabase/tests/sa_join_identity_test.sql) \
--     | ssh <box> 'docker exec -i openship-supabase-db psql -U postgres -X -A -t -v ON_ERROR_STOP=1'
-- On its own it opens the transaction itself. Every check prints "ok ..." or "FAIL ..."; the run ends with ROLLBACK.
begin;

create function pg_temp.expect_error(q text, want text) returns text language plpgsql as $$
begin
  execute q;
  return 'FAIL no error: ' || q;
exception when others then
  if position(want in sqlerrm) > 0 then return 'ok   rejects: ' || sqlerrm; end if;
  return 'FAIL wrong error "' || sqlerrm || '" for: ' || q;
end $$;
create function pg_temp.check(label text, cond boolean) returns text language sql as $$
  select case when cond then 'ok   ' else 'FAIL ' end || label
$$;
create function pg_temp.join_as(uid uuid) returns public.sa_members language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  return public.sa_join();
end $$;

-- Everyone already in the workspace, before any of them signs in again.
create temp table members_before on commit drop as select * from public.sa_members;
create temp table grants_before on commit drop as select * from public.sa_role_grants;

-- Throwaway accounts:
--   b1 a GitHub user with no grant
--   b2 an email account whose self-editable metadata claims to be errrks, with errrks' avatar
--   b3 an email account claiming ThomasGarrison through preferred_username only
--   b4 a GitHub user whose metadata was rewritten after sign-in to claim errrks
--   b5 a GitHub user granted core by login before signing in
--   b6 a different GitHub account holding b5's login later (renamed, then registered again)
--   b7 a GitHub user granted core by id under an old login, since renamed
insert into auth.users (id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000b1', 'authenticated', 'authenticated', 'sa-test-gh@example.invalid',
   '{"user_name": "sa-test-gh", "full_name": "SA Test", "avatar_url": "https://example.invalid/b1.png"}', '{"provider": "github"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'sa-test-spoof@example.invalid',
   '{"user_name": "errrks", "preferred_username": "errrks", "full_name": "Not Erick", "avatar_url": "https://avatars.githubusercontent.com/u/113721398?v=4"}', '{"provider": "email"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b3', 'authenticated', 'authenticated', 'sa-test-spoof2@example.invalid',
   '{"preferred_username": "ThomasGarrison"}', '{"provider": "email"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b4', 'authenticated', 'authenticated', 'sa-test-real@example.invalid',
   '{"user_name": "errrks", "preferred_username": "errrks", "full_name": "Real Name"}', '{"provider": "github"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b5', 'authenticated', 'authenticated', 'sa-test-granted@example.invalid',
   '{"user_name": "sa-test-granted"}', '{"provider": "github"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b6', 'authenticated', 'authenticated', 'sa-test-taker@example.invalid',
   '{"user_name": "sa-test-granted"}', '{"provider": "github"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b7', 'authenticated', 'authenticated', 'sa-test-renamed@example.invalid',
   '{}', '{"provider": "github"}', now(), now());
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
  ('999000101', '00000000-0000-4000-8000-0000000000b1',
   '{"sub": "999000101", "user_name": "sa-test-gh", "full_name": "SA Test", "avatar_url": "https://example.invalid/b1.png"}', 'github', now(), now(), now()),
  ('999000104', '00000000-0000-4000-8000-0000000000b4',
   '{"sub": "999000104", "user_name": "sa-test-real", "avatar_url": "https://example.invalid/b4.png"}', 'github', now(), now(), now()),
  ('999000105', '00000000-0000-4000-8000-0000000000b5', '{"sub": "999000105", "user_name": "sa-test-granted"}', 'github', now(), now(), now()),
  ('999000106', '00000000-0000-4000-8000-0000000000b6', '{"sub": "999000106", "user_name": "sa-test-granted"}', 'github', now(), now(), now()),
  ('999000107', '00000000-0000-4000-8000-0000000000b7', '{"sub": "999000107", "user_name": "sa-test-renamed"}', 'github', now(), now(), now());
insert into public.sa_role_grants (github, role) values ('sa-test-granted', 'core');
insert into public.sa_role_grants (github, role, github_id) values ('sa-test-oldname', 'core', '999000107');

-- Signed out.
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select pg_temp.expect_error($q$select public.sa_join()$q$, 'Sign in first');
select pg_temp.expect_error($q$select * from public.sa_github('11111111-1111-1111-1111-111111111111')$q$, 'permission denied');
reset role;

-- The spoofer, through the API's role.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);
select pg_temp.check('metadata claiming errrks joins as a plain member, with no GitHub login and no borrowed avatar',
  role = 'member' and github is null and avatar_url is null and display_name = 'Not Erick') from public.sa_join();
select pg_temp.expect_error($q$select * from public.sa_github('00000000-0000-4000-8000-0000000000b2')$q$, 'permission denied');
select pg_temp.expect_error($q$update public.sa_members set role = 'lead' where user_id = auth.uid()$q$, 'permission denied');
select pg_temp.expect_error($q$update public.sa_role_grants set github_id = null$q$, 'permission denied');
select pg_temp.expect_error($q$insert into public.sa_role_grants (github, role) values ('mallory', 'lead')$q$, 'permission denied');
select pg_temp.expect_error($q$select public.sa_set_role(auth.uid(), 'lead')$q$, 'Only a lead');
reset role;

-- The spoofer joined first and rewrites their metadata afterwards: still nobody.
update auth.users set raw_user_meta_data = '{"user_name": "thomasgarrison", "preferred_username": "thomasgarrison"}' where id = '00000000-0000-4000-8000-0000000000b2';
select pg_temp.check('rewriting metadata after joining changes nothing',
  role = 'member' and github is null) from pg_temp.join_as('00000000-0000-4000-8000-0000000000b2');
select pg_temp.check('preferred_username in another case claims nothing',
  role = 'member' and github is null and display_name = 'sa-test-spoof2') from pg_temp.join_as('00000000-0000-4000-8000-0000000000b3');

-- Real GitHub accounts.
select pg_temp.check('a GitHub user joins as a member under the login, name and avatar GitHub has',
  role = 'member' and github = 'sa-test-gh' and display_name = 'SA Test' and avatar_url = 'https://example.invalid/b1.png')
  from pg_temp.join_as('00000000-0000-4000-8000-0000000000b1');
select pg_temp.check('a GitHub user whose metadata claims errrks keeps their own login and no role',
  role = 'member' and github = 'sa-test-real' and avatar_url = 'https://example.invalid/b4.png' and display_name = 'Real Name')
  from pg_temp.join_as('00000000-0000-4000-8000-0000000000b4');
select pg_temp.check('a grant by login applies when that GitHub user first joins',
  role = 'core' and github = 'sa-test-granted') from pg_temp.join_as('00000000-0000-4000-8000-0000000000b5');
select pg_temp.check('the used grant is pinned to that GitHub account',
  github_id = '999000105') from public.sa_role_grants where github = 'sa-test-granted';
select pg_temp.check('another GitHub account that later holds the login gets nothing',
  role = 'member' and github = 'sa-test-granted') from pg_temp.join_as('00000000-0000-4000-8000-0000000000b6');
select pg_temp.check('a pinned grant follows its GitHub account through a rename',
  role = 'core' and github = 'sa-test-renamed') from pg_temp.join_as('00000000-0000-4000-8000-0000000000b7');
update public.sa_members set role = 'member' where user_id = '00000000-0000-4000-8000-0000000000b5';
select pg_temp.check('joining again keeps the role a lead set instead of granting it again',
  role = 'member') from pg_temp.join_as('00000000-0000-4000-8000-0000000000b5');

-- Everyone already in the workspace signs in again under the new rules.
select count(r.user_id) as rejoined from members_before b cross join lateral pg_temp.join_as(b.user_id) r \gset
select pg_temp.check(format('all %s existing members sign in again', :rejoined), :rejoined = (select count(*) from members_before));
select pg_temp.check('existing members keep their role, GitHub login, name and avatar',
  not exists (
    select 1 from members_before b join public.sa_members m using (user_id)
    where (m.role, m.github, m.display_name, m.avatar_url) is distinct from (b.role, b.github, b.display_name, b.avatar_url)));
select 'info changed: ' || coalesce(string_agg(format('%s %s→%s %s→%s', b.display_name, b.github, m.github, b.role, m.role), '; '), 'none')
  from members_before b join public.sa_members m using (user_id)
  where (m.role, m.github, m.display_name, m.avatar_url) is distinct from (b.role, b.github, b.display_name, b.avatar_url);
select pg_temp.check('every lead has the GitHub identity its grant names',
  not exists (
    select 1 from public.sa_members m
    where m.role = 'lead' and not exists (
      select 1 from public.sa_role_grants g join auth.identities i on i.provider = 'github' and i.provider_id = g.github_id
      where i.user_id = m.user_id and g.role = 'lead')));
select 'info leads: ' || string_agg(github, ', ' order by github) from public.sa_members where role = 'lead';
select pg_temp.check('grants already used are pinned to the GitHub account holding the login',
  not exists (
    select 1 from grants_before g0 join public.sa_role_grants g using (github)
    join auth.identities i on i.provider = 'github' and lower(i.identity_data->>'user_name') = lower(g.github)
    join members_before m on m.user_id = i.user_id
    where g.github_id is distinct from i.provider_id));
select 'info grants: ' || string_agg(format('%s=%s', github, coalesce(github_id, 'unpinned')), ', ' order by github) from public.sa_role_grants where github not like 'sa-test-%';

-- Who may call what.
select pg_temp.check('the API roles can call sa_join but not the identity helper',
  has_function_privilege('authenticated', 'public.sa_join()', 'execute')
  and not has_function_privilege('authenticated', 'public.sa_github(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.sa_github(uuid)', 'execute'));

rollback;
