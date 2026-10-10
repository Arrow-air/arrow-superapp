-- More than one project. Longshot, Arrow's battery pack, gets its own
-- workspace beside Quiver: its threads are L-1, L-2… and its decisions keep
-- their own register (D-001 upward), so neither project's numbering moves
-- the other's. sa_threads already carries `project`; this adds the list of
-- projects with their thread prefix, per-project counters, and makes the two
-- numbering functions use them. Quiver keeps its existing counters, so
-- nothing about Q-numbers or Quiver's D-numbers changes. Work stays W-1
-- upward across projects (one table, one key).
-- Versions are keyed by name in sa_release; each project names its own
-- (Dev Kit v1.1, Longshot PT2), so freezes and retro pools stay separate.

create table if not exists public.sa_projects (
  id text primary key,
  prefix text not null unique,
  label text not null
);
insert into public.sa_projects (id, prefix, label) values ('quiver', 'Q', 'Quiver'), ('longshot', 'L', 'Longshot')
  on conflict (id) do nothing;
alter table public.sa_projects enable row level security;
drop policy if exists "sa public read" on public.sa_projects;
create policy "sa public read" on public.sa_projects for select to anon, authenticated using (true);
revoke insert, update, delete on public.sa_projects from anon, authenticated;
grant select on public.sa_projects to anon, authenticated;

-- Quiver keeps 'thread' and 'decision'; other projects count under 'thread:<id>' and 'decision:<id>'.
insert into public.sa_counters (name, value) values ('thread:longshot', 0), ('decision:longshot', 0)
  on conflict (name) do nothing;
create or replace function public.sa_counter(p_kind text, p_project text) returns text language sql immutable as $$
  select case when coalesce(p_project, 'quiver') = 'quiver' then p_kind else p_kind || ':' || p_project end
$$;

-- A thread must belong to a known project.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sa_threads_project_fkey') then
    alter table public.sa_threads add constraint sa_threads_project_fkey foreign key (project) references public.sa_projects (id);
  end if;
end $$;

-- Starting a thread: in the project the app names (Quiver when an older client
-- names none), numbered with that project's prefix and counter.
drop function if exists public.sa_start_thread(text, text, text, text, text, text, jsonb, jsonb, text);
create or replace function public.sa_start_thread(p_zone text, p_title text, p_body text, p_type text, p_version text, p_part text default null, p_pcb jsonb default null, p_source jsonb default null, p_key text default null, p_project text default 'quiver')
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_uid(); tid text; existing text; pfx text;
begin
  if p_key is not null then
    select id into existing from public.sa_threads where author_id = uid and client_key = p_key;
    if existing is not null then return existing; end if;
  end if;
  if length(trim(coalesce(p_title, ''))) = 0 then raise exception 'A thread needs a title'; end if;
  select prefix into pfx from public.sa_projects where id = coalesce(p_project, 'quiver');
  if pfx is null then raise exception 'No such project'; end if;
  tid := pfx || '-' || public.sa_next(public.sa_counter('thread', coalesce(p_project, 'quiver')));
  insert into public.sa_threads (id, project, zone, part, pcb, title, body, type, system, version, author_id, source, client_key)
  values (tid, coalesce(p_project, 'quiver'), p_zone, p_part, p_pcb, trim(p_title), coalesce(p_body, ''), coalesce(p_type, 'question'), p_zone, coalesce(p_version, ''), uid, p_source, p_key);
  return tid;
end $$;
revoke execute on function public.sa_start_thread(text, text, text, text, text, text, jsonb, jsonb, text, text) from anon, public;
grant execute on function public.sa_start_thread(text, text, text, text, text, text, jsonb, jsonb, text, text) to authenticated;

-- Deciding: as before (only a standing top-level comment, not in a frozen
-- version, a reopened thread keeps its D-number), with the next number taken
-- from the thread's own project.
create or replace function public.sa_settle(p_thread text, p_position text, p_note text, p_override boolean) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_require_lead(); dec text; proj text;
begin
  if length(trim(coalesce(p_note, ''))) = 0 then raise exception 'A decision needs a note'; end if;
  if not exists (select 1 from public.sa_positions where id = p_position and thread_id = p_thread and parent_id is null and deleted_at is null) then raise exception 'Only a top-level comment on this thread can be adopted'; end if;
  if exists (select 1 from public.sa_threads t join public.sa_release r on r.version = t.version where t.id = p_thread and r.frozen_at is not null) then raise exception 'That version is frozen'; end if;
  select project into proj from public.sa_threads where id = p_thread;
  dec := coalesce(
    (select settled->>'decision' from public.sa_threads where id = p_thread),
    (select e.h->>'decision' from public.sa_threads t, jsonb_array_elements(t.history) with ordinality as e(h, i)
      where t.id = p_thread and e.h->>'decision' is not null order by e.i desc limit 1),
    'D-' || lpad(public.sa_next(public.sa_counter('decision', proj))::text, 3, '0'));
  update public.sa_threads set settled = jsonb_build_object('positionId', p_position, 'byId', uid, 'at', now(), 'override', coalesce(p_override, false), 'note', trim(p_note), 'decision', dec), declined = null, active_at = now()
  where id = p_thread;
  return dec;
end $$;
