-- Contributor registry (ideas/contributor-registry.md): one row per person,
-- with an account or not, what they said about themselves, and what the core
-- team knows about them.
--
-- Who reads what:
-- - anyone: the map's public cards (sa_registry_cards), only of people who
--   have an account, finished their profile and chose the map, at the
--   precision they chose;
-- - signed-in members (a row in sa_members): the full profiles of people who
--   have accounts (sa_registry_people, sa_registry_person), never emails,
--   people the team added, or anything the team wrote;
-- - core and leads: everything, through the same functions.
-- Nothing reads the tables directly: RLS is on, there are no policies, and
-- the API roles have no grants. Unlike every sa_ table before it, none of
-- these is in an "sa public read" loop.
--
-- Writes are security-definer functions that check who is signed in. A
-- person's own answers come only from sa_save_profile, by them; the team's
-- guesses, notes and outreach live in their own tables, keyed by person, so
-- they survive when a record the team added links to its person's account.
--
-- Linking (sa_registry_claim, called right after sign-in): an unclaimed record
-- links to the account whose GitHub or Discord numeric id it holds (from
-- auth.identities, never user_metadata), or whose email it holds when the
-- account's email is proven (the forum sign-in's rule, sa_forum_email_proven).
-- Anything weaker gives a lead a "same person?" card (sa_possible_matches).
-- A record, once claimed, never moves to another account.

-- Vocabularies -----------------------------------------------------------
-- Taxonomy v1.0: the 43 disciplines of the website's list.
create or replace function public.sa_taxonomy() returns text[] language sql immutable as $$
  select array[
    'Mechanical', 'CAD', 'Electrical', 'Aerodynamics', 'Power', 'Propulsion', 'Certification', 'Safety',
    'Firmware', 'Software', 'Controls', 'Autonomy', 'Telemetry', 'Simulation',
    'Piloting', 'Flight Test', 'Maintenance', 'Support', 'Regulatory', 'Missions',
    '3D Printing', 'Machining', 'Composites', 'Assembly', 'Sourcing', 'Quality',
    'Industrial', 'Interface', 'Graphics',
    'Documentation', 'Media', 'Social Media',
    'Marketing', 'Community', 'Business Development',
    'Hosting', 'Workshops', 'Vertiports',
    'Governance', 'Tokenomics', 'Coordination', 'Legal', 'Tooling']::text[]
$$;
-- Tools someone can use (the mockup's SHOP keys).
create or replace function public.sa_registry_tools() returns text[] language sql immutable as $$
  select array['fdm', 'resin', 'cnc', 'mill', 'lathe', 'laser', 'solder', 'spot', 'scope', 'composite', 'weld', 'field', 'aircraft']::text[]
$$;
-- A blurb is plain words: no links (the map's rule).
create or replace function public.sa_registry_has_url(t text) returns boolean language sql immutable as $$
  select coalesce(t ~* '(https?://|www\.|discord\.gg|\m[a-z0-9-]+\.(com|net|org|io|co|gg|me|ly|xyz|app|dev|ai|link|to|so|sh)(/|\M))', false)
$$;

-- People -----------------------------------------------------------------
create table if not exists public.sa_people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  display_name text not null check (length(display_name) between 1 and 80),
  github_login text check (length(github_login) between 1 and 39),
  github_id bigint unique check (github_id > 0),
  discord_username text check (length(discord_username) between 1 and 40),
  discord_id bigint unique check (discord_id > 0),
  email text check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),          -- team-only
  city text check (length(city) <= 80),
  country text check (length(country) <= 60),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  tz text check (length(tz) <= 64),
  map text not null default 'off' check (map in ('city', 'country', 'off')),
  source text not null check (length(source) between 1 and 200),   -- where we know them from
  ref text check (ref ~ '^[a-z0-9][a-z0-9._-]{0,63}$'),              -- the join link's ref
  added_by uuid references auth.users (id) on delete set null,       -- null when they signed up themselves
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  claimed_at timestamptz,
  check (user_id is null or claimed_at is not null)
);
create unique index if not exists sa_people_email on public.sa_people (lower(email));
create index if not exists sa_people_name on public.sa_people (lower(display_name));

-- What the person said, in their own words. Only sa_save_profile writes it.
create table if not exists public.sa_profiles (
  person_id uuid primary key references public.sa_people (id) on delete cascade,
  wants_to_build text check (length(wants_to_build) <= 500),
  lanes text[] not null default '{}' check (lanes <@ array['engineer', 'hardware', 'fly', 'code', 'story', 'dao', 'follow']::text[]),
  can text[] not null default '{}' check (can <@ public.sa_taxonomy()),
  learn text[] not null default '{}' check (learn <@ public.sa_taxonomy()),
  experience text check (length(experience) <= 1000),
  story text check (length(story) <= 4000),
  tools text[] not null default '{}' check (tools <@ public.sa_registry_tools()),
  build text[] not null default '{}' check (build <@ array['own', 'parts', 'day', 'host', 'fly']::text[]),
  travel text check (length(travel) <= 120),
  hours text check (length(hours) <= 60),
  availability text check (length(availability) <= 120),
  wants text[] not null default '{}' check (wants <@ array['learning', 'paid', 'mission', 'job', 'business', 'own']::text[]),
  never text check (length(never) <= 500),
  links jsonb not null default '[]' check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 12),
  heard_from text check (length(heard_from) <= 200),
  blurb text check (length(blurb) <= 140 and not public.sa_registry_has_url(blurb)),
  map_disciplines text[] not null default '{}' check (cardinality(map_disciplines) <= 3 and map_disciplines <@ public.sa_taxonomy()),
  call_ok boolean not null default false,
  call_windows text check (length(call_windows) <= 300),
  agent_drafted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  check (finished_at is null or wants_to_build is not null)
);

-- Team only --------------------------------------------------------------
create table if not exists public.sa_person_notes (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.sa_people (id) on delete cascade,
  kind text not null check (kind in ('note', 'call', 'review', 'skill')),
  body text not null check (length(body) between 1 and 8000),
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists sa_person_notes_person on public.sa_person_notes (person_id);
-- Every earlier version of a note, like sa_comment_edits.
create table if not exists public.sa_person_note_edits (
  id bigint generated always as identity primary key,
  note_id uuid not null references public.sa_person_notes (id) on delete cascade,
  body text not null,
  written_at timestamptz not null,
  replaced_at timestamptz not null default now(),
  replaced_by uuid references auth.users (id) on delete set null
);
create index if not exists sa_person_note_edits_note on public.sa_person_note_edits (note_id);
-- Reaching out: intro calls now; say_hi (the welcome DM queue) later.
create table if not exists public.sa_outreach (
  person_id uuid not null references public.sa_people (id) on delete cascade,
  kind text not null default 'intro' check (kind in ('intro', 'say_hi')),
  owner_id uuid references auth.users (id) on delete set null,
  status text not null default 'new' check (status in ('new', 'invited', 'booked', 'talked', 'active', 'quiet', 'skipped')),
  next_step text check (length(next_step) <= 300),
  good_for text[] not null default '{}' check (cardinality(good_for) <= 12),
  intro_queue boolean not null default false,
  history jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  primary key (person_id, kind)
);
-- The team's guess at what someone does, for people who haven't said. Never
-- shown as theirs.
create table if not exists public.sa_team_guesses (
  person_id uuid primary key references public.sa_people (id) on delete cascade,
  disciplines text[] not null default '{}' check (disciplines <@ public.sa_taxonomy()),
  tools text[] not null default '{}' check (tools <@ public.sa_registry_tools()),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
create table if not exists public.sa_skill_checks (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.sa_people (id) on delete cascade,
  discipline text not null check (discipline = any (public.sa_taxonomy())),
  verdict text not null check (verdict in ('seen_work', 'talked', 'tested')),
  note_id uuid references public.sa_person_notes (id) on delete set null,
  checked_by uuid references auth.users (id) on delete set null,
  checked_at timestamptz not null default now()
);
create index if not exists sa_skill_checks_person on public.sa_skill_checks (person_id);
-- "Same person?": an unclaimed record and an account that might be theirs.
create table if not exists public.sa_possible_matches (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.sa_people (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  account_person_id uuid references public.sa_people (id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  settled_by uuid references auth.users (id) on delete set null,
  outcome text check (outcome in ('same', 'different', 'superseded')),
  unique (person_id, user_id)
);

-- Access: no direct reads or writes from the API ------------------------
do $$
declare t text;
begin
  foreach t in array array['sa_people', 'sa_profiles', 'sa_person_notes', 'sa_person_note_edits', 'sa_outreach',
                           'sa_team_guesses', 'sa_skill_checks', 'sa_possible_matches'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
  end loop;
end $$;
revoke all on sequence public.sa_person_note_edits_id_seq from public, anon, authenticated;

-- Helpers (internal) -----------------------------------------------------
-- The signed-in account's workspace role, or null when it isn't a member.
create or replace function public.sa_registry_role() returns text language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.sa_members where user_id = auth.uid()
$$;

create or replace function public.sa_require_team() returns uuid language plpgsql stable security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_uid();
begin
  if coalesce(public.sa_registry_role(), '') not in ('core', 'lead') then
    raise exception 'Only core or a lead can do that' using errcode = '42501';
  end if;
  return uid;
end $$;

-- Trimmed text, null when empty, with a readable error when too long.
create or replace function public.sa_reg_text(label text, v text, maxlen int) returns text language plpgsql immutable as $$
begin
  v := nullif(regexp_replace(coalesce(v, ''), '^\s+|\s+$', '', 'g'), '');
  if length(v) > maxlen then raise exception '% is too long (% characters at most)', label, maxlen using errcode = '22001'; end if;
  return v;
end $$;

-- A list from a fixed vocabulary: deduplicated, in the order given.
create or replace function public.sa_reg_list(label text, v text[], allowed text[], maxn int) returns text[] language plpgsql immutable as $$
declare bad text; out text[];
begin
  out := array(select x from unnest(coalesce(v, '{}')) with ordinality u(x, i) where x is not null group by x order by min(i));
  if allowed is not null then
    select x into bad from unnest(out) x where not x = any (allowed) limit 1;
    if bad is not null then raise exception '% has an unknown value: %', label, bad using errcode = '22023'; end if;
  end if;
  if cardinality(out) > maxn then raise exception '% takes % at most', label, maxn using errcode = '22023'; end if;
  return out;
end $$;

-- A JSON array of strings as text[] (null and JSON null are empty).
create or replace function public.sa_reg_jarr(label text, j jsonb) returns text[] language plpgsql immutable as $$
begin
  if j is null or jsonb_typeof(j) = 'null' then return '{}'; end if;
  if jsonb_typeof(j) <> 'array' then raise exception '% should be a list', label using errcode = '22023'; end if;
  return array(select jsonb_array_elements_text(j));
end $$;

create or replace function public.sa_reg_tz(v text) returns text language plpgsql stable as $$
begin
  v := public.sa_reg_text('Time zone', v, 64);
  if v is not null and not exists (select 1 from pg_timezone_names where name = v) then
    raise exception 'Unknown time zone: %', v using errcode = '22023';
  end if;
  return v;
end $$;

create or replace function public.sa_reg_email(v text) returns text language plpgsql immutable as $$
begin
  v := lower(public.sa_reg_text('Email', v, 200));
  if v is not null and v !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'That email doesn''t look right' using errcode = '22023'; end if;
  return v;
end $$;

-- A numeric id from text (auth.identities.provider_id), or null.
create or replace function public.sa_reg_id(v text) returns bigint language sql immutable as $$
  select case when v ~ '^[1-9][0-9]{0,18}$' and v::numeric <= 9223372036854775807 then v::bigint end
$$;

-- An account's Discord identity, if it has one. Discord isn't enabled as a
-- sign-in provider yet; GoTrue puts the username in full_name, and
-- "username#discriminator" in name.
create or replace function public.sa_discord(uid uuid, out discord_id text, out username text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare d jsonb;
begin
  select identity_data, provider_id into d, discord_id from auth.identities
    where user_id = uid and provider = 'discord'
    order by last_sign_in_at desc nulls last
    limit 1;
  username := nullif(coalesce(d->>'full_name', split_part(d->>'name', '#', 1)), '');
end $$;

-- What each level sees of a person (p) and their profile (pr, may be null).
create or replace function public.sa_reg_card(p public.sa_people, pr public.sa_profiles) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', p.id,
    'name', p.display_name,
    'city', case when p.map = 'city' then p.city end,
    'country', case when p.map in ('city', 'country') then p.country end,
    'lat', case when p.map = 'city' then round(p.lat::numeric, 2) end,
    'lng', case when p.map = 'city' then round(p.lng::numeric, 2) end,
    'tz', case when p.map in ('city', 'country') then p.tz end,
    'disciplines', to_jsonb(coalesce(pr.map_disciplines, '{}'::text[])),
    'blurb', pr.blurb,
    'discord', p.discord_username,
    'github', p.github_login,
    'joined', to_char(coalesce(p.claimed_at, p.created_at) at time zone 'UTC', 'YYYY-MM'))
$$;

create or replace function public.sa_reg_member_view(p public.sa_people, pr public.sa_profiles) returns jsonb language sql stable as $$
  select public.sa_reg_card(p, pr) || jsonb_build_object(
    'city', p.city, 'country', p.country, 'tz', p.tz,
    'has_account', p.user_id is not null,
    'profile', case when pr.person_id is not null then jsonb_build_object(
      'wants_to_build', pr.wants_to_build, 'lanes', pr.lanes, 'can', pr.can, 'learn', pr.learn,
      'experience', pr.experience, 'story', pr.story, 'tools', pr.tools, 'build', pr.build,
      'travel', pr.travel, 'hours', pr.hours, 'availability', pr.availability, 'wants', pr.wants,
      'never', pr.never, 'links', pr.links, 'blurb', pr.blurb, 'map_disciplines', pr.map_disciplines,
      'agent_drafted', pr.agent_drafted, 'updated_at', pr.updated_at, 'finished_at', pr.finished_at) end)
$$;

-- Their own record: the member view plus their choices about the map and calls.
create or replace function public.sa_reg_self_view(p public.sa_people, pr public.sa_profiles) returns jsonb language sql stable as $$
  select public.sa_reg_member_view(p, pr)
    || jsonb_build_object('lat', p.lat, 'lng', p.lng, 'map', p.map, 'ref', p.ref, 'claimed_at', p.claimed_at)
    || case when pr.person_id is not null then jsonb_build_object('profile', public.sa_reg_member_view(p, pr)->'profile'
         || jsonb_build_object('call_ok', pr.call_ok, 'call_windows', pr.call_windows, 'heard_from', pr.heard_from)) else '{}'::jsonb end
$$;

create or replace function public.sa_reg_team_view(p public.sa_people, pr public.sa_profiles) returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select public.sa_reg_self_view(p, pr) || jsonb_build_object(
    'email', p.email, 'source', p.source, 'added_by', p.added_by, 'user_id', p.user_id, 'created_at', p.created_at,
    -- The resolved ids (Discord's as text: a snowflake is past what JSON numbers keep exactly).
    'github_id', p.github_id, 'discord_id', p.discord_id::text,
    'outreach', coalesce((select jsonb_agg(jsonb_build_object('kind', o.kind, 'owner_id', o.owner_id, 'status', o.status,
        'next_step', o.next_step, 'good_for', o.good_for, 'intro_queue', o.intro_queue, 'updated_at', o.updated_at) order by o.kind)
      from public.sa_outreach o where o.person_id = p.id), '[]'),
    'guess', (select jsonb_build_object('disciplines', g.disciplines, 'tools', g.tools, 'updated_at', g.updated_at)
      from public.sa_team_guesses g where g.person_id = p.id),
    'note_count', (select count(*) from public.sa_person_notes n where n.person_id = p.id),
    'call_notes', (select count(*) from public.sa_person_notes n where n.person_id = p.id and n.kind = 'call'),
    'open_matches', (select count(*) from public.sa_possible_matches m where m.person_id = p.id and m.settled_at is null))
$$;

-- An account's display name for the registry: its workspace name, then
-- GitHub's, then the email's first part.
create or replace function public.sa_reg_account_name(uid uuid) returns text language sql stable security definer set search_path = public, pg_temp as $$
  select left(coalesce(
    (select nullif(display_name, '') from public.sa_members where user_id = uid),
    (select name from public.sa_github(uid)),
    (select login from public.sa_github(uid)),
    (select nullif(split_part(email, '@', 1), '') from auth.users where id = uid),
    'Arrow member'), 80)
$$;

-- A person row of their own, made from the account. Ids their sign-in
-- identities prove are recorded when no other row holds them.
create or replace function public.sa_reg_own_row(uid uuid, p_ref text) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare gh record; dc record; gh_id bigint; dc_id bigint; pid uuid;
begin
  select id into pid from public.sa_people where user_id = uid;
  if pid is not null then return pid; end if;
  select * into gh from public.sa_github(uid);
  select * into dc from public.sa_discord(uid);
  gh_id := public.sa_reg_id(gh.github_id);
  dc_id := public.sa_reg_id(dc.discord_id);
  if exists (select 1 from public.sa_people where github_id = gh_id) then gh_id := null; end if;
  if exists (select 1 from public.sa_people where discord_id = dc_id) then dc_id := null; end if;
  insert into public.sa_people (user_id, display_name, github_login, github_id, discord_username, discord_id, source, ref, claimed_at)
  values (uid, public.sa_reg_account_name(uid),
    case when gh_id is not null then left(gh.login, 39) end, gh_id,
    case when dc_id is not null then left(dc.username, 40) end, dc_id,
    'Signed up', case when lower(p_ref) ~ '^[a-z0-9][a-z0-9._-]{0,63}$' then lower(p_ref) end, now())
  on conflict (user_id) do nothing
  returning id into pid;
  if pid is null then select id into pid from public.sa_people where user_id = uid; end if;
  return pid;
end $$;

-- Linking ------------------------------------------------------------------
-- Finds the record an account belongs to. Returns {person_id, linked, how, possible}.
create or replace function public.sa_registry_link(uid uuid, p_ref text) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  mine public.sa_people;
  hit public.sa_people;
  gh record;
  dc record;
  gh_id bigint;
  dc_id bigint;
  mail text;
  nm text;
  v_how text;
  n int := 0;
  c record;
begin
  select * into gh from public.sa_github(uid);
  select * into dc from public.sa_discord(uid);
  gh_id := public.sa_reg_id(gh.github_id);
  dc_id := public.sa_reg_id(dc.discord_id);
  select lower(email) into mail from auth.users where id = uid;
  nm := public.sa_reg_account_name(uid);

  select * into mine from public.sa_people where user_id = uid;
  if mine.id is not null then
    -- Already theirs. A GitHub rename follows the id.
    if gh_id is not null and mine.github_id = gh_id and gh.login is not null and mine.github_login is distinct from gh.login then
      update public.sa_people set github_login = left(gh.login, 39), updated_at = now() where id = mine.id;
    end if;
    -- A record the team added after they joined, holding an account of
    -- theirs: a lead folds the two together.
    insert into public.sa_possible_matches (person_id, user_id, account_person_id, reason)
    select p.id, uid, mine.id, case when p.github_id = gh_id then 'same GitHub account, added after they joined'
        when p.discord_id = dc_id then 'same Discord account, added after they joined' else 'same proven email, added after they joined' end
    from public.sa_people p
    where p.user_id is null and p.claimed_at is null
      and ((gh_id is not null and p.github_id = gh_id) or (dc_id is not null and p.discord_id = dc_id)
        or (mail is not null and lower(p.email) = mail and public.sa_forum_email_proven(uid)))
    on conflict (person_id, user_id) do nothing;
    get diagnostics n = row_count;
    return jsonb_build_object('person_id', mine.id, 'linked', false, 'how', null, 'possible', n);
  end if;

  -- 1. The GitHub or Discord account the team resolved when it added them,
  --    unless the record names a different account for the other provider.
  select * into hit from public.sa_people p
    where p.user_id is null and p.claimed_at is null
      and ((gh_id is not null and p.github_id = gh_id) or (dc_id is not null and p.discord_id = dc_id))
      and not (p.github_id is not null and gh_id is not null and p.github_id <> gh_id)
      and not (p.discord_id is not null and dc_id is not null and p.discord_id <> dc_id)
    order by (p.github_id = gh_id) is true desc, p.created_at
    limit 1
    for update;
  if hit.id is not null then
    v_how := case when hit.github_id = gh_id then 'github' else 'discord' end;
  -- 2. The email on the record, when the account's email is proven.
  elsif mail is not null and public.sa_forum_email_proven(uid) then
    select * into hit from public.sa_people p
      where p.user_id is null and p.claimed_at is null and lower(p.email) = mail
        and not (p.github_id is not null and gh_id is not null and p.github_id <> gh_id)
        and not (p.discord_id is not null and dc_id is not null and p.discord_id <> dc_id)
      for update;
    if hit.id is not null then v_how := 'email'; end if;
  end if;

  if hit.id is not null then
    update public.sa_people set
      user_id = uid, claimed_at = now(), updated_at = now(),
      github_id = coalesce(github_id, case when not exists (select 1 from public.sa_people x where x.github_id = gh_id) then gh_id end),
      github_login = case when gh_id is not null and coalesce(github_id, gh_id) = gh_id then coalesce(left(gh.login, 39), github_login) else github_login end,
      discord_id = coalesce(discord_id, case when not exists (select 1 from public.sa_people x where x.discord_id = dc_id) then dc_id end),
      discord_username = case when dc_id is not null and coalesce(discord_id, dc_id) = dc_id then coalesce(left(dc.username, 40), discord_username) else discord_username end,
      ref = coalesce(ref, case when lower(p_ref) ~ '^[a-z0-9][a-z0-9._-]{0,63}$' then lower(p_ref) end)
    where id = hit.id and user_id is null and claimed_at is null;
    if found then
      -- Anyone else proposed for this record can't be them now.
      update public.sa_possible_matches set settled_at = now(), outcome = 'superseded'
        where person_id = hit.id and settled_at is null;
      return jsonb_build_object('person_id', hit.id, 'linked', true, 'how', v_how, 'possible', 0);
    end if;
  end if;

  -- 3. Weaker: the same name, a handle the team couldn't resolve to an id, an
  --    email that isn't proven. A lead decides; the account gets its own row.
  for c in
    select p.id, concat_ws(', ',
        case when lower(p.display_name) = lower(nm) then 'same name' end,
        case when gh.login is not null and p.github_id is null and lower(p.github_login) = lower(gh.login) then 'same GitHub login, unresolved' end,
        case when dc.username is not null and p.discord_id is null and lower(p.discord_username) = lower(dc.username) then 'same Discord username, unresolved' end,
        case when mail is not null and lower(p.email) = mail then
          case when public.sa_forum_email_proven(uid) then 'same email, but another GitHub or Discord account' else 'same email, not proven' end end,
        case when (gh_id is not null and p.github_id = gh_id) or (dc_id is not null and p.discord_id = dc_id) then 'same GitHub or Discord account, but the other differs' end
      ) as why
    from public.sa_people p
    where p.user_id is null and p.claimed_at is null and (
      lower(p.display_name) = lower(nm)
      or (gh.login is not null and p.github_id is null and lower(p.github_login) = lower(gh.login))
      or (dc.username is not null and p.discord_id is null and lower(p.discord_username) = lower(dc.username))
      or (mail is not null and lower(p.email) = mail)
      or (gh_id is not null and p.github_id = gh_id)
      or (dc_id is not null and p.discord_id = dc_id))
    order by p.created_at
    limit 5
  loop
    if mine.id is null then mine.id := public.sa_reg_own_row(uid, p_ref); end if;
    insert into public.sa_possible_matches (person_id, user_id, account_person_id, reason)
    values (c.id, uid, mine.id, c.why)
    on conflict (person_id, user_id) do nothing;
    n := n + 1;
  end loop;
  return jsonb_build_object('person_id', mine.id, 'linked', false, 'how', null, 'possible', n);
end $$;

-- The app calls this right after sign-in (beside sa_join).
create or replace function public.sa_registry_claim(p_ref text default null) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  return public.sa_registry_link(public.sa_uid(), p_ref);
end $$;

-- A lead settles a "same person?" card. Same: the account's own row (and the
-- profile they wrote) folds into the team's record, which keeps its notes,
-- outreach and guesses. Returns the person the account ends up with.
create or replace function public.sa_link_person(p_match uuid, p_same boolean) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_require_lead();
  m public.sa_possible_matches;
  rec public.sa_people;
  mine public.sa_people;
  said boolean;
begin
  select * into m from public.sa_possible_matches where id = p_match for update;
  if m.id is null then raise exception 'No such match'; end if;
  if m.settled_at is not null then raise exception 'That was settled already'; end if;
  select * into mine from public.sa_people where user_id = m.user_id for update;
  if not coalesce(p_same, false) then
    update public.sa_possible_matches set settled_at = now(), settled_by = uid, outcome = 'different' where id = p_match;
    return mine.id;
  end if;

  select * into rec from public.sa_people where id = m.person_id for update;
  if rec.user_id is not null or rec.claimed_at is not null then
    raise exception 'That record is already linked to an account' using errcode = '42501';
  end if;
  if mine.id is not null and mine.added_by is not null then
    raise exception 'That account is already linked to a record the team added' using errcode = '42501';
  end if;

  said := exists (select 1 from public.sa_profiles where person_id = mine.id);
  if mine.id is not null then
    update public.sa_profiles set person_id = rec.id where person_id = mine.id;
    update public.sa_person_notes set person_id = rec.id where person_id = mine.id;
    update public.sa_skill_checks set person_id = rec.id where person_id = mine.id;
    update public.sa_outreach o set person_id = rec.id where o.person_id = mine.id
      and not exists (select 1 from public.sa_outreach x where x.person_id = rec.id and x.kind = o.kind);
    update public.sa_team_guesses set person_id = rec.id where person_id = mine.id
      and not exists (select 1 from public.sa_team_guesses x where x.person_id = rec.id);
    update public.sa_possible_matches set account_person_id = rec.id where account_person_id = mine.id;
    delete from public.sa_people where id = mine.id;
  end if;
  -- What they said about themselves wins over what the team typed (their name
  -- only once they've saved a profile: before that it's the account's); the
  -- ids the team resolved stay.
  update public.sa_people set
    user_id = m.user_id, claimed_at = now(), updated_at = now(),
    display_name = case when said then mine.display_name else display_name end,
    github_login = case when github_id is null and mine.github_id is not null then mine.github_login else coalesce(github_login, mine.github_login) end,
    github_id = coalesce(github_id, mine.github_id),
    discord_username = case when discord_id is null and mine.discord_id is not null then mine.discord_username else coalesce(discord_username, mine.discord_username) end,
    discord_id = coalesce(discord_id, mine.discord_id),
    city = coalesce(mine.city, city), country = coalesce(mine.country, country),
    lat = coalesce(mine.lat, lat), lng = coalesce(mine.lng, lng), tz = coalesce(mine.tz, tz),
    map = coalesce(mine.map, 'off'),
    ref = coalesce(mine.ref, ref)
  where id = rec.id;
  update public.sa_possible_matches set settled_at = now(), settled_by = uid, outcome = 'same' where id = p_match;
  update public.sa_possible_matches set settled_at = now(), settled_by = uid, outcome = 'superseded'
    where person_id = rec.id and settled_at is null;
  return rec.id;
end $$;

-- The person's own profile -------------------------------------------------
-- p_profile holds only the fields being saved (the wizard saves a step at a
-- time). p_finish marks the profile done, which needs wants_to_build.
create or replace function public.sa_save_profile(p_profile jsonb, p_finish boolean default false) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_uid();
  p jsonb := coalesce(p_profile, '{}');
  pid uuid;
  bad text;
  v_name text;
  v_blurb text;
  v_links jsonb;
begin
  if not exists (select 1 from public.sa_members where user_id = uid) then
    raise exception 'Join the workspace first' using errcode = '42501';
  end if;
  if jsonb_typeof(p) <> 'object' then raise exception 'A profile is a set of fields' using errcode = '22023'; end if;
  select k into bad from jsonb_object_keys(p) k where k <> all (array['ref', 'display_name', 'discord', 'city', 'country', 'lat', 'lng', 'tz', 'map',
    'wants_to_build', 'lanes', 'can', 'learn', 'experience', 'story', 'tools', 'build', 'travel', 'hours', 'availability', 'wants',
    'never', 'links', 'heard_from', 'blurb', 'map_disciplines', 'call_ok', 'call_windows', 'agent_drafted']) limit 1;
  if bad is not null then raise exception 'Unknown profile field: %', bad using errcode = '22023'; end if;

  select id into pid from public.sa_people where user_id = uid;
  if pid is null then
    pid := (public.sa_registry_link(uid, p->>'ref')->>'person_id')::uuid;
  end if;
  if pid is null then pid := public.sa_reg_own_row(uid, p->>'ref'); end if;

  if p ? 'display_name' then
    v_name := public.sa_reg_text('Your name', p->>'display_name', 80);
    if v_name is null then raise exception 'Your name can''t be empty' using errcode = '22023'; end if;
  end if;
  if p ? 'map' and coalesce(p->>'map', '') not in ('city', 'country', 'off') then
    raise exception 'The map shows your city, your country, or nothing' using errcode = '22023';
  end if;
  update public.sa_people set
    display_name = coalesce(v_name, display_name),
    -- A Discord handle they type is theirs to state; one their sign-in proves wins.
    discord_username = case when p ? 'discord' and discord_id is null then ltrim(public.sa_reg_text('Discord username', p->>'discord', 40), '@') else discord_username end,
    city = case when p ? 'city' then public.sa_reg_text('City', p->>'city', 80) else city end,
    country = case when p ? 'country' then public.sa_reg_text('Country', p->>'country', 60) else country end,
    lat = case when p ? 'lat' then (p->>'lat')::double precision else lat end,
    lng = case when p ? 'lng' then (p->>'lng')::double precision else lng end,
    tz = case when p ? 'tz' then public.sa_reg_tz(p->>'tz') else tz end,
    map = case when p ? 'map' then p->>'map' else map end,
    updated_at = now()
  where id = pid;

  if p ? 'blurb' then
    v_blurb := public.sa_reg_text('The blurb', p->>'blurb', 140);
    if public.sa_registry_has_url(v_blurb) then
      raise exception 'Keep links out of the blurb; add them under Links' using errcode = '22023';
    end if;
  end if;
  if p ? 'links' then
    v_links := coalesce(nullif(p->'links', 'null'::jsonb), '[]');
    if jsonb_typeof(v_links) <> 'array' or jsonb_array_length(v_links) > 12 then raise exception 'Links: a list of 12 at most' using errcode = '22023'; end if;
    if exists (select 1 from jsonb_array_elements(v_links) e
               where jsonb_typeof(e) <> 'object' or coalesce(e->>'url', '') !~ '^https?://\S+$' or length(e->>'url') > 500 or length(coalesce(e->>'label', '')) > 80) then
      raise exception 'Each link needs an http(s) address' using errcode = '22023';
    end if;
    v_links := (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('label', nullif(e->>'label', ''), 'url', e->>'url'))), '[]') from jsonb_array_elements(v_links) e);
  end if;

  insert into public.sa_profiles (person_id) values (pid) on conflict (person_id) do nothing;
  if p ? 'wants_to_build' and public.sa_reg_text('What you want to build', p->>'wants_to_build', 500) is null
     and exists (select 1 from public.sa_profiles where person_id = pid and finished_at is not null) then
    raise exception 'What you want to build can''t be empty' using errcode = '22023';
  end if;
  update public.sa_profiles set
    wants_to_build = case when p ? 'wants_to_build' then public.sa_reg_text('What you want to build', p->>'wants_to_build', 500) else wants_to_build end,
    lanes = case when p ? 'lanes' then public.sa_reg_list('Lanes', public.sa_reg_jarr('Lanes', p->'lanes'), array['engineer', 'hardware', 'fly', 'code', 'story', 'dao', 'follow'], 7) else lanes end,
    can = case when p ? 'can' then public.sa_reg_list('Disciplines', public.sa_reg_jarr('Disciplines', p->'can'), public.sa_taxonomy(), 43) else can end,
    learn = case when p ? 'learn' then public.sa_reg_list('Want to learn', public.sa_reg_jarr('Want to learn', p->'learn'), public.sa_taxonomy(), 43) else learn end,
    experience = case when p ? 'experience' then public.sa_reg_text('Experience', p->>'experience', 1000) else experience end,
    story = case when p ? 'story' then public.sa_reg_text('Your story', p->>'story', 4000) else story end,
    tools = case when p ? 'tools' then public.sa_reg_list('Tools', public.sa_reg_jarr('Tools', p->'tools'), public.sa_registry_tools(), 13) else tools end,
    build = case when p ? 'build' then public.sa_reg_list('Build', public.sa_reg_jarr('Build', p->'build'), array['own', 'parts', 'day', 'host', 'fly'], 5) else build end,
    travel = case when p ? 'travel' then public.sa_reg_text('Travel', p->>'travel', 120) else travel end,
    hours = case when p ? 'hours' then public.sa_reg_text('Hours', p->>'hours', 60) else hours end,
    availability = case when p ? 'availability' then public.sa_reg_text('When', p->>'availability', 120) else availability end,
    wants = case when p ? 'wants' then public.sa_reg_list('What you want', public.sa_reg_jarr('What you want', p->'wants'), array['learning', 'paid', 'mission', 'job', 'business', 'own'], 6) else wants end,
    never = case when p ? 'never' then public.sa_reg_text('Never ask me', p->>'never', 500) else never end,
    links = case when p ? 'links' then v_links else links end,
    heard_from = case when p ? 'heard_from' then public.sa_reg_text('How you heard', p->>'heard_from', 200) else heard_from end,
    blurb = case when p ? 'blurb' then v_blurb else blurb end,
    map_disciplines = case when p ? 'map_disciplines' then public.sa_reg_list('Map disciplines', public.sa_reg_jarr('Map disciplines', p->'map_disciplines'), public.sa_taxonomy(), 3) else map_disciplines end,
    call_ok = case when p ? 'call_ok' then coalesce((p->>'call_ok')::boolean, false) else call_ok end,
    call_windows = case when p ? 'call_windows' then public.sa_reg_text('Call times', p->>'call_windows', 300) else call_windows end,
    agent_drafted = case when p ? 'agent_drafted' then coalesce((p->>'agent_drafted')::boolean, false) else agent_drafted end,
    updated_at = now()
  where person_id = pid;
  if coalesce(p_finish, false) then
    if (select wants_to_build from public.sa_profiles where person_id = pid) is null then
      raise exception 'Tell us what you want to build first' using errcode = '22023';
    end if;
    update public.sa_profiles set finished_at = coalesce(finished_at, now()) where person_id = pid;
  end if;
  return public.sa_my_profile();
end $$;

-- Reads ------------------------------------------------------------------
-- The map: anyone, only people who chose it.
create or replace function public.sa_registry_cards() returns setof jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select public.sa_reg_card(p, pr)
  from public.sa_people p join public.sa_profiles pr on pr.person_id = p.id
  where p.user_id is not null and p.map in ('city', 'country') and pr.finished_at is not null
  order by p.claimed_at
$$;

-- The signed-in account's own record, or null.
create or replace function public.sa_my_profile() returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select public.sa_reg_self_view(p, pr)
  from public.sa_people p left join public.sa_profiles pr on pr.person_id = p.id
  where p.user_id = auth.uid()
$$;

-- The registry list: members see people with accounts; core and leads see
-- everyone, with what the team knows.
create or replace function public.sa_registry_people() returns setof jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare r text := public.sa_registry_role();
begin
  perform public.sa_uid();
  if r is null then raise exception 'Members only' using errcode = '42501'; end if;
  if r in ('core', 'lead') then
    return query select public.sa_reg_team_view(p, pr)
      from public.sa_people p left join public.sa_profiles pr on pr.person_id = p.id
      order by coalesce(p.claimed_at, p.created_at) desc;
  else
    return query select case when p.user_id = auth.uid() then public.sa_reg_self_view(p, pr) else public.sa_reg_member_view(p, pr) end
      from public.sa_people p left join public.sa_profiles pr on pr.person_id = p.id
      where p.user_id is not null
      order by p.claimed_at desc;
  end if;
end $$;

-- One person. Core and leads also get notes (with earlier versions), outreach
-- history, skill checks and open "same person?" cards.
create or replace function public.sa_registry_person(p_person uuid) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_uid();
  r text := public.sa_registry_role();
  p public.sa_people;
  pr public.sa_profiles;
begin
  if r is null then raise exception 'Members only' using errcode = '42501'; end if;
  select * into p from public.sa_people where id = p_person;
  if p.id is null or (r not in ('core', 'lead') and p.user_id is null) then raise exception 'No such person'; end if;
  select * into pr from public.sa_profiles where person_id = p.id;
  if r not in ('core', 'lead') then
    return case when p.user_id = uid then public.sa_reg_self_view(p, pr) else public.sa_reg_member_view(p, pr) end;
  end if;
  return public.sa_reg_team_view(p, pr) || jsonb_build_object(
    'notes', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'body', n.body, 'author_id', n.author_id,
        'created_at', n.created_at, 'edited_at', n.edited_at,
        'edits', coalesce((select jsonb_agg(jsonb_build_object('body', e.body, 'written_at', e.written_at, 'replaced_at', e.replaced_at, 'replaced_by', e.replaced_by) order by e.id)
          from public.sa_person_note_edits e where e.note_id = n.id), '[]')) order by n.created_at desc)
      from public.sa_person_notes n where n.person_id = p.id), '[]'),
    'outreach', coalesce((select jsonb_agg(to_jsonb(o) - 'person_id' order by o.kind) from public.sa_outreach o where o.person_id = p.id), '[]'),
    'skill_checks', coalesce((select jsonb_agg(to_jsonb(s) - 'person_id' order by s.checked_at desc) from public.sa_skill_checks s where s.person_id = p.id), '[]'),
    'matches', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'user_id', m.user_id, 'account_person_id', m.account_person_id,
        'account_name', (select display_name from public.sa_people a where a.id = m.account_person_id), 'reason', m.reason, 'created_at', m.created_at) order by m.created_at)
      from public.sa_possible_matches m where m.person_id = p.id and m.settled_at is null), '[]'));
end $$;

-- "Same person?" cards waiting for a lead.
create or replace function public.sa_registry_matches() returns setof jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.sa_require_team();
  return query select jsonb_build_object('id', m.id, 'person_id', m.person_id, 'person_name', p.display_name,
    'user_id', m.user_id, 'account_person_id', m.account_person_id, 'account_name', a.display_name,
    'reason', m.reason, 'created_at', m.created_at)
  from public.sa_possible_matches m
  join public.sa_people p on p.id = m.person_id
  left join public.sa_people a on a.id = m.account_person_id
  where m.settled_at is null
  order by m.created_at;
end $$;

-- Duplicate candidates before the team adds someone: by name, Discord,
-- GitHub or email.
create or replace function public.sa_find_people(p_name text default null, p_discord text default null, p_github text default null,
  p_email text default null, p_github_id bigint default null, p_discord_id bigint default null)
returns setof jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_require_team();
  nm text := lower(public.sa_reg_text('Name', p_name, 80));
  dc text := lower(ltrim(public.sa_reg_text('Discord', p_discord, 40), '@'));
  gh text := lower(ltrim(public.sa_reg_text('GitHub', p_github, 39), '@'));
  em text := public.sa_reg_email(p_email);
begin
  return query
  select jsonb_build_object('id', p.id, 'name', p.display_name, 'github', p.github_login, 'discord', p.discord_username,
      'email', p.email, 'has_account', p.user_id is not null, 'source', p.source,
      'why', to_jsonb(array_remove(array[
        case when nm is not null and (lower(p.display_name) = nm or (length(nm) >= 4 and (lower(p.display_name) like '%' || nm || '%' or nm like '%' || lower(p.display_name) || '%'))) then 'name' end,
        case when (dc is not null and lower(p.discord_username) = dc) or (p_discord_id is not null and p.discord_id = p_discord_id) then 'discord' end,
        case when (gh is not null and lower(p.github_login) = gh) or (p_github_id is not null and p.github_id = p_github_id) then 'github' end,
        case when em is not null and lower(p.email) = em then 'email' end], null)))
  from public.sa_people p
  where (nm is not null and (lower(p.display_name) = nm or (length(nm) >= 4 and (lower(p.display_name) like '%' || nm || '%' or nm like '%' || lower(p.display_name) || '%'))))
     or (dc is not null and lower(p.discord_username) = dc)
     or (gh is not null and lower(p.github_login) = gh)
     or (em is not null and lower(p.email) = em)
     or (p_github_id is not null and p.github_id = p_github_id)
     or (p_discord_id is not null and p.discord_id = p_discord_id)
  order by p.created_at
  limit 20;
end $$;

-- Team writes ------------------------------------------------------------
-- Someone the team knows who may not have an account. Ids are the ones the app
-- resolved (Discord's member search, GitHub's API), or null; a handle alone
-- never links a record to anyone.
create or replace function public.sa_add_person(
  p_name text, p_source text,
  p_github_login text default null, p_github_id bigint default null,
  p_discord_username text default null, p_discord_id bigint default null,
  p_email text default null, p_city text default null, p_country text default null,
  p_lat double precision default null, p_lng double precision default null, p_tz text default null,
  p_guess_disciplines text[] default null, p_guess_tools text[] default null,
  p_owner uuid default null, p_note text default null, p_intro_queue boolean default false, p_good_for text[] default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_require_team();
  v_name text := public.sa_reg_text('Name', p_name, 80);
  v_source text := public.sa_reg_text('Where you know them from', p_source, 200);
  v_email text := public.sa_reg_email(p_email);
  v_guess text[] := public.sa_reg_list('Disciplines', p_guess_disciplines, public.sa_taxonomy(), 43);
  v_tools text[] := public.sa_reg_list('Tools', p_guess_tools, public.sa_registry_tools(), 13);
  v_good text[] := public.sa_reg_list('Good for', array(select public.sa_reg_text('Good for', x, 80) from unnest(coalesce(p_good_for, '{}')) x), null, 12);
  v_note text := public.sa_reg_text('The note', p_note, 8000);
  dup text;
  pid uuid;
begin
  if v_name is null then raise exception 'A name is required' using errcode = '22023'; end if;
  if v_source is null then raise exception 'Say where you know them from' using errcode = '22023'; end if;
  select display_name into dup from public.sa_people
    where github_id = p_github_id or discord_id = p_discord_id or lower(email) = v_email limit 1;
  if dup is not null then raise exception 'Already in the registry: %', dup using errcode = '23505'; end if;
  if p_owner is not null and not exists (select 1 from public.sa_members where user_id = p_owner and role in ('core', 'lead')) then
    raise exception 'The owner has to be core or a lead' using errcode = '22023';
  end if;
  insert into public.sa_people (display_name, github_login, github_id, discord_username, discord_id, email, city, country, lat, lng, tz, source, added_by)
  values (v_name, ltrim(public.sa_reg_text('GitHub login', p_github_login, 39), '@'), p_github_id,
    ltrim(public.sa_reg_text('Discord username', p_discord_username, 40), '@'), p_discord_id, v_email,
    public.sa_reg_text('City', p_city, 80), public.sa_reg_text('Country', p_country, 60), p_lat, p_lng, public.sa_reg_tz(p_tz), v_source, uid)
  returning id into pid;
  insert into public.sa_outreach (person_id, kind, owner_id, good_for, intro_queue, history, updated_by)
  values (pid, 'intro', p_owner, v_good, coalesce(p_intro_queue, false),
    jsonb_build_array(jsonb_build_object('at', now(), 'by', uid, 'note', 'Added: ' || v_source)), uid);
  if cardinality(v_guess) > 0 or cardinality(v_tools) > 0 then
    insert into public.sa_team_guesses (person_id, disciplines, tools, updated_by) values (pid, v_guess, v_tools, uid);
  end if;
  if v_note is not null then
    insert into public.sa_person_notes (person_id, kind, body, author_id) values (pid, 'note', v_note, uid);
  end if;
  return pid;
end $$;

-- Fields the team may change. On a record with an account, only the team's
-- own fields (email, source, guesses): the rest is the person's to say.
create or replace function public.sa_update_person(p_person uuid, p_fields jsonb) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_require_team();
  f jsonb := coalesce(p_fields, '{}');
  p public.sa_people;
  bad text;
  v_name text;
  v_source text;
  v_email text;
begin
  if jsonb_typeof(f) <> 'object' then raise exception 'Fields is an object' using errcode = '22023'; end if;
  select k into bad from jsonb_object_keys(f) k where k <> all (array['display_name', 'source', 'github_login', 'github_id', 'discord_username',
    'discord_id', 'email', 'city', 'country', 'lat', 'lng', 'tz', 'guess_disciplines', 'guess_tools']) limit 1;
  if bad is not null then raise exception 'Unknown field: %', bad using errcode = '22023'; end if;
  select * into p from public.sa_people where id = p_person for update;
  if p.id is null then raise exception 'No such person'; end if;
  if p.user_id is not null or p.claimed_at is not null then
    select k into bad from jsonb_object_keys(f) k where k <> all (array['source', 'email', 'guess_disciplines', 'guess_tools']) limit 1;
    if bad is not null then raise exception 'They have an account now, so % is theirs to change', bad using errcode = '42501'; end if;
  end if;
  if f ? 'display_name' then
    v_name := public.sa_reg_text('Name', f->>'display_name', 80);
    if v_name is null then raise exception 'A name is required' using errcode = '22023'; end if;
  end if;
  if f ? 'source' then
    v_source := public.sa_reg_text('Where you know them from', f->>'source', 200);
    if v_source is null then raise exception 'Say where you know them from' using errcode = '22023'; end if;
  end if;
  if f ? 'email' then
    v_email := public.sa_reg_email(f->>'email');
    if v_email is not null and exists (select 1 from public.sa_people where lower(email) = v_email and id <> p.id) then
      raise exception 'Already in the registry: %', (select display_name from public.sa_people where lower(email) = v_email) using errcode = '23505';
    end if;
  end if;
  if exists (select 1 from public.sa_people x where x.id <> p.id and (
      (f ? 'github_id' and x.github_id = (f->>'github_id')::bigint) or (f ? 'discord_id' and x.discord_id = (f->>'discord_id')::bigint))) then
    raise exception 'Already in the registry: %', (select display_name from public.sa_people x where x.id <> p.id and (
      (f ? 'github_id' and x.github_id = (f->>'github_id')::bigint) or (f ? 'discord_id' and x.discord_id = (f->>'discord_id')::bigint)) limit 1) using errcode = '23505';
  end if;
  update public.sa_people set
    display_name = coalesce(v_name, display_name),
    source = coalesce(v_source, source),
    email = case when f ? 'email' then v_email else email end,
    github_login = case when f ? 'github_login' then ltrim(public.sa_reg_text('GitHub login', f->>'github_login', 39), '@') else github_login end,
    github_id = case when f ? 'github_id' then (f->>'github_id')::bigint else github_id end,
    discord_username = case when f ? 'discord_username' then ltrim(public.sa_reg_text('Discord username', f->>'discord_username', 40), '@') else discord_username end,
    discord_id = case when f ? 'discord_id' then (f->>'discord_id')::bigint else discord_id end,
    city = case when f ? 'city' then public.sa_reg_text('City', f->>'city', 80) else city end,
    country = case when f ? 'country' then public.sa_reg_text('Country', f->>'country', 60) else country end,
    lat = case when f ? 'lat' then (f->>'lat')::double precision else lat end,
    lng = case when f ? 'lng' then (f->>'lng')::double precision else lng end,
    tz = case when f ? 'tz' then public.sa_reg_tz(f->>'tz') else tz end,
    updated_at = now()
  where id = p.id;
  if f ? 'guess_disciplines' or f ? 'guess_tools' then
    insert into public.sa_team_guesses (person_id, updated_by) values (p.id, uid) on conflict (person_id) do nothing;
    update public.sa_team_guesses set
      disciplines = case when f ? 'guess_disciplines' then public.sa_reg_list('Disciplines', public.sa_reg_jarr('Disciplines', f->'guess_disciplines'), public.sa_taxonomy(), 43) else disciplines end,
      tools = case when f ? 'guess_tools' then public.sa_reg_list('Tools', public.sa_reg_jarr('Tools', f->'guess_tools'), public.sa_registry_tools(), 13) else tools end,
      updated_at = now(), updated_by = uid
    where person_id = p.id;
  end if;
end $$;

-- A note on someone. A skill note also records the check (discipline and verdict).
create or replace function public.sa_add_note(p_person uuid, p_kind text, p_body text, p_discipline text default null, p_verdict text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_require_team();
  v_body text := public.sa_reg_text('The note', p_body, 8000);
  nid uuid;
begin
  if v_body is null then raise exception 'Write the note first' using errcode = '22023'; end if;
  if coalesce(p_kind, '') not in ('note', 'call', 'review', 'skill') then raise exception 'Unknown kind of note' using errcode = '22023'; end if;
  if not exists (select 1 from public.sa_people where id = p_person) then raise exception 'No such person'; end if;
  if p_kind = 'skill' and (p_discipline is null or not p_discipline = any (public.sa_taxonomy()) or coalesce(p_verdict, '') not in ('seen_work', 'talked', 'tested')) then
    raise exception 'A skill check names a discipline and what you saw (seen_work, talked or tested)' using errcode = '22023';
  end if;
  insert into public.sa_person_notes (person_id, kind, body, author_id) values (p_person, p_kind, v_body, uid) returning id into nid;
  if p_kind = 'skill' then
    insert into public.sa_skill_checks (person_id, discipline, verdict, note_id, checked_by) values (p_person, p_discipline, p_verdict, nid, uid);
  end if;
  return nid;
end $$;

-- Its author, or a lead, edits a note; every earlier version is kept.
create or replace function public.sa_edit_note(p_note uuid, p_body text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_require_team();
  v_body text := public.sa_reg_text('The note', p_body, 8000);
  n public.sa_person_notes;
begin
  if v_body is null then raise exception 'Write the note first' using errcode = '22023'; end if;
  select * into n from public.sa_person_notes where id = p_note for update;
  if n.id is null then raise exception 'No such note'; end if;
  if n.author_id is distinct from uid and public.sa_registry_role() <> 'lead' then
    raise exception 'Only its author or a lead can edit a note' using errcode = '42501';
  end if;
  if v_body = n.body then return; end if;
  insert into public.sa_person_note_edits (note_id, body, written_at, replaced_by) values (n.id, n.body, coalesce(n.edited_at, n.created_at), uid);
  update public.sa_person_notes set body = v_body, edited_at = now() where id = n.id;
end $$;

-- Reaching out to someone: owner, status, next step, good for, the intro-call
-- queue. Null leaves a field as it is; an empty next step clears it;
-- p_unassign clears the owner. Every change goes in the history.
create or replace function public.sa_set_outreach(p_person uuid, p_kind text default 'intro', p_status text default null, p_owner uuid default null,
  p_next_step text default null, p_good_for text[] default null, p_intro_queue boolean default null, p_note text default null, p_unassign boolean default false)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_require_team();
  v_kind text := coalesce(p_kind, 'intro');
  v_note text := public.sa_reg_text('The note', p_note, 300);
  v_good text[];
begin
  if v_kind not in ('intro', 'say_hi') then raise exception 'Unknown kind of outreach' using errcode = '22023'; end if;
  if p_status is not null and p_status not in ('new', 'invited', 'booked', 'talked', 'active', 'quiet', 'skipped') then
    raise exception 'Unknown status: %', p_status using errcode = '22023';
  end if;
  if not exists (select 1 from public.sa_people where id = p_person) then raise exception 'No such person'; end if;
  if p_owner is not null and not exists (select 1 from public.sa_members where user_id = p_owner and role in ('core', 'lead')) then
    raise exception 'The owner has to be core or a lead' using errcode = '22023';
  end if;
  if p_good_for is not null then
    v_good := public.sa_reg_list('Good for', array(select public.sa_reg_text('Good for', x, 80) from unnest(p_good_for) x), null, 12);
  end if;
  insert into public.sa_outreach (person_id, kind, updated_by) values (p_person, v_kind, uid) on conflict (person_id, kind) do nothing;
  update public.sa_outreach set
    status = coalesce(p_status, status),
    owner_id = case when coalesce(p_unassign, false) then null else coalesce(p_owner, owner_id) end,
    next_step = case when p_next_step is not null then public.sa_reg_text('Next step', p_next_step, 300) else next_step end,
    good_for = coalesce(v_good, good_for),
    intro_queue = coalesce(p_intro_queue, intro_queue),
    history = history || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('at', now(), 'by', uid, 'status', p_status,
      'owner', case when coalesce(p_unassign, false) then 'none' else p_owner::text end, 'next_step', p_next_step, 'intro_queue', p_intro_queue, 'note', v_note))),
    updated_at = now(), updated_by = uid
  where person_id = p_person and kind = v_kind;
end $$;

-- Who may call what ------------------------------------------------------
revoke execute on function
  public.sa_taxonomy(), public.sa_registry_tools(), public.sa_registry_has_url(text),
  public.sa_registry_role(), public.sa_require_team(), public.sa_reg_text(text, text, int), public.sa_reg_list(text, text[], text[], int),
  public.sa_reg_jarr(text, jsonb), public.sa_reg_tz(text), public.sa_reg_email(text), public.sa_reg_id(text), public.sa_discord(uuid),
  public.sa_reg_card(public.sa_people, public.sa_profiles), public.sa_reg_member_view(public.sa_people, public.sa_profiles),
  public.sa_reg_self_view(public.sa_people, public.sa_profiles), public.sa_reg_team_view(public.sa_people, public.sa_profiles),
  public.sa_reg_account_name(uuid), public.sa_reg_own_row(uuid, text), public.sa_registry_link(uuid, text),
  public.sa_registry_claim(text), public.sa_link_person(uuid, boolean), public.sa_save_profile(jsonb, boolean),
  public.sa_registry_cards(), public.sa_my_profile(), public.sa_registry_people(), public.sa_registry_person(uuid), public.sa_registry_matches(),
  public.sa_find_people(text, text, text, text, bigint, bigint),
  public.sa_add_person(text, text, text, bigint, text, bigint, text, text, text, double precision, double precision, text, text[], text[], uuid, text, boolean, text[]),
  public.sa_update_person(uuid, jsonb), public.sa_add_note(uuid, text, text, text, text), public.sa_edit_note(uuid, text),
  public.sa_set_outreach(uuid, text, text, uuid, text, text[], boolean, text, boolean)
from public, anon, authenticated;
-- The vocabularies (the table checks use them) and the map are public.
grant execute on function public.sa_taxonomy(), public.sa_registry_tools(), public.sa_registry_has_url(text), public.sa_registry_cards() to anon, authenticated;
grant execute on function
  public.sa_registry_claim(text), public.sa_link_person(uuid, boolean), public.sa_save_profile(jsonb, boolean),
  public.sa_my_profile(), public.sa_registry_people(), public.sa_registry_person(uuid), public.sa_registry_matches(),
  public.sa_find_people(text, text, text, text, bigint, bigint),
  public.sa_add_person(text, text, text, bigint, text, bigint, text, text, text, double precision, double precision, text, text[], text[], uuid, text, boolean, text[]),
  public.sa_update_person(uuid, jsonb), public.sa_add_note(uuid, text, text, text, text), public.sa_edit_note(uuid, text),
  public.sa_set_outreach(uuid, text, text, uuid, text, text[], boolean, text, boolean)
to authenticated;
