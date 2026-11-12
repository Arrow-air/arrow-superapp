-- Exercises the contributor registry (20261112000000_sa_registry.sql) on the real database without leaving a trace:
-- run it after the migration in the same transaction, which this file rolls back.
--   (echo 'begin;'; cat supabase/migrations/20261112000000_sa_registry.sql supabase/tests/sa_registry_test.sql) \
--     | ssh <box> 'docker exec -i openship-supabase-db psql -U postgres -X -A -t -v ON_ERROR_STOP=1'
-- The second half (from "The security review's findings") replays the review's attacks; each must now fail.
-- On its own it opens the transaction itself. Every check prints "ok ..." or "FAIL ..."; the run ends with ROLLBACK.
begin;
set local lock_timeout = '4s';

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
--   c1 a lead, c2 and c11 core, c3 a member, c4 signed in but not a workspace member (a flights-only account)
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
  (:'c5', 'K. Mori', 'member'), (:'c8', 'Ade B', 'member'), (:'c10', 'Sa Reg Lena', 'member'),
  (:'c6', 'Someone Else', 'member'), (:'c7', 'Rosa Account', 'member'), (:'c9', 'Disc Account', 'member');

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
select pg_temp.as_user(:'c4');
select pg_temp.check('an account that isn''t a workspace member claims nothing', public.sa_registry_claim() is null);
select pg_temp.check('... and gets no row', public.sa_my_profile() is null);
select pg_temp.as_user(:'c6');
select pg_temp.check('a renamed login someone else registers claims nothing',
  (select (j->>'person_id') is null and not (j ? 'possible') from public.sa_registry_claim() j));
select pg_temp.as_user(:'c7');
select pg_temp.check('claim by email when the account''s email is proven', (select j->>'person_id' = :'rosa' and j->>'how' = 'email' from public.sa_registry_claim() j));
select pg_temp.as_user(:'c8');
select public.sa_registry_claim() as r \gset c8_
select pg_temp.check('an unproven email is not a claim, and the answer says nothing more',
  (:'c8_r'::jsonb) = '{"how": null, "linked": false, "person_id": null}'::jsonb and public.sa_my_profile() is null);
select pg_temp.as_user(:'c9');
select pg_temp.check('a claimed record can''t be claimed again (its Discord id from another account)',
  (select (j->>'person_id') is null from public.sa_registry_claim() j));
select pg_temp.as_user(:'c10');
select public.sa_registry_claim() as r \gset c10_
select pg_temp.check('the same name is not a claim', (:'c10_r'::jsonb)->>'linked' = 'false' and (:'c10_r'::jsonb)->>'person_id' is null);
reset role;
select pg_temp.check('the renamed login and the claimed Discord id file no card',
  not exists (select 1 from public.sa_possible_matches where user_id in (:'c6', :'c9')));
select pg_temp.check('a weak match makes no row for the account; its card points at no row yet',
  not exists (select 1 from public.sa_people where user_id in (:'c8', :'c10'))
  and (select count(*) = 2 and bool_and(account_person_id is null) from public.sa_possible_matches where user_id in (:'c8', :'c10')));
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
  (:'maya_r'::jsonb)->>'name' = 'Sa Reg Maya' and (:'maya_r'::jsonb)->>'ref' = 'x-longshot-teardown'
  and (:'maya_r'::jsonb)->>'discord' is null and (:'maya_r'::jsonb)->'profile'->>'discord_said' = 'maya.builds'
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
select public.sa_save_profile('{"display_name": "Ade Bankole", "wants_to_build": "Longshot BMS", "can": ["Electrical"]}', true)->>'id' as c8_person \gset
reset role;
select pg_temp.check('a save by someone with a possible match makes their own row, and the card points at it',
  :'c8_person' <> :'ade' and (select account_person_id = :'c8_person'::uuid from public.sa_possible_matches where id = :'ade_match'));

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
select pg_temp.check('members see the profiles of people who finished one, place at the map''s precision',
  exists (select 1 from member_view where j->>'id' = :'kenji' and j->'profile'->>'wants_to_build' = 'QuiverHub telemetry'
    and j->>'country' = 'Japan' and j->>'city' is null and j->>'lat' is null)
  and exists (select 1 from member_view where j->>'id' = :'lead_person' and j->>'city' is null and j->>'country' is null and j->>'tz' is null));
select pg_temp.check('members don''t see someone who hasn''t finished a profile (core''s map=city draft)',
  not exists (select 1 from member_view where j->>'id' = :'core_person'));
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
select pg_temp.check('a lead says a same-name match is someone else (the account has no row to return)', public.sa_link_person(:'lena_match', false) is null);
select pg_temp.expect_error(format($q$select public.sa_link_person(%L, true)$q$, :'ade_match'), 'That was settled already');
reset role;
select pg_temp.check('the linked record now has the account, the profile they wrote and the team''s notes, and their own row is gone',
  (select user_id = :'c8' and claimed_at is not null and display_name = 'Ade Bankole' and email = 'sa-reg-ade@example.invalid' from public.sa_people where id = :'ade')
  and (select wants_to_build = 'Longshot BMS' from public.sa_profiles where person_id = :'ade')
  and (select count(*) = 3 from public.sa_person_notes where person_id = :'ade')
  and not exists (select 1 from public.sa_people where id = :'c8_person'));
select pg_temp.check('a handle the team typed but never resolved isn''t kept as theirs', (select discord_username is null from public.sa_people where id = :'ade'));
select pg_temp.check('after "someone else", the record stays apart', (select user_id is null and claimed_at is null from public.sa_people where id = :'lena')
  and (select outcome = 'different' from public.sa_possible_matches where id = :'lena_match'));
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

-- A record the team adds for someone with no row yet links at their next
-- sign-in; one added after they have a row, with their GitHub id already on
-- it, is a duplicate; with their proven email, it's a card for a lead.
set local role authenticated;
select pg_temp.as_user(:'c2');
select public.sa_add_person('Sa Reg Lena Again', 'Discord, right-click', p_github_id => 999200010) as lena2 \gset
select pg_temp.as_user(:'c10');
select pg_temp.check('a record holding the GitHub id of someone with no row links at their next sign-in',
  (select j->>'person_id' = :'lena2' and j->>'how' = 'github' from public.sa_registry_claim() j));
select pg_temp.as_user(:'c2');
select pg_temp.expect_error($q$select public.sa_add_person('Sa Reg Lena Third', 'Discord, right-click', p_github_id => 999200010)$q$, 'Already in the registry: Sa Reg Lena Again');
reset role;
insert into public.sa_forum_vouched (user_id, note) values (:'c3', 'sa_registry_test');
set local role authenticated;
select pg_temp.as_user(:'c2');
select public.sa_add_person('Sa Reg Maya Again', 'Met at a build day', p_email => 'sa-reg-member@example.invalid') as maya2 \gset
select pg_temp.as_user(:'c3');
select pg_temp.check('a later record with their proven email: their own row stays theirs', public.sa_registry_claim()->>'person_id' = :'maya');
reset role;
select pg_temp.check('... it becomes a "same person?" card and stays unclaimed until a lead decides', (select user_id is null from public.sa_people where id = :'maya2')
  and exists (select 1 from public.sa_possible_matches where person_id = :'maya2' and user_id = :'c3' and account_person_id = :'maya' and reason = 'same proven email, added after they joined'));

-- The security review's findings ---------------------------------------------
-- Each replays an attack from the review (ids in brackets) and checks it fails.
\set d1 '00000000-0000-4000-8000-0000000000d1'
\set d2 '00000000-0000-4000-8000-0000000000d2'
\set d3 '00000000-0000-4000-8000-0000000000d3'
\set d4 '00000000-0000-4000-8000-0000000000d4'
\set d5 '00000000-0000-4000-8000-0000000000d5'
\set d6 '00000000-0000-4000-8000-0000000000d6'
\set d7 '00000000-0000-4000-8000-0000000000d7'
--   d1 an email-only member trying things; d2 the real "Kai" on GitHub (id 999200404);
--   d3 another GitHub account (id 999200499) whose GitHub name is also "Sa Reg Kai";
--   d4 the proven email the team put on "Pat"'s record; d5 a GitHub account that never joined the workspace;
--   d6 a member who types someone else's Discord handle; d7 a member who keeps herself off the map.
insert into auth.users (id, aud, role, email, confirmation_sent_at, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at) values
  (:'d1', 'authenticated', 'authenticated', 'sa-reg-mal@example.invalid', now() - interval '1 hour', now(), '{}', '{"provider": "email"}', now(), now()),
  (:'d2', 'authenticated', 'authenticated', 'sa-reg-vic@example.invalid', null, now(), '{}', '{"provider": "github"}', now(), now()),
  (:'d3', 'authenticated', 'authenticated', 'sa-reg-malgh@example.invalid', null, now(), '{}', '{"provider": "github"}', now(), now()),
  (:'d4', 'authenticated', 'authenticated', 'sa-reg-pat@example.invalid', now() - interval '1 hour', now(), '{}', '{"provider": "email"}', now(), now()),
  (:'d5', 'authenticated', 'authenticated', 'sa-reg-outs@example.invalid', null, now(), '{}', '{"provider": "github"}', now(), now()),
  (:'d6', 'authenticated', 'authenticated', 'sa-reg-imp@example.invalid', now() - interval '1 hour', now(), '{}', '{"provider": "email"}', now(), now()),
  (:'d7', 'authenticated', 'authenticated', 'sa-reg-quinn@example.invalid', now() - interval '1 hour', now(), '{}', '{"provider": "email"}', now(), now());
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
  ('999200404', :'d2', '{"sub": "999200404", "user_name": "sa-reg-victim", "full_name": "Sa Reg Kai"}', 'github', now(), now(), now()),
  ('999200499', :'d3', '{"sub": "999200499", "user_name": "sa-reg-mal-gh", "full_name": "Sa Reg Kai"}', 'github', now(), now(), now()),
  ('999200407', :'d5', '{"sub": "999200407", "user_name": "sa-reg-outs", "full_name": "Sa Reg Hidden"}', 'github', now(), now(), now());
insert into public.sa_members (user_id, display_name, role) values
  (:'d1', 'Mal Lory', 'member'), (:'d2', 'Sa Reg Kai', 'member'), (:'d3', 'Sa Reg Kai', 'member'), (:'d4', 'Pat Account', 'member'),
  (:'d6', 'Imp', 'member'), (:'d7', 'Sa Reg Quinn', 'member');
set local role authenticated;
select pg_temp.as_user(:'c2');
select public.sa_add_person('Sa Reg Kai', 'Commits in quiver', p_github_login => 'sa-reg-victim', p_github_id => 999200404,
  p_city => 'Marfa', p_country => 'US', p_lat => 30.309123, p_lng => -104.020614, p_tz => 'America/Chicago', p_note => 'Strong on firmware') as kai \gset
select public.sa_add_person('Sa Reg Pat', 'Machine shop we use', p_email => 'sa-reg-pat@example.invalid', p_city => 'Alpine', p_country => 'US',
  p_tz => 'America/Chicago', p_note => 'Prices high, slow') as pat \gset
select public.sa_add_person('Sa Reg Hidden', 'Build day, Marfa', p_discord_username => 'sa.reg.hidden') as hidden \gset
reset role;

-- M1: a member can't learn which team-only records exist by trying names.
set local role authenticated;
select pg_temp.as_user(:'d1');
select public.sa_registry_claim()::text as miss \gset
reset role;
update public.sa_members set display_name = 'Sa Reg Hidden' where user_id = :'d1';
set local role authenticated;
select pg_temp.as_user(:'d1');
select pg_temp.check('[M1] a name that hits a team-only record answers exactly like one that doesn''t',
  public.sa_registry_claim()::jsonb = :'miss'::jsonb and not (:'miss'::jsonb ? 'possible'));
select pg_temp.check('[M1] ... and leaves the account no row to read', public.sa_my_profile() is null);
reset role;
select pg_temp.check('[M1] ... though a lead still gets the card, pointing at no row', exists (select 1 from public.sa_possible_matches
  where person_id = :'hidden' and user_id = :'d1' and reason = 'same name' and account_person_id is null and settled_at is null));

-- M2: accounts that never joined write nothing; one record collects at most 5 open cards.
set local role authenticated;
select pg_temp.as_user(:'d5');
select pg_temp.check('[M2] an account outside the workspace (flights only) claims nothing, files no card, gets no row',
  public.sa_registry_claim() is null);
reset role;
select pg_temp.check('[M2] ... nothing in the registry names it', not exists (select 1 from public.sa_people where user_id = :'d5')
  and not exists (select 1 from public.sa_possible_matches where user_id = :'d5'));
insert into auth.users (id, aud, role, email, confirmation_sent_at, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-0000000e' || lpad(i::text, 4, '0'))::uuid, 'authenticated', 'authenticated', 'sa-reg-spam' || i || '@example.invalid',
  now() - interval '1 hour', now(), '{}', '{"provider": "email"}', now(), now() from generate_series(1, 8) i;
insert into public.sa_members (user_id, display_name, role)
select ('00000000-0000-4000-8000-0000000e' || lpad(i::text, 4, '0'))::uuid, 'Sa Reg Hidden', 'member' from generate_series(1, 8) i;
do $$
declare i int;
begin
  for i in 1..8 loop
    execute 'set local role authenticated';
    perform pg_temp.as_user('00000000-0000-4000-8000-0000000e' || lpad(i::text, 4, '0'));
    perform public.sa_registry_claim();
    execute 'reset role';
  end loop;
end $$;
select pg_temp.check('[M2] 8 more sign-ins named like one record leave it at 5 open cards',
  (select count(*) = 5 from public.sa_possible_matches where person_id = :'hidden' and settled_at is null));

-- H1: a lead can't hand a record that holds someone's GitHub id to another account.
set local role authenticated;
select pg_temp.as_user(:'d3');
select pg_temp.check('[H1] another GitHub account with the same name doesn''t claim it', (public.sa_registry_claim()->>'linked')::boolean = false);
select pg_temp.as_user(:'c1');
select (m->>'id') as kai_match from public.sa_registry_matches() m where m->>'person_id' = :'kai' and m->>'user_id' = :'d3' \gset
select pg_temp.check('[H1] the card shows the lead the evidence: the account''s email and GitHub, the record''s handle and whether it was resolved',
  (select m->>'account_email' = 'sa-reg-malgh@example.invalid' and m->>'account_github' = 'sa-reg-mal-gh' and m ? 'account_discord'
     and m->>'account_created_at' is not null and m->>'record_github' = 'sa-reg-victim' and (m->>'record_github_resolved')::boolean
     and not (m->>'record_discord_resolved')::boolean and m ? 'record_email' and m->>'account_name' = 'Sa Reg Kai'
   from public.sa_registry_matches() m where m->>'id' = :'kai_match'));
select pg_temp.check('[H1] ... and so does the person page', (select jsonb_array_length(j->'matches') = 1 and j->'matches'->0->>'account_github' = 'sa-reg-mal-gh'
  from public.sa_registry_person(:'kai') j));
select pg_temp.expect_error(format($q$select public.sa_link_person(%L, true)$q$, :'kai_match'), 'holds a GitHub account that this account doesn''t sign in with');
select pg_temp.as_user(:'d2');
select pg_temp.check('[H1] the real person''s GitHub sign-in links the record', (select j->>'person_id' = :'kai' and j->>'how' = 'github' from public.sa_registry_claim() j));
reset role;
select pg_temp.check('[H1] ... and settles the other account''s card', (select outcome = 'superseded' from public.sa_possible_matches where id = :'kai_match'));

-- M3: what the team typed stays with the team when a record links.
set local role authenticated;
select pg_temp.as_user(:'d2');
select pg_temp.check('[M3] after a claim, the person sees none of the place the team typed',
  (select j->>'city' is null and j->>'country' is null and j->>'tz' is null and j->>'lat' is null and j->>'github' = 'sa-reg-victim' from public.sa_my_profile() j));
select pg_temp.as_user(:'d4');
select pg_temp.check('[M3] a proven email links the team''s record', (select j->>'person_id' = :'pat' and j->>'how' = 'email' from public.sa_registry_claim() j));
select pg_temp.as_user(:'d1');
select pg_temp.check('[M3] members don''t see a linked record that has no finished profile',
  not exists (select 1 from public.sa_registry_people() j where j->>'id' in (:'pat', :'kai')));
select pg_temp.expect_error(format($q$select public.sa_registry_person(%L)$q$, :'pat'), 'No such person');
select pg_temp.as_user(:'c2');
select pg_temp.check('[M3] the team still sees its guess at the place, apart from theirs',
  (select j->>'city' is null and j->'guess'->>'city' = 'Marfa' and (j->'guess'->>'lat')::numeric = 30.309123 and j->'guess'->>'tz' = 'America/Chicago'
   from public.sa_registry_person(:'kai') j)
  and (select j->'guess'->>'city' = 'Alpine' from public.sa_registry_person(:'pat') j));
select pg_temp.as_user(:'d4');
select public.sa_save_profile('{"city": "Alpine", "lat": 30.36, "lng": -103.66, "map": "city"}') is not null as saved \gset
select pg_temp.check('[M3] a new city without coordinates clears the old ones',
  (select j->>'city' = 'Marfa' and j->>'lat' is null and j->>'lng' is null from public.sa_save_profile('{"city": "Marfa"}') j));
reset role;

-- M4: members see place only at the map's precision, and never "never ask me".
set local role authenticated;
select pg_temp.as_user(:'d7');
select public.sa_save_profile('{"city": "Smalltown", "country": "US", "tz": "America/Denver", "map": "off", "wants_to_build": "x",
  "never": "Do not contact my employer"}', true)->>'id' as quinn \gset
select pg_temp.as_user(:'d1');
select pg_temp.check('[M4] map off: a member sees no place and no "never ask me"',
  (select j->>'city' is null and j->>'country' is null and j->>'tz' is null and j->>'lat' is null and not (j->'profile' ? 'never')
     and j->'profile'->>'wants_to_build' = 'x' from public.sa_registry_people() j where j->>'id' = :'quinn')
  and (select j->>'city' is null and j->>'tz' is null and not (j->'profile' ? 'never') from public.sa_registry_person(:'quinn') j));
select pg_temp.check('[M4] no member row anywhere carries "never ask me"',
  not exists (select 1 from public.sa_registry_people() j where j->>'id' <> coalesce(public.sa_my_profile()->>'id', '') and j->'profile' ? 'never'));
select pg_temp.as_user(:'d7');
select public.sa_save_profile('{"map": "country"}') is not null as saved \gset
select pg_temp.check('[M4] the person sees all of their own place and "never ask me"',
  (select j->>'city' = 'Smalltown' and j->>'tz' = 'America/Denver' and j->'profile'->>'never' like 'Do not%' from public.sa_my_profile() j));
select pg_temp.as_user(:'d1');
select pg_temp.check('[M4] map at country: a member sees the country and local time, not the city',
  (select j->>'country' = 'US' and j->>'tz' = 'America/Denver' and j->>'city' is null and j->>'lat' is null from public.sa_registry_person(:'quinn') j));
select pg_temp.as_user(:'c2');
select pg_temp.check('[M4] the team sees the city and "never ask me"',
  (select j->>'city' = 'Smalltown' and j->'profile'->>'never' like 'Do not%' from public.sa_registry_person(:'quinn') j));
reset role;

-- H2: a typed Discord handle never reaches the public card or the duplicate check.
set local role authenticated;
select pg_temp.as_user(:'d6');
select public.sa_save_profile('{"display_name": "Sa Reg Founder", "discord": "@sa.reg.founder", "country": "US", "map": "country",
  "wants_to_build": "x", "blurb": "Arrow founder. DM me for grants"}', true)->>'id' as imp \gset
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select pg_temp.check('[H2] the public card carries no typed Discord handle',
  (select j->>'discord' is null and j->>'name' = 'Sa Reg Founder' from public.sa_registry_cards() j where j->>'id' = :'imp')
  and not exists (select 1 from public.sa_registry_cards() j where j->>'discord' = 'sa.reg.founder'));
reset role;
set local role authenticated;
select pg_temp.as_user(:'d1');
select pg_temp.check('[H2] members see it only as what they said',
  (select j->>'discord' is null and j->'profile'->>'discord_said' = 'sa.reg.founder' from public.sa_registry_person(:'imp') j));
select pg_temp.as_user(:'c2');
select pg_temp.check('[H2] the duplicate check doesn''t treat a typed handle as that Discord account',
  not exists (select 1 from public.sa_find_people(p_discord => 'sa.reg.founder')));
reset role;
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
  ('999300404', :'d6', '{"sub": "999300404", "full_name": "sa.reg.imp", "name": "sa.reg.imp#0"}', 'discord', now(), now(), now());
set local role authenticated;
select pg_temp.as_user(:'d6');
select public.sa_registry_claim()->>'person_id' = :'imp' as imp_claimed \gset
select pg_temp.check('[H2] a later Discord sign-in records the proven id and handle on their row',
  :'imp_claimed'::boolean and (select j->>'discord' = 'sa.reg.imp' and j->'profile'->>'discord_said' = 'sa.reg.founder' from public.sa_my_profile() j));
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select pg_temp.check('[H2] ... and only that proven handle reaches the card', (select j->>'discord' = 'sa.reg.imp' from public.sa_registry_cards() j where j->>'id' = :'imp'));
reset role;

-- L1, L2: the blurb's no-links rule and input sizes.
set local role authenticated;
select pg_temp.as_user(:'d7');
select pg_temp.expect_error($q$select public.sa_save_profile('{"blurb": "Cheap packs: arrow-pay . com"}')$q$, 'Keep links out of the blurb');
select pg_temp.expect_error($q$select public.sa_save_profile('{"blurb": "see evil.ru/a"}')$q$, 'Keep links out of the blurb');
select pg_temp.expect_error($q$select public.sa_save_profile('{"blurb": "arrow。pay for packs"}')$q$, 'Keep links out of the blurb');
select pg_temp.expect_error($q$select public.sa_save_profile('{"blurb": "find me at arrowpay dot com"}')$q$, 'Keep links out of the blurb');
select pg_temp.expect_error($q$select public.sa_save_profile('{"blurb": "packs at evil(dot)com"}')$q$, 'Keep links out of the blurb');
select pg_temp.check('[L1] "polka dot" and a full stop before a short word are not links',
  public.sa_save_profile('{"blurb": "Polka dot dress designer. I live in Houston. In my spare time I fly."}')->'profile'->>'blurb' like 'Polka%');
select pg_temp.check('[L1] an ordinary blurb with dots is still fine',
  public.sa_save_profile('{"blurb": "Utility field tech in Houston. Built a 14S e-bike pack. Node.js and C."}')->'profile'->>'blurb' like 'Utility%');
select pg_temp.expect_error($q$select public.sa_save_profile(jsonb_build_object('story', repeat('a ', 40000)))$q$, 'That profile is too big');
select pg_temp.expect_error($q$select public.sa_save_profile(jsonb_build_object('lanes', (select jsonb_agg('code'::text) from generate_series(1, 61))))$q$, 'too long a list');
select pg_temp.expect_error($q$select public.sa_save_profile(jsonb_build_object('story', repeat('a', 16200)))$q$, 'too long (4000 characters at most)');
reset role;

-- Unlink: a lead undoes a link; the account gets its own row and profile back.
set local role authenticated;
select pg_temp.as_user(:'d1');
select public.sa_save_profile('{"wants_to_build": "Mal''s plan", "city": "Elsewhere", "map": "off"}', true)->>'id' as mal_row \gset
select pg_temp.as_user(:'c1');
select (m->>'id') as mal_match from public.sa_registry_matches() m where m->>'person_id' = :'hidden' and m->>'user_id' = :'d1' \gset
select pg_temp.check('a card filed before the account had a row points at the row once made',
  (select m->>'account_person_id' = :'mal_row' from public.sa_registry_matches() m where m->>'id' = :'mal_match'));
select pg_temp.check('a lead links a record with no ids to the account', public.sa_link_person(:'mal_match', true) = :'hidden'::uuid);
reset role;
select pg_temp.check('... the record takes their profile and place; the handle nobody resolved is dropped',
  (select user_id = :'d1' and city = 'Elsewhere' and discord_username is null from public.sa_people where id = :'hidden')
  and (select wants_to_build = 'Mal''s plan' from public.sa_profiles where person_id = :'hidden')
  and (select count(*) = 4 and bool_and(settled_at is not null) from public.sa_possible_matches where person_id = :'hidden' and outcome = 'superseded'));
set local role authenticated;
select pg_temp.as_user(:'d1');
select pg_temp.expect_error(format($q$select public.sa_unlink_person(%L)$q$, :'hidden'), 'Only a lead');
select pg_temp.as_user(:'c2');
select pg_temp.expect_error(format($q$select public.sa_unlink_person(%L)$q$, :'hidden'), 'Only a lead');
select pg_temp.as_user(:'c1');
select pg_temp.expect_error(format($q$select public.sa_unlink_person(%L)$q$, :'quinn'), 'their own record');
select public.sa_unlink_person(:'hidden') as mal_back \gset
reset role;
select pg_temp.check('a lead unlinks: the account has its own row with its profile; the record is unclaimed, with the team''s note and no place',
  (select user_id = :'d1' and city = 'Elsewhere' and display_name = 'Sa Reg Hidden' from public.sa_people where id = :'mal_back')
  and (select wants_to_build = 'Mal''s plan' from public.sa_profiles where person_id = :'mal_back')
  and (select user_id is null and claimed_at is null and city is null and map = 'off' from public.sa_people where id = :'hidden')
  and not exists (select 1 from public.sa_profiles where person_id = :'hidden')
  and (select outcome = 'different' from public.sa_possible_matches where id = :'mal_match'));
set local role authenticated;
select pg_temp.as_user(:'d1');
select pg_temp.check('... and the account reads its own row again', public.sa_registry_claim()->>'person_id' = :'mal_back');
select pg_temp.check('... and claiming again leaves it there', public.sa_my_profile()->>'id' = :'mal_back');
reset role;

-- M6: deleting.
set local role authenticated;
select pg_temp.as_user(:'c2');
select public.sa_add_note(:'pat', 'call', 'Quoted the frame plates.') is not null as noted \gset
select pg_temp.as_user(:'d4');
select public.sa_save_profile('{"wants_to_build": "frames"}', true) is not null as saved \gset
select pg_temp.as_user(:'d1');
select pg_temp.expect_error(format($q$select public.sa_delete_person(%L)$q$, :'pat'), 'Only a lead');
select pg_temp.as_user(:'c2');
select pg_temp.expect_error(format($q$select public.sa_delete_person(%L)$q$, :'pat'), 'Only a lead');
select pg_temp.as_user(:'d4');
select public.sa_delete_my_profile();
select pg_temp.check('[M6] a person deletes their profile: they have none left', public.sa_my_profile() is null);
reset role;
select pg_temp.check('[M6] ... a record the team added goes back to unclaimed with no profile or place, and keeps the team''s notes',
  (select user_id is null and claimed_at is null and city is null and map = 'off' from public.sa_people where id = :'pat')
  and not exists (select 1 from public.sa_profiles where person_id = :'pat')
  and (select count(*) = 2 from public.sa_person_notes where person_id = :'pat')
  and exists (select 1 from auth.users where id = :'d4'));
set local role authenticated;
select pg_temp.as_user(:'d1');
select public.sa_delete_my_profile();
reset role;
select pg_temp.check('[M6] a row they made themselves goes entirely', not exists (select 1 from public.sa_people where id = :'mal_back')
  and not exists (select 1 from public.sa_profiles where person_id = :'mal_back'));
delete from auth.users where id = :'d7';
select pg_temp.check('[M6] deleting an account deletes the profile it wrote', not exists (select 1 from public.sa_people where id = :'quinn')
  and not exists (select 1 from public.sa_profiles where person_id = :'quinn'));
delete from auth.users where id = :'d2';
select pg_temp.check('[M6] deleting the account of a team record unclaims it, so the same person can claim it again',
  (select user_id is null and claimed_at is null and github_id = 999200404 from public.sa_people where id = :'kai')
  and (select count(*) = 1 from public.sa_person_notes where person_id = :'kai'));
set local role authenticated;
select pg_temp.as_user(:'c1');
select public.sa_delete_person(:'kai');
select pg_temp.expect_error(format($q$select public.sa_delete_person(%L)$q$, :'kai'), 'No such person');
reset role;
select pg_temp.check('[M6] a lead deletes a record with its notes, outreach and guesses',
  not exists (select 1 from public.sa_people where id = :'kai') and not exists (select 1 from public.sa_person_notes where person_id = :'kai')
  and not exists (select 1 from public.sa_outreach where person_id = :'kai') and not exists (select 1 from public.sa_team_guesses where person_id = :'kai'));

-- E16 / L3: who may call what, by name.
select pg_temp.check('[L3] signed out, only the map and the vocabularies can be called, of everything the registry defines',
  (select array_agg(proname::text order by proname) from pg_proc where pronamespace = 'public'::regnamespace
     and proname in ('sa_taxonomy', 'sa_registry_tools', 'sa_registry_has_url', 'sa_registry_role', 'sa_require_team', 'sa_reg_text', 'sa_reg_list',
       'sa_reg_jarr', 'sa_reg_tz', 'sa_reg_email', 'sa_reg_id', 'sa_discord', 'sa_reg_card', 'sa_reg_member_view', 'sa_reg_self_view', 'sa_reg_team_view',
       'sa_reg_account_name', 'sa_reg_own_row', 'sa_registry_link', 'sa_registry_claim', 'sa_link_person', 'sa_unlink_person', 'sa_save_profile',
       'sa_registry_cards', 'sa_my_profile', 'sa_registry_people', 'sa_registry_person', 'sa_reg_match', 'sa_registry_matches', 'sa_find_people',
       'sa_add_person', 'sa_update_person', 'sa_add_note', 'sa_edit_note', 'sa_set_outreach', 'sa_people_account_gone', 'sa_delete_person', 'sa_delete_my_profile')
     and has_function_privilege('anon', oid, 'execute'))
  = array['sa_registry_cards', 'sa_registry_has_url', 'sa_registry_tools', 'sa_taxonomy']);
select pg_temp.check('[L3] signed in, the API is exactly the registry''s calls; no helper or trigger function',
  (select array_agg(proname::text order by proname) from pg_proc where pronamespace = 'public'::regnamespace
     and proname ~ '^sa_(reg_|registry_|taxonomy|discord|require_team|link_person|unlink_person|save_profile|my_profile|find_people|add_person|update_person|add_note|edit_note|set_outreach|people_account_gone|delete_person|delete_my_profile)'
     and has_function_privilege('authenticated', oid, 'execute'))
  = array['sa_add_note', 'sa_add_person', 'sa_delete_my_profile', 'sa_delete_person', 'sa_edit_note', 'sa_find_people', 'sa_link_person', 'sa_my_profile',
     'sa_registry_cards', 'sa_registry_claim', 'sa_registry_has_url', 'sa_registry_matches', 'sa_registry_people', 'sa_registry_person', 'sa_registry_tools',
     'sa_save_profile', 'sa_set_outreach', 'sa_taxonomy', 'sa_unlink_person', 'sa_update_person']);
select pg_temp.check('[L3] every registry function pins search_path',
  not exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proconfig is null
    and proname ~ '^sa_(reg_|registry_|taxonomy|discord|require_team|link_person|unlink_person|save_profile|my_profile|find_people|add_person|update_person|add_note|edit_note|set_outreach|people_account_gone|delete_person|delete_my_profile)'));

rollback;
