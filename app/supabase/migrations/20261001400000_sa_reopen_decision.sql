-- Reopening a decision. A lead can put a decided (or declined) thread back
-- into discussion: the outcome moves to the thread's history with who
-- reopened it, when and why; votes and comments stay; the thread is open
-- again. Work drafted from the decision is withdrawn if nobody has taken it
-- on yet (draft or open); once someone has claimed it, the decision stays.
-- Decisions made outside the app (an accepted GitHub issue) and frozen
-- versions stay as they are. Decided again, the thread keeps its D-number.

alter table public.sa_threads add column if not exists history jsonb not null default '[]';

alter table public.sa_work drop constraint if exists sa_work_stage_check;
alter table public.sa_work add constraint sa_work_stage_check
  check (stage in ('draft', 'open', 'in_progress', 'in_review', 'completed', 'withdrawn'));

drop function if exists public.sa_reopen(text);
create or replace function public.sa_reopen(p_thread text, p_reason text default null) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_require_lead();
  t public.sa_threads;
  taken text;
begin
  select * into t from public.sa_threads where id = p_thread and deleted_at is null for update;
  if t.id is null then raise exception 'No such thread'; end if;
  if t.settled is null and t.declined is null then raise exception 'This thread is already open'; end if;
  if t.settled ? 'source' then raise exception 'This was decided outside the app; change it where it was decided'; end if;
  if exists (select 1 from public.sa_release where version = t.version and frozen_at is not null) then raise exception 'That version is frozen'; end if;
  select id into taken from public.sa_work where thread_id = p_thread and stage in ('in_progress', 'in_review', 'completed') limit 1;
  if taken is not null then raise exception '% has been taken on, so the decision stays', taken; end if;
  update public.sa_work
  set stage = 'withdrawn',
    history = history || jsonb_build_array(jsonb_build_object('at', now(), 'byId', uid, 'note', 'Withdrawn: ' || coalesce(t.settled->>'decision', 'the decision') || ' was reopened'))
  where thread_id = p_thread and stage in ('draft', 'open');
  update public.sa_threads set
    history = history || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'kind', 'reopened',
      'was', case when t.settled is not null then 'decided' else 'declined' end,
      'decision', t.settled->>'decision',
      'positionId', t.settled->>'positionId',
      'decidedBy', coalesce(t.settled->>'byId', t.declined->>'byId'),
      'decidedAt', coalesce(t.settled->>'at', t.declined->>'at'),
      'decisionNote', coalesce(t.settled->>'note', t.declined->>'note'),
      'byId', uid, 'at', now(), 'note', nullif(trim(coalesce(p_reason, '')), '')))),
    settled = null, declined = null, active_at = now()
  where id = p_thread;
end $$;
grant execute on function public.sa_reopen(text, text) to authenticated;

-- Decided again after a reopen, a thread keeps the D-number it had.
create or replace function public.sa_settle(p_thread text, p_position text, p_note text, p_override boolean) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_require_lead(); dec text;
begin
  if length(trim(coalesce(p_note, ''))) = 0 then raise exception 'A decision needs a note'; end if;
  if not exists (select 1 from public.sa_positions where id = p_position and thread_id = p_thread and parent_id is null and deleted_at is null) then raise exception 'Only a top-level comment on this thread can be adopted'; end if;
  if exists (select 1 from public.sa_threads t join public.sa_release r on r.version = t.version where t.id = p_thread and r.frozen_at is not null) then raise exception 'That version is frozen'; end if;
  dec := coalesce(
    (select settled->>'decision' from public.sa_threads where id = p_thread),
    (select e.h->>'decision' from public.sa_threads t, jsonb_array_elements(t.history) with ordinality as e(h, i)
      where t.id = p_thread and e.h->>'decision' is not null order by e.i desc limit 1),
    'D-' || lpad(public.sa_next('decision')::text, 3, '0'));
  update public.sa_threads set settled = jsonb_build_object('positionId', p_position, 'byId', uid, 'at', now(), 'override', coalesce(p_override, false), 'note', trim(p_note), 'decision', dec), declined = null, active_at = now()
  where id = p_thread;
  return dec;
end $$;
