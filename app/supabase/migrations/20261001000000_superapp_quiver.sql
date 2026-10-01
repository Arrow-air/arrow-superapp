-- Arrow superapp, Quiver workspace (beta). Lives in the shared Supabase with
-- the flight tracking app so people sign in with the same accounts.
-- Everything is additive and prefixed sa_; nothing existing is touched.
-- Reads are public. Writes only go through the SECURITY DEFINER functions
-- below, which check who is signed in and, for lead actions, their role.

-- People ---------------------------------------------------------------
create table if not exists public.sa_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  github text,
  role text not null default 'member' check (role in ('member', 'core', 'lead')),
  joined_at timestamptz not null default now()
);
-- Roles granted before someone first signs in, by GitHub login.
create table if not exists public.sa_role_grants (
  github text primary key,
  role text not null check (role in ('member', 'core', 'lead'))
);
insert into public.sa_role_grants (github, role) values ('thomasgarrison', 'lead'), ('errrks', 'lead')
  on conflict (github) do nothing;

-- Threads --------------------------------------------------------------
create table if not exists public.sa_threads (
  id text primary key,
  project text not null default 'quiver',
  zone text not null,
  part text,
  pcb jsonb,
  title text not null,
  body text not null default '',
  type text not null default 'question' check (type in ('question', 'proposal', 'idea')),
  kind text not null default 'technical',
  system text not null default '',
  version text not null default '',
  author_id uuid references auth.users (id) on delete set null,
  named text,            -- a person named in call notes or a document (seeded attribution)
  source jsonb,
  raised_at timestamptz not null default now(),
  active_at timestamptz not null default now(),
  settled jsonb,
  declined jsonb,
  deferrals jsonb not null default '[]'
);
create table if not exists public.sa_positions (
  id text primary key,
  thread_id text not null references public.sa_threads (id) on delete cascade,
  text text not null,
  author_id uuid references auth.users (id) on delete set null,
  named text,
  source jsonb,
  ord int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.sa_votes (
  position_id text not null references public.sa_positions (id) on delete cascade,
  thread_id text not null references public.sa_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  cast_at timestamptz not null default now(),
  primary key (position_id, user_id)
);
create table if not exists public.sa_replies (
  id text primary key default gen_random_uuid()::text,
  thread_id text not null references public.sa_threads (id) on delete cascade,
  text text not null,
  author_id uuid references auth.users (id) on delete set null,
  named text,
  source jsonb,
  created_at timestamptz not null default now()
);
-- "I'd help build this": adds builder weight to that person's votes on the thread.
create table if not exists public.sa_builders (
  thread_id text not null references public.sa_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (thread_id, user_id)
);

-- Work and versions ----------------------------------------------------
create table if not exists public.sa_work (
  id text primary key,
  thread_id text not null references public.sa_threads (id) on delete cascade,
  decision text not null,
  position_id text not null,
  kind text not null check (kind in ('bounty', 'grant')),
  title text not null,
  scope text not null default '',
  acceptance text not null,
  reward int not null check (reward > 0),
  proposer_share numeric not null default 0.25,
  proposer jsonb not null default '{}',
  stage text not null default 'draft' check (stage in ('draft', 'open', 'in_progress', 'in_review', 'completed')),
  owner_id uuid references auth.users (id) on delete set null,
  evidence text,
  history jsonb not null default '[]',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);
create table if not exists public.sa_release (
  version text primary key,
  pool int,
  freeze_target date,
  frozen_at timestamptz,
  frozen_by uuid references auth.users (id) on delete set null,
  allocation jsonb
);
create table if not exists public.sa_counters (name text primary key, value int not null);
insert into public.sa_counters (name, value) values ('thread', 0), ('decision', 0), ('work', 0)
  on conflict (name) do nothing;

-- Access: public read, no direct writes --------------------------------
do $$
declare t text;
begin
  foreach t in array array['sa_members','sa_role_grants','sa_threads','sa_positions','sa_votes','sa_replies','sa_builders','sa_work','sa_release','sa_counters'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "sa public read" on public.%I', t);
    execute format('create policy "sa public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('revoke insert, update, delete on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;
end $$;

-- Helpers --------------------------------------------------------------
create or replace function public.sa_uid() returns uuid language plpgsql stable as $$
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '28000'; end if;
  return auth.uid();
end $$;

create or replace function public.sa_role() returns text language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select role from public.sa_members where user_id = auth.uid()), 'member')
$$;

create or replace function public.sa_require_lead() returns uuid language plpgsql stable security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_uid();
begin
  if public.sa_role() <> 'lead' then raise exception 'Only a lead can do that' using errcode = '42501'; end if;
  return uid;
end $$;

create or replace function public.sa_next(counter text) returns int language sql security definer set search_path = public, pg_temp as $$
  update public.sa_counters set value = value + 1 where name = counter returning value
$$;

create or replace function public.sa_touch(tid text) returns void language sql security definer set search_path = public, pg_temp as $$
  update public.sa_threads set active_at = now() where id = tid
$$;

-- Joining: a member row from the account, with any role granted by GitHub login.
create or replace function public.sa_join() returns public.sa_members language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_uid();
  meta jsonb;
  gh text;
  row public.sa_members;
begin
  select raw_user_meta_data into meta from auth.users where id = uid;
  gh := nullif(coalesce(meta->>'user_name', meta->>'preferred_username'), '');
  insert into public.sa_members (user_id, display_name, avatar_url, github, role)
  values (
    uid,
    coalesce(nullif(meta->>'full_name', ''), nullif(meta->>'name', ''), gh, (select split_part(email, '@', 1) from auth.users where id = uid)),
    nullif(meta->>'avatar_url', ''),
    gh,
    coalesce((select role from public.sa_role_grants where lower(github) = lower(gh)), 'member')
  )
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    github = excluded.github
  returning * into row;
  return row;
end $$;

-- Threads, positions, votes, replies -----------------------------------
create or replace function public.sa_start_thread(p_zone text, p_title text, p_body text, p_type text, p_version text, p_part text default null, p_pcb jsonb default null, p_source jsonb default null)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_uid(); tid text;
begin
  if length(trim(p_title)) = 0 then raise exception 'A thread needs a title'; end if;
  tid := 'Q-' || public.sa_next('thread');
  insert into public.sa_threads (id, zone, part, pcb, title, body, type, system, version, author_id, source)
  values (tid, p_zone, p_part, p_pcb, trim(p_title), coalesce(p_body, ''), coalesce(p_type, 'question'), p_zone, coalesce(p_version, ''), uid, p_source);
  return tid;
end $$;

create or replace function public.sa_propose(p_thread text, p_text text) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_uid(); pid text := 'p' || replace(gen_random_uuid()::text, '-', '');
begin
  if exists (select 1 from public.sa_threads where id = p_thread and (settled is not null or declined is not null)) then raise exception 'This thread is closed'; end if;
  insert into public.sa_positions (id, thread_id, text, author_id, ord)
  values (pid, p_thread, trim(p_text), uid, coalesce((select max(ord) + 1 from public.sa_positions where thread_id = p_thread), 0));
  perform public.sa_touch(p_thread);
  return pid;
end $$;

-- One vote per position; voting the same way again takes it back.
create or replace function public.sa_vote(p_position text, p_value smallint) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_uid(); tid text; cur smallint;
begin
  select thread_id into tid from public.sa_positions where id = p_position;
  if tid is null then raise exception 'No such position'; end if;
  if exists (select 1 from public.sa_threads where id = tid and (settled is not null or declined is not null)) then raise exception 'This thread is closed'; end if;
  select value into cur from public.sa_votes where position_id = p_position and user_id = uid;
  if cur = p_value then
    delete from public.sa_votes where position_id = p_position and user_id = uid;
  else
    insert into public.sa_votes (position_id, thread_id, user_id, value) values (p_position, tid, uid, p_value)
    on conflict (position_id, user_id) do update set value = excluded.value, cast_at = now();
  end if;
  perform public.sa_touch(tid);
end $$;

create or replace function public.sa_reply(p_thread text, p_text text) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_uid(); rid text;
begin
  insert into public.sa_replies (thread_id, text, author_id) values (p_thread, trim(p_text), uid) returning id into rid;
  perform public.sa_touch(p_thread);
  return rid;
end $$;

create or replace function public.sa_set_builder(p_thread text, p_on boolean) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_uid();
begin
  if p_on then insert into public.sa_builders values (p_thread, uid) on conflict do nothing;
  else delete from public.sa_builders where thread_id = p_thread and user_id = uid; end if;
end $$;

-- Lead outcomes --------------------------------------------------------
create or replace function public.sa_settle(p_thread text, p_position text, p_note text, p_override boolean) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_require_lead(); dec text;
begin
  if length(trim(coalesce(p_note, ''))) = 0 then raise exception 'A decision needs a note'; end if;
  if not exists (select 1 from public.sa_positions where id = p_position and thread_id = p_thread) then raise exception 'No such position on this thread'; end if;
  if exists (select 1 from public.sa_threads t join public.sa_release r on r.version = t.version where t.id = p_thread and r.frozen_at is not null) then raise exception 'That version is frozen'; end if;
  dec := coalesce((select settled->>'decision' from public.sa_threads where id = p_thread), 'D-' || lpad(public.sa_next('decision')::text, 3, '0'));
  update public.sa_threads set settled = jsonb_build_object('positionId', p_position, 'byId', uid, 'at', now(), 'override', coalesce(p_override, false), 'note', trim(p_note), 'decision', dec), declined = null, active_at = now()
  where id = p_thread;
  return dec;
end $$;

create or replace function public.sa_decline(p_thread text, p_note text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_require_lead();
begin
  if length(trim(coalesce(p_note, ''))) < 10 then raise exception 'Say why, in a sentence'; end if;
  update public.sa_threads set declined = jsonb_build_object('byId', uid, 'at', now(), 'note', trim(p_note)), settled = null, active_at = now() where id = p_thread;
end $$;

create or replace function public.sa_defer(p_thread text, p_to text, p_note text default null) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_require_lead();
begin
  update public.sa_threads set
    deferrals = deferrals || jsonb_build_array(jsonb_build_object('from', version, 'to', p_to, 'byId', uid, 'at', now(), 'note', p_note)),
    version = p_to, active_at = now()
  where id = p_thread;
end $$;

create or replace function public.sa_reopen(p_thread text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_require_lead();
begin
  if exists (select 1 from public.sa_work where thread_id = p_thread) then raise exception 'This decision has work drafted from it'; end if;
  update public.sa_threads set settled = null, declined = null, active_at = now() where id = p_thread;
end $$;

-- Work: decision → bounty or grant -------------------------------------
create or replace function public.sa_draft_work(p_thread text, p_kind text, p_title text, p_scope text, p_acceptance text, p_reward int) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_require_lead();
  t public.sa_threads;
  p public.sa_positions;
  wid text;
begin
  select * into t from public.sa_threads where id = p_thread;
  if t.settled is null then raise exception 'Only a decided thread can be funded'; end if;
  select * into p from public.sa_positions where id = t.settled->>'positionId';
  wid := 'W-' || public.sa_next('work');
  insert into public.sa_work (id, thread_id, decision, position_id, kind, title, scope, acceptance, reward, proposer, history, created_by)
  values (wid, p_thread, t.settled->>'decision', p.id, p_kind, trim(p_title), coalesce(p_scope, ''), trim(p_acceptance), p_reward,
    jsonb_strip_nulls(jsonb_build_object('personId', coalesce(p.author_id::text, p.named), 'source', p.source, 'confirmedBy', case when p.author_id is not null then p.author_id::text end)),
    jsonb_build_array(jsonb_build_object('at', now(), 'byId', uid, 'note', 'Drafted from ' || (t.settled->>'decision'))), uid);
  perform public.sa_touch(p_thread);
  return wid;
end $$;

create or replace function public.sa_work_step(p_work text, p_action text, p_text text default null) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_uid(); w public.sa_work; lead boolean := public.sa_role() = 'lead'; note text; next_stage text;
begin
  select * into w from public.sa_work where id = p_work for update;
  if w.id is null then raise exception 'No such work'; end if;
  if p_action = 'publish' and lead and w.stage = 'draft' then next_stage := 'open'; note := 'Published as an open ' || w.kind;
  elsif p_action = 'claim' and w.stage = 'open' then next_stage := 'in_progress'; note := 'Claimed'; w.owner_id := uid;
  elsif p_action = 'submit' and w.stage = 'in_progress' and w.owner_id = uid and length(trim(coalesce(p_text, ''))) > 0 then next_stage := 'in_review'; note := 'Submitted for review'; w.evidence := trim(p_text);
  elsif p_action = 'accept' and lead and w.stage = 'in_review' then next_stage := 'completed'; note := 'Accepted by the lead';
  elsif p_action = 'changes' and lead and w.stage = 'in_review' and length(trim(coalesce(p_text, ''))) > 0 then next_stage := 'in_progress'; note := 'Changes requested: ' || trim(p_text);
  elsif p_action = 'confirm' and lead then
    update public.sa_work set proposer = proposer || jsonb_build_object('confirmedBy', uid::text),
      history = history || jsonb_build_array(jsonb_build_object('at', now(), 'byId', uid, 'note', 'Confirmed the proposer award')) where id = p_work;
    return;
  else raise exception 'That step is not open to you right now';
  end if;
  update public.sa_work set stage = next_stage, owner_id = w.owner_id, evidence = w.evidence,
    history = history || jsonb_build_array(jsonb_build_object('at', now(), 'byId', uid, 'note', note)) where id = p_work;
  perform public.sa_touch(w.thread_id);
end $$;

-- Versions: retro pool, freeze -----------------------------------------
create or replace function public.sa_set_release_plan(p_version text, p_pool int, p_freeze date) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_require_lead();
begin
  insert into public.sa_release (version, pool, freeze_target) values (p_version, p_pool, p_freeze)
  on conflict (version) do update set pool = excluded.pool, freeze_target = excluded.freeze_target
  where public.sa_release.frozen_at is null;
end $$;

create or replace function public.sa_defer_open(p_version text, p_to text, p_note text) returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_require_lead(); n int;
begin
  update public.sa_threads set
    deferrals = deferrals || jsonb_build_array(jsonb_build_object('from', version, 'to', p_to, 'byId', uid, 'at', now(), 'note', p_note)),
    version = p_to, active_at = now()
  where version = p_version and settled is null and declined is null;
  get diagnostics n = row_count;
  return n;
end $$;

-- The split is computed by the lead's client from the weighted tallies and
-- recorded here; the freeze itself requires every thread to be settled.
create or replace function public.sa_freeze(p_version text, p_allocation jsonb) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_require_lead();
begin
  if exists (select 1 from public.sa_threads where version = p_version and settled is null and declined is null) then
    raise exception 'Every thread in this version needs an outcome first';
  end if;
  insert into public.sa_release (version, frozen_at, frozen_by, allocation) values (p_version, now(), uid, p_allocation)
  on conflict (version) do update set frozen_at = now(), frozen_by = uid, allocation = p_allocation
  where public.sa_release.frozen_at is null;
end $$;

create or replace function public.sa_set_role(p_user uuid, p_role text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_require_lead();
begin
  if p_role not in ('member', 'core', 'lead') then raise exception 'Unknown role'; end if;
  update public.sa_members set role = p_role where user_id = p_user;
end $$;

-- Only the entry points are callable; the helpers stay internal.
revoke execute on function public.sa_next(text), public.sa_touch(text), public.sa_require_lead() from anon, authenticated, public;
grant execute on function
  public.sa_join(), public.sa_role(), public.sa_start_thread(text, text, text, text, text, text, jsonb, jsonb), public.sa_propose(text, text),
  public.sa_vote(text, smallint), public.sa_reply(text, text), public.sa_set_builder(text, boolean),
  public.sa_settle(text, text, text, boolean), public.sa_decline(text, text), public.sa_defer(text, text, text), public.sa_reopen(text),
  public.sa_draft_work(text, text, text, text, text, int), public.sa_work_step(text, text, text),
  public.sa_set_release_plan(text, int, date), public.sa_defer_open(text, text, text), public.sa_freeze(text, jsonb), public.sa_set_role(uuid, text)
to authenticated;
