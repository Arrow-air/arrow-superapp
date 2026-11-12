-- Exercises the contributor registry (20261112000000_sa_registry.sql) on the real database without leaving a trace:
-- run it after the migration in the same transaction, which this file rolls back.
--   (echo 'begin;'; cat supabase/migrations/20261112000000_sa_registry.sql supabase/tests/sa_registry_test.sql) \
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
  select case when coalesce(cond, false) then 'ok   ' else 'FAIL ' end || label
$$;
create function pg_temp.cant_read(t text) returns text language plpgsql as $$
begin
  execute format('select count(*) from public.%I', t);
  return 'FAIL ' || current_user || ' can read ' || t;
exception when insufficient_privilege then
  return 'ok   ' || current_user || ' can''t read ' || t;
end $$;
create function pg_temp.as_user(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true)
$$;

\set c1 '00000000-0000-4000-8000-0000000000c1'
\set c2 '00000000-0000-4000-8000-0000000000c2'
\set c3 '00000000-0000-4000-8000-0000000000c3'
\set c4 '00000000-0000-4000-8000-0000000000c4'
\set c5 '00000000-0000-4000-8000-0000000000c5'
\set c6 '00000000-0000-4000-8000-0000000000c6'
\set c7 '00000000-0000-4000-8000-0000000000c7'
\set c8 '00000000-0000-4000-8000-0000000000c8'
\set c9 '00000000-0000-4000-8000-0000000000c9'
\set c10 '00000000-0000-4000-8000-00000000c010'
\set c11 '00000000-0000-4000-8000-00000000c011'

-- Throwaway accounts:
--   c1 a lead, c2 and c11 core, c3 a member, c4 signed in but not a workspace member
--   c5 the GitHub account the team resolved for "Kenji" (and later a member)
--   c6 a different GitHub account now holding the login of a record the team resolved to another id
--   c7 email only, confirmed by the link it was sent: the email on "Rosa"'s record
--   c8 email only, confirmed without any email sent: the email on "Ade"'s record
--   c9 a Discord account whose id is on "Kenji"'s record, after c5 claimed it
--   c10 a GitHub account with the same name as "Lena", whom the team added without ids
insert into auth.users (id, aud, role, email, confirmation_sent_at, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at) values
  (:'c1', 'authenticated', 'authenticated', 'sa-reg-lead@example.invalid', null, now(), '{}', '{"provider": "github"}', now(), now()),
  (:'c2', 'authenticated', 'authenticated', 'sa-reg-core@example.invalid', null, now(), '{}', '{"provider": "email"}', now(), now()),
  (:'c3', 'authenticated', 'authenticated', 'sa-reg-member@example.invalid', null, now(), '{}', '{"provider": "email"}', now(), now()),
  (:'c4', 'authenticated', 'authenticated', 'sa-reg-outsider@example.invalid', null, now(), '{}', '{"provider": "email"}', now(), now()),
  (:'c5', 'authenticated', 'authenticated', 'sa-reg-kenji@example.invalid', null, now(), '{}', '{"provider": "github"}', now(), now()),
  (:'c6', 'authenticated', 'authenticated', 'sa-reg-taker@example.invalid', null, now(), '{"user_name": "sa-reg-renamed"}', '{"provider": "github"}', now(), now()),
  (:'c7', 'authenticated', 'authenticated', 'sa-reg-rosa@example.invalid', now() - interval '1 hour', now(), '{}', '{"provider": "email"}', now(), now()),
  (:'c8', 'authenticated', 'authenticated', 'sa-reg-ade@example.invalid', null, now(), '{"full_name": "Ade B"}', '{"provider": "email"}', now(), now()),
  (:'c9', 'authenticated', 'authenticated', 'sa-reg-discord@example.invalid', null, now(), '{}', '{"provider": "discord"}', now(), now()),
  (:'c10', 'authenticated', 'authenticated', 'sa-reg-lena@example.invalid', null, now(), '{}', '{"provider": "github"}', now(), now()),
  (:'c11', 'authenticated', 'authenticated', 'sa-reg-core2@example.invalid', null, now(), '{}', '{"provider": "email"}', now(), now());
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
  ('999200001', :'c1', '{"sub": "999200001", "user_name": "sa-reg-lead", "full_name": "Sa Reg Lead"}', 'github', now(), now(), now()),
  ('999200005', :'c5', '{"sub": "999200005", "user_name": "sa-reg-kenji-new", "full_name": "K. Mori"}', 'github', now(), now(), now()),
  ('999200006', :'c6', '{"sub": "999200006", "user_name": "sa-reg-renamed", "full_name": "Someone Else"}', 'github', now(), now(), now()),
  ('999300001', :'c9', '{"sub": "999300001", "full_name": "sa.reg.kenji", "name": "sa.reg.kenji#0"}', 'discord', now(), now(), now()),
  ('999200010', :'c10', '{"sub": "999200010", "user_name": "sa-reg-lena-gh", "full_name": "Sa Reg Lena"}', 'github', now(), now(), now());
insert into public.sa_members (user_id, display_name, role) values
  (:'c1', 'Sa Reg Lead', 'lead'), (:'c2', 'Sa Reg Core', 'core'), (:'c11', 'Sa Reg Core Two', 'core'), (:'c3', 'Sa Reg Member', 'member'),
  (:'c5', 'K. Mori', 'member'), (:'c8', 'Ade B', 'member'), (:'c10', 'Sa Reg Lena', 'member');

-- The tables and who may touch them --------------------------------------
select pg_temp.check('RLS is on for every registry table, with no policies and no grants to the API roles',
  (select bool_and(relrowsecurity) and count(*) = 8 from pg_class where relnamespace = 'public'::regnamespace and relname in
    ('sa_people', 'sa_profiles', 'sa_person_notes', 'sa_person_note_edits', 'sa_outreach', 'sa_team_guesses', 'sa_skill_checks', 'sa_possible_matches'))
  and not exists (select 1 from pg_policies where schemaname = 'public' and tablename in
    ('sa_people', 'sa_profiles', 'sa_person_notes', 'sa_person_note_edits', 'sa_outreach', 'sa_team_guesses', 'sa_skill_checks', 'sa_possible_matches'))
  and not exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC') and table_name in
    ('sa_people', 'sa_profiles', 'sa_person_notes', 'sa_person_note_edits', 'sa_outreach', 'sa_team_guesses', 'sa_skill_checks', 'sa_possible_matches')));
select pg_temp.check('signed out, only the map can be called',
  has_function_privilege('anon', 'public.sa_registry_cards()', 'execute')
  and not has_function_privilege('anon', 'public.sa_registry_people()', 'execute')
  and not has_function_privilege('anon', 'public.sa_registry_person(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.sa_registry_claim(text)', 'execute')
  and not has_function_privilege('anon', 'public.sa_save_profile(jsonb, boolean)', 'execute')
  and not has_function_privilege('anon', 'public.sa_find_people(text, text, text, text, bigint, bigint)', 'execute'));
select pg_temp.check('the internal helpers are closed to the API',
  not has_function_privilege('authenticated', 'public.sa_registry_link(uuid, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.sa_reg_own_row(uuid, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.sa_discord(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.sa_require_team()', 'execute')
  and not has_function_privilege('authenticated', 'public.sa_registry_role()', 'execute')
  and not has_function_privilege('authenticated', 'public.sa_reg_team_view(public.sa_people, public.sa_profiles)', 'execute'));

-- The team adds people ---------------------------------------------------
set local role authenticated;
select pg_temp.as_user(:'c2');
select public.sa_add_person(p_name => 'Sa Reg Kenji', p_source => 'Added by Erick: 3 merged PRs in project-quiver',
  p_github_login => 'sa-reg-kenji', p_github_id => 999200005, p_discord_username => 'sa.reg.kenji', p_discord_id => 999300001,
  p_guess_disciplines => array['Software', 'Telemetry'], p_note => 'Three good PRs last spring, then nothing.',
  p_owner => :'c1', p_intro_queue => true, p_good_for => array['QuiverHub telemetry']) as kenji \gset
select public.sa_add_person(p_name => 'Sa Reg Renamed', p_source => 'Repo suggestions', p_github_login => 'sa-reg-renamed', p_github_id => 999200099) as renamed \gset
select public.sa_add_person(p_name => 'Sa Reg Rosa', p_source => 'Met at the Austin build day', p_email => 'SA-REG-ROSA@example.invalid',
  p_city => 'Waco', p_country => 'United States', p_lat => 31.55, p_lng => -97.15, p_tz => 'America/Chicago', p_guess_tools => array['cnc', 'mill']) as rosa \gset
select public.sa_add_person(p_name => 'Sa Reg Ade', p_source => 'Answers BMS questions in #longshot', p_email => 'sa-reg-ade@example.invalid',
  p_discord_username => 'sa.reg.ade', p_note => 'Works at a battery recycler. Worth a call.') as ade \gset
select public.sa_add_person(p_name => 'Sa Reg Lena', p_source => 'arrowair.com form') as lena \gset
select pg_temp.check('core adds people with no account', :'kenji' is not null and :'renamed' is not null and :'rosa' is not null and :'ade' is not null and :'lena' is not null);
select pg_temp.expect_error($q$select public.sa_add_person('Nobody', '  ')$q$, 'Say where you know them from');
select pg_temp.expect_error($q$select public.sa_add_person('', 'Somewhere')$q$, 'A name is required');
select pg_temp.expect_error($q$select public.sa_add_person('Kenji Again', 'Somewhere', p_github_id => 999200005)$q$, 'Already in the registry: Sa Reg Kenji');
select pg_temp.expect_error($q$select public.sa_add_person('Rosa Again', 'Somewhere', p_email => 'sa-reg-rosa@EXAMPLE.invalid')$q$, 'Already in the registry: Sa Reg Rosa');
select pg_temp.expect_error($q$select public.sa_add_person('Someone', 'Somewhere', p_guess_disciplines => array['Basket weaving'])$q$, 'unknown value: Basket weaving');
select pg_temp.expect_error(format($q$select public.sa_add_person('Someone', 'Somewhere', p_owner => %L)$q$, :'c3'), 'The owner has to be core or a lead');
-- The duplicate check.
select pg_temp.check('find people: by name, in any case', (select count(*) = 1 and bool_and(j->'why' ? 'name') from public.sa_find_people(p_name => 'sa reg kenji') j));
select pg_temp.check('find people: by part of a name', exists (select 1 from public.sa_find_people(p_name => 'Kenji') j where j->>'id' = :'kenji'));
select pg_temp.check('find people: by Discord handle, with or without @', exists (select 1 from public.sa_find_people(p_discord => '@SA.REG.KENJI') j where j->>'id' = :'kenji' and j->'why' ? 'discord'));
select pg_temp.check('find people: by GitHub login', exists (select 1 from public.sa_find_people(p_github => 'Sa-Reg-Kenji') j where j->>'id' = :'kenji' and j->'why' ? 'github'));
select pg_temp.check('find people: by GitHub id', exists (select 1 from public.sa_find_people(p_github_id => 999200099) j where j->>'id' = :'renamed'));
select pg_temp.check('find people: by email, in any case', exists (select 1 from public.sa_find_people(p_email => 'Sa-Reg-Rosa@Example.Invalid') j where j->>'id' = :'rosa' and j->'why' ? 'email'));
select pg_temp.check('find people: nothing for a stranger', not exists (select 1 from public.sa_find_people(p_name => 'Zz Nobody Zz', p_email => 'zz@example.invalid')));
reset role;

-- Only core or a lead adds people or reads the duplicate check.
set local role authenticated;
select pg_temp.as_user(:'c3');
select pg_temp.expect_error($q$select public.sa_add_person('Mallory', 'Myself')$q$, 'Only core or a lead');
select pg_temp.expect_error($q$select public.sa_find_people(p_name => 'Sa Reg')$q$, 'Only core or a lead');
select pg_temp.as_user(:'c4');
select pg_temp.expect_error($q$select public.sa_add_person('Mallory', 'Myself')$q$, 'Only core or a lead');
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select pg_temp.expect_error($q$select public.sa_add_person('Mallory', 'Myself')$q$, 'permission denied');
select pg_temp.expect_error($q$select public.sa_registry_claim()$q$, 'permission denied');
reset role;

-- Linking at sign-in -----------------------------------------------------
set local role authenticated;
select pg_temp.as_user(:'c5');
select public.sa_registry_claim('x-test') as r \gset c5_
select pg_temp.check('claim by GitHub id: the record the team resolved to that id', (:'c5_r'::jsonb)->>'person_id' = :'kenji' and (:'c5_r'::jsonb)->>'how' = 'github');
select pg_temp.check('claiming again changes nothing', public.sa_registry_claim()->>'person_id' = :'kenji');
select pg_temp.as_user(:'c6');
select pg_temp.check('a renamed login someone else registers claims nothing, and makes no match',
  (select (j->>'person_id') is null and (j->>'possible')::int = 0 from public.sa_registry_claim() j));
select pg_temp.as_user(:'c7');
select pg_temp.check('claim by email when the account''s email is proven', (select j->>'person_id' = :'rosa' and j->>'how' = 'email' from public.sa_registry_claim() j));
select pg_temp.as_user(:'c8');
select public.sa_registry_claim() as r \gset c8_
select pg_temp.check('an unproven email makes a possible match and a row of their own, not a claim',
  (:'c8_r'::jsonb)->>'linked' = 'false' and ((:'c8_r'::jsonb)->>'possible')::int = 1 and (:'c8_r'::jsonb)->>'person_id' is not null
  and (:'c8_r'::jsonb)->>'person_id' <> :'ade');
select pg_temp.as_user(:'c9');
select pg_temp.check('a claimed record can''t be claimed again (its Discord id from another account)',
  (select (j->>'person_id') is null and (j->>'possible')::int = 0 from public.sa_registry_claim() j));
select pg_temp.as_user(:'c10');
select public.sa_registry_claim() as r \gset c10_
select pg_temp.check('the same name makes a possible match', ((:'c10_r'::jsonb)->>'possible')::int = 1 and (:'c10_r'::jsonb)->>'linked' = 'false');
reset role;
select pg_temp.check('the claimed records belong to their accounts',
  (select user_id from public.sa_people where id = :'kenji') = :'c5' and (select user_id from public.sa_people where id = :'rosa') = :'c7');
select pg_temp.check('the records that weren''t claimed stay unclaimed',
  not exists (select 1 from public.sa_people where id in (:'renamed', :'ade', :'lena') and (user_id is not null or claimed_at is not null)));
select pg_temp.check('the claim kept the ref and GitHub''s current login, and the team''s notes and outreach',
  (select ref = 'x-test' and github_login = 'sa-reg-kenji-new' and github_id = 999200005 from public.sa_people where id = :'kenji')
  and (select count(*) = 1 from public.sa_person_notes where person_id = :'kenji')
  and (select count(*) = 1 and bool_and(intro_queue) from public.sa_outreach where person_id = :'kenji'));
select pg_temp.check('possible matches name why', (select reason = 'same email, not proven' from public.sa_possible_matches where person_id = :'ade' and user_id = :'c8')
  and (select reason = 'same name' from public.sa_possible_matches where person_id = :'lena' and user_id = :'c10'));
select id as ade_match from public.sa_possible_matches where person_id = :'ade' and user_id = :'c8' \gset
select id as lena_match from public.sa_possible_matches where person_id = :'lena' and user_id = :'c10' \gset

-- Profiles ---------------------------------------------------------------
set local role authenticated;
select pg_temp.as_user(:'c4');
select pg_temp.expect_error($q$select public.sa_save_profile('{"wants_to_build": "x"}')$q$, 'Join the workspace first');
select pg_temp.as_user(:'c3');
select pg_temp.expect_error($q$select public.sa_save_profile(jsonb_build_object('blurb', repeat('a', 141)))$q$, 'too long (140 characters at most)');
select pg_temp.expect_error($q$select public.sa_save_profile('{"blurb": "Builder. See https://example.com"}')$q$, 'Keep links out of the blurb');
select pg_temp.expect_error($q$select public.sa_save_profile('{"blurb": "Find me at mybuilds.io"}')$q$, 'Keep links out of the blurb');
select pg_temp.expect_error($q$select public.sa_save_profile('{"blurb": "Join discord.gg/abc"}')$q$, 'Keep links out of the blurb');
select pg_temp.expect_error($q$select public.sa_save_profile('{"email": "x@example.invalid"}')$q$, 'Unknown profile field: email');
select pg_temp.expect_error($q$select public.sa_save_profile('{"can": ["Basket weaving"]}')$q$, 'unknown value: Basket weaving');
select pg_temp.expect_error($q$select public.sa_save_profile('{"map_disciplines": ["CAD", "Power", "Firmware", "Assembly"]}')$q$, 'takes 3 at most');
select pg_temp.expect_error($q$select public.sa_save_profile('{"map": "street"}')$q$, 'The map shows your city');
select pg_temp.expect_error($q$select public.sa_save_profile('{"tz": "Mars/Olympus"}')$q$, 'Unknown time zone');
select pg_temp.expect_error($q$select public.sa_save_profile('{"links": [{"url": "javascript:alert(1)"}]}')$q$, 'Each link needs an http(s) address');
select pg_temp.expect_error($q$select public.sa_save_profile('{"story": "x"}', true)$q$, 'Tell us what you want to build first');
select pg_temp.check('a 140-character blurb with a full stop and an e.g. is fine',
  public.sa_save_profile(jsonb_build_object('ref', 'x-longshot-teardown', 'blurb', 'Utility field tech, e.g. substations. Built a 14S pack. ' || repeat('x', 84)))->'profile'->>'blurb' like 'Utility%');
select public.sa_save_profile('{"ref": "x-longshot-teardown", "display_name": "Sa Reg Maya", "city": "Houston", "country": "United States",
  "lat": 29.76123, "lng": -95.36981, "tz": "America/Chicago", "map": "city", "discord": "@maya.builds",
  "wants_to_build": "A Longshot pack for my own Quiver first", "lanes": ["hardware", "engineer", "hardware"], "can": ["Electrical", "Power", "Assembly"],
  "learn": ["Firmware"], "tools": ["solder", "spot", "scope", "fdm"], "build": ["own", "day"], "wants": ["learning", "paid"],
  "story": "Built a 14S e-bike pack. The first spot welder blew through the nickel.", "links": [{"label": "YouTube", "url": "https://youtube.com/@maya"}],
  "blurb": "Utility field tech in Houston. Built a 14S e-bike pack from salvaged cells.", "map_disciplines": ["Electrical", "Power", "Assembly"],
  "call_ok": true, "call_windows": "Weekday evenings", "heard_from": "X", "agent_drafted": true}', true) as r \gset maya_
select (:'maya_r'::jsonb)->>'id' as maya \gset
select pg_temp.check('their own row, from the account, with the ref of their first save',
  (:'maya_r'::jsonb)->>'name' = 'Sa Reg Maya' and (:'maya_r'::jsonb)->>'ref' = 'x-longshot-teardown' and (:'maya_r'::jsonb)->>'discord' = 'maya.builds'
  and (:'maya_r'::jsonb)->'profile'->>'finished_at' is not null and (:'maya_r'::jsonb)->'profile'->'lanes' = '["hardware", "engineer"]'
  and ((:'maya_r'::jsonb)->'profile'->>'call_ok')::boolean and not ((:'maya_r'::jsonb) ? 'email'));
select pg_temp.expect_error($q$select public.sa_save_profile('{"wants_to_build": "  "}')$q$, 'can''t be empty');
select pg_temp.check('a save changes only the fields it names',
  (select j->'profile'->>'story' like 'Built a 14S%' and j->'profile'->>'hours' = '5-10 h/wk' from public.sa_save_profile('{"hours": "5-10 h/wk"}') j));
select pg_temp.as_user(:'c5');
select pg_temp.check('a claimed record takes its person''s profile',
  public.sa_save_profile('{"display_name": "Sa Reg Kenji Mori", "city": "Sapporo", "country": "Japan", "lat": 43.06, "lng": 141.35, "tz": "Asia/Tokyo",
    "map": "country", "wants_to_build": "QuiverHub telemetry", "map_disciplines": ["Software"], "blurb": "Telemetry and SDK docs."}', true)->>'id' = :'kenji');
select pg_temp.as_user(:'c1');
select public.sa_save_profile('{"wants_to_build": "Arrow", "map": "off", "city": "Fort Davis"}', true)->>'id' as lead_person \gset
select pg_temp.as_user(:'c2');
select public.sa_save_profile('{"wants_to_build": "Arrow", "map": "city", "city": "Austin", "lat": 30.27, "lng": -97.74}')->>'id' as core_person \gset
select pg_temp.as_user(:'c8');
select pg_temp.check('a save by someone with a possible match keeps their own row',
  public.sa_save_profile('{"display_name": "Ade Bankole", "wants_to_build": "Longshot BMS", "can": ["Electrical"]}', true)->>'id' = (:'c8_r'::jsonb)->>'person_id');
reset role;

-- What anyone sees: the map -----------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
create temp table cards as select * from public.sa_registry_cards() j;
select pg_temp.check('the map shows a city-precision card with the map''s fields, rounded',
  exists (select 1 from cards where j->>'id' = :'maya' and j->>'city' = 'Houston' and (j->>'lat')::numeric = 29.76 and (j->>'lng')::numeric = -95.37
    and j->>'tz' = 'America/Chicago' and j->'disciplines' = '["Electrical", "Power", "Assembly"]' and j->>'joined' = to_char(now() at time zone 'UTC', 'YYYY-MM')));
select pg_temp.check('a country-precision card shows the country and nothing finer',
  exists (select 1 from cards where j->>'id' = :'kenji' and j->>'country' = 'Japan' and j->>'city' is null and j->>'lat' is null and j->>'lng' is null));
select pg_temp.check('people who chose no map, or haven''t finished, aren''t on it',
  not exists (select 1 from cards where j->>'id' in (:'lead_person', :'core_person')));
select pg_temp.check('nobody the team added without an account is on the map',
  not exists (select 1 from cards where j->>'id' in (:'renamed', :'ade', :'lena', :'rosa')));
select pg_temp.check('cards carry only the map''s fields',
  not exists (select 1 from cards c, jsonb_object_keys(c.j) k where k not in ('id', 'name', 'city', 'country', 'lat', 'lng', 'tz', 'disciplines', 'blurb', 'discord', 'github', 'joined')));
select pg_temp.cant_read(t) from unnest(array['sa_people', 'sa_profiles', 'sa_person_notes', 'sa_outreach', 'sa_team_guesses', 'sa_possible_matches']) t;
select pg_temp.expect_error($q$select public.sa_registry_people()$q$, 'permission denied');
select pg_temp.expect_error(format($q$select public.sa_registry_person(%L)$q$, :'maya'), 'permission denied');
reset role;

-- What members see ----------------------------------------------------------
set local role authenticated;
select pg_temp.as_user(:'c3');
select pg_temp.cant_read(t) from unnest(array['sa_people', 'sa_profiles', 'sa_person_notes', 'sa_person_note_edits', 'sa_outreach',
  'sa_team_guesses', 'sa_skill_checks', 'sa_possible_matches']) t;
create temp table member_view as select * from public.sa_registry_people() j;
select pg_temp.check('members see the full profiles of people with accounts',
  exists (select 1 from member_view where j->>'id' = :'kenji' and j->'profile'->>'wants_to_build' = 'QuiverHub telemetry' and j->>'city' = 'Sapporo')
  and exists (select 1 from member_view where j->>'id' = :'lead_person'));
select pg_temp.check('members see nobody without an account',
  not exists (select 1 from member_view where j->>'id' in (:'renamed', :'ade', :'lena')) and bool_and((j->>'has_account')::boolean)) from member_view;
select pg_temp.check('members see no emails, sources, notes, outreach, guesses or call choices of others',
  not exists (select 1 from member_view m, jsonb_object_keys(m.j) k where k in ('email', 'source', 'added_by', 'outreach', 'guess', 'note_count', 'notes', 'user_id', 'github_id', 'discord_id', 'call_notes'))
  and not exists (select 1 from member_view m where m.j->>'id' <> :'maya' and m.j->'profile' ?| array['call_ok', 'call_windows', 'heard_from']));
select pg_temp.check('a member sees their own call choices', exists (select 1 from member_view where j->>'id' = :'maya' and (j->'profile'->>'call_ok')::boolean));
select pg_temp.expect_error(format($q$select public.sa_registry_person(%L)$q$, :'ade'), 'No such person');
select pg_temp.check('one person, as a member: no notes, no email', (select not (j ? 'notes') and not (j ? 'email') and j->>'name' = 'Sa Reg Kenji Mori' from public.sa_registry_person(:'kenji') j));
select pg_temp.expect_error($q$select public.sa_registry_matches()$q$, 'Only core or a lead');
select pg_temp.expect_error(format($q$select public.sa_add_note(%L, 'note', 'hi')$q$, :'kenji'), 'Only core or a lead');
select pg_temp.expect_error(format($q$select public.sa_set_outreach(%L, p_status => 'invited')$q$, :'kenji'), 'Only core or a lead');
select pg_temp.expect_error(format($q$select public.sa_update_person(%L, '{"email": "x@example.invalid"}')$q$, :'kenji'), 'Only core or a lead');
select pg_temp.expect_error(format($q$select public.sa_link_person(%L, true)$q$, :'ade_match'), 'Only a lead');
select pg_temp.as_user(:'c4');
select pg_temp.expect_error($q$select public.sa_registry_people()$q$, 'Members only');
select pg_temp.expect_error(format($q$select public.sa_registry_person(%L)$q$, :'maya'), 'Members only');
reset role;

-- What core sees and writes --------------------------------------------------
set local role authenticated;
select pg_temp.as_user(:'c2');
create temp table core_view as select * from public.sa_registry_people() j;
select pg_temp.check('core sees everyone, the people without accounts too, with emails and sources',
  (select count(*) = 3 from core_view where j->>'id' in (:'renamed', :'ade', :'lena'))
  and exists (select 1 from core_view where j->>'id' = :'ade' and j->>'email' = 'sa-reg-ade@example.invalid' and j->>'source' like 'Answers BMS%' and (j->>'note_count')::int = 1));
select pg_temp.check('core sees the ids the app resolved (Discord''s as text) and the call-note count',
  exists (select 1 from core_view where j->>'id' = :'renamed' and j->'github_id' = '999200099'::jsonb and j->'discord_id' = 'null'::jsonb and (j->>'call_notes')::int = 0)
  and exists (select 1 from core_view where j->>'id' = :'kenji' and j->'discord_id' = '"999300001"'::jsonb));
select pg_temp.check('one person, as core: notes, outreach and guesses',
  (select jsonb_array_length(j->'notes') = 1 and j->'outreach'->0->>'owner_id' = :'c1' and j->'guess'->'disciplines' = '["Software", "Telemetry"]'
     and jsonb_array_length(j->'matches') = 0 from public.sa_registry_person(:'kenji') j));
select pg_temp.check('core sees the open "same person?" cards', (select count(*) = 2 from public.sa_registry_matches()));
select public.sa_add_note(:'ade', 'call', '20 minutes. Knows cell matching cold.') as ade_note \gset
select pg_temp.check('a call note counts on the team''s view', (select (j->>'call_notes')::int = 1 and (j->>'note_count')::int = 2 from public.sa_registry_person(:'ade') j));
select pg_temp.check('core adds a skill check', public.sa_add_note(:'ade', 'skill', 'Watched him grade cells.', 'Electrical', 'seen_work') is not null);
select pg_temp.expect_error(format($q$select public.sa_add_note(%L, 'skill', 'Good.')$q$, :'ade'), 'A skill check names a discipline');
select pg_temp.expect_error(format($q$select public.sa_add_note(%L, 'gossip', 'x')$q$, :'ade'), 'Unknown kind of note');
select public.sa_edit_note(:'ade_note', '20 minutes. Knows cell matching cold. Wants paid work.');
select pg_temp.expect_error(format($q$select public.sa_set_outreach(%L, p_owner => %L)$q$, :'ade', :'c3'), 'The owner has to be core or a lead');
select public.sa_set_outreach(:'kenji', p_status => 'invited', p_next_step => 'Erick: email about telemetry', p_good_for => array['QuiverHub telemetry', 'SDK docs']);
select pg_temp.check('outreach keeps its history',
  (select jsonb_array_length(o->'history') = 2 and o->>'status' = 'invited' and o->>'next_step' like 'Erick%' and o->'owner_id' is not null
   from jsonb_array_elements(public.sa_registry_person(:'kenji')->'outreach') o));
select public.sa_update_person(:'lena', '{"city": "Munich", "country": "Germany", "guess_disciplines": ["Industrial", "Interface"]}');
select pg_temp.expect_error(format($q$select public.sa_update_person(%L, '{"city": "Elsewhere"}')$q$, :'kenji'), 'theirs to change');
select pg_temp.expect_error(format($q$select public.sa_update_person(%L, '{"map": "city"}')$q$, :'lena'), 'Unknown field: map');
select pg_temp.expect_error(format($q$select public.sa_update_person(%L, '{"github_id": 999200005}')$q$, :'lena'), 'Already in the registry');
select public.sa_update_person(:'kenji', '{"email": "kenji@example.invalid"}');
select pg_temp.as_user(:'c11');
select pg_temp.expect_error(format($q$select public.sa_edit_note(%L, 'mine now')$q$, :'ade_note'), 'Only its author or a lead');
select pg_temp.expect_error(format($q$select public.sa_link_person(%L, true)$q$, :'ade_match'), 'Only a lead');
reset role;
select pg_temp.check('a note edit keeps the earlier version', (select count(*) = 1 from public.sa_person_note_edits where note_id = :'ade_note')
  and (select body like '%Wants paid work.' and edited_at is not null from public.sa_person_notes where id = :'ade_note'));
select pg_temp.check('the team''s edits landed', (select city = 'Munich' from public.sa_people where id = :'lena')
  and (select disciplines = array['Industrial', 'Interface'] from public.sa_team_guesses where person_id = :'lena')
  and (select email = 'kenji@example.invalid' and city = 'Sapporo' and map = 'country' from public.sa_people where id = :'kenji'));
select pg_temp.check('a skill check is recorded with its note', exists (select 1 from public.sa_skill_checks s join public.sa_person_notes n on n.id = s.note_id
  where s.person_id = :'ade' and s.discipline = 'Electrical' and s.verdict = 'seen_work' and n.kind = 'skill'));

-- A lead settles "same person?" -------------------------------------------
set local role authenticated;
select pg_temp.as_user(:'c1');
select pg_temp.check('a lead links an account to the record the team added', public.sa_link_person(:'ade_match', true) = :'ade'::uuid);
select pg_temp.check('a lead says a same-name match is someone else', public.sa_link_person(:'lena_match', false) = ((:'c10_r'::jsonb)->>'person_id')::uuid);
select pg_temp.expect_error(format($q$select public.sa_link_person(%L, true)$q$, :'ade_match'), 'That was settled already');
reset role;
select pg_temp.check('the linked record now has the account, the profile they wrote and the team''s notes, and their own row is gone',
  (select user_id = :'c8' and claimed_at is not null and display_name = 'Ade Bankole' and discord_username = 'sa.reg.ade' and email = 'sa-reg-ade@example.invalid' from public.sa_people where id = :'ade')
  and (select wants_to_build = 'Longshot BMS' from public.sa_profiles where person_id = :'ade')
  and (select count(*) = 3 from public.sa_person_notes where person_id = :'ade')
  and not exists (select 1 from public.sa_people where id = ((:'c8_r'::jsonb)->>'person_id')::uuid));
select pg_temp.check('after "someone else", both records stay apart',
  (select user_id is null from public.sa_people where id = :'lena') and (select user_id = :'c10' from public.sa_people where id = ((:'c10_r'::jsonb)->>'person_id')::uuid));
-- A stale card naming a record that's since been claimed.
insert into public.sa_possible_matches (person_id, user_id, reason) values (:'ade', :'c10', 'stale') returning id as stale_match \gset
set local role authenticated;
select pg_temp.as_user(:'c1');
select pg_temp.expect_error(format($q$select public.sa_link_person(%L, true)$q$, :'stale_match'), 'already linked to an account');
select pg_temp.as_user(:'c8');
select pg_temp.check('the linked account reads its record as its own', public.sa_my_profile()->>'id' = :'ade' and public.sa_registry_claim()->>'person_id' = :'ade');
select pg_temp.as_user(:'c9');
select pg_temp.check('another account still can''t take a claimed record', (public.sa_registry_claim()->>'person_id') is null);
reset role;
select pg_temp.check('claimed records never moved', (select user_id from public.sa_people where id = :'kenji') = :'c5'
  and (select user_id from public.sa_people where id = :'rosa') = :'c7' and (select user_id from public.sa_people where id = :'ade') = :'c8');

-- A record the team adds after someone has joined: their GitHub id is already
-- on their own row, so it's a duplicate; their proven email makes a card for a
-- lead, not a link.
insert into public.sa_forum_vouched (user_id, note) values (:'c10', 'sa_registry_test');
set local role authenticated;
select pg_temp.as_user(:'c2');
select pg_temp.expect_error($q$select public.sa_add_person('Sa Reg Lena Again', 'Discord, right-click', p_github_id => 999200010)$q$, 'Already in the registry: Sa Reg Lena');
select public.sa_add_person('Sa Reg Lena Again', 'Met at a build day', p_email => 'sa-reg-lena@example.invalid') as lena2 \gset
select pg_temp.as_user(:'c10');
select pg_temp.check('a later record with their proven email becomes a "same person?" card', (public.sa_registry_claim()->>'possible')::int = 1);
reset role;
select pg_temp.check('... and stays unclaimed until a lead decides', (select user_id is null from public.sa_people where id = :'lena2')
  and exists (select 1 from public.sa_possible_matches where person_id = :'lena2' and user_id = :'c10' and reason = 'same proven email, added after they joined'));

rollback;
