-- Reddit-style threads: one tree of comments with voting at every level.
-- Top-level comments are what a lead can adopt; replies hang under any
-- comment. Comments live in sa_positions (parent_id null = top level), so
-- votes, decisions and work keep pointing at the same ids. Existing replies
-- move in: the seeded ones under the comment they answer, anyone else's at
-- the top level. sa_replies stays as a record but is no longer read.

alter table public.sa_positions add column if not exists parent_id text references public.sa_positions (id) on delete cascade;
create index if not exists sa_positions_parent on public.sa_positions (parent_id);
create index if not exists sa_positions_thread on public.sa_positions (thread_id);

insert into public.sa_positions (id, thread_id, text, author_id, named, source, ord, created_at, parent_id)
select r.id, r.thread_id, r.text, r.author_id, r.named, r.source,
  1000 + row_number() over (partition by r.thread_id order by r.created_at),
  r.created_at,
  case r.id
    when 'Q-6-r1' then 'Q-6-p1' when 'Q-6-r2' then 'Q-6-p1' when 'Q-6-r3' then 'Q-6-p1'
    when 'Q-7-r1' then 'Q-7-p1' when 'Q-8-r1' then 'Q-8-p1' when 'Q-12-r1' then 'Q-12-p1'
    else null end
from public.sa_replies r
join public.sa_threads t on t.id = r.thread_id and t.deleted_at is null
where not exists (select 1 from public.sa_positions p where p.id = r.id);

-- One way to comment: top level (a new option) or under any comment.
create or replace function public.sa_comment(p_thread text, p_text text, p_parent text default null) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_uid(); cid text := 'c' || replace(gen_random_uuid()::text, '-', ''); closed boolean;
begin
  if length(trim(coalesce(p_text, ''))) = 0 then raise exception 'Say something first'; end if;
  select (settled is not null or declined is not null) into closed from public.sa_threads where id = p_thread and deleted_at is null;
  if closed is null then raise exception 'No such thread'; end if;
  if p_parent is null and closed then raise exception 'This thread is closed to new options; reply to a comment instead'; end if;
  if p_parent is not null and not exists (select 1 from public.sa_positions where id = p_parent and thread_id = p_thread) then
    raise exception 'That comment is not on this thread';
  end if;
  insert into public.sa_positions (id, thread_id, text, author_id, parent_id, ord)
  values (cid, p_thread, trim(p_text), uid, p_parent,
    case when p_parent is null then coalesce((select max(ord) + 1 from public.sa_positions where thread_id = p_thread and parent_id is null), 0) else 0 end);
  perform public.sa_touch(p_thread);
  return cid;
end $$;

-- Older clients' "reply" becomes a top-level comment, so nothing is lost while they reload.
create or replace function public.sa_reply(p_thread text, p_text text) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  return public.sa_comment(p_thread, p_text, null);
end $$;

-- Only a top-level comment can be adopted into the spec.
create or replace function public.sa_settle(p_thread text, p_position text, p_note text, p_override boolean) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_require_lead(); dec text;
begin
  if length(trim(coalesce(p_note, ''))) = 0 then raise exception 'A decision needs a note'; end if;
  if not exists (select 1 from public.sa_positions where id = p_position and thread_id = p_thread and parent_id is null) then raise exception 'Only a top-level comment on this thread can be adopted'; end if;
  if exists (select 1 from public.sa_threads t join public.sa_release r on r.version = t.version where t.id = p_thread and r.frozen_at is not null) then raise exception 'That version is frozen'; end if;
  dec := coalesce((select settled->>'decision' from public.sa_threads where id = p_thread), 'D-' || lpad(public.sa_next('decision')::text, 3, '0'));
  update public.sa_threads set settled = jsonb_build_object('positionId', p_position, 'byId', uid, 'at', now(), 'override', coalesce(p_override, false), 'note', trim(p_note), 'decision', dec), declined = null, active_at = now()
  where id = p_thread;
  return dec;
end $$;

grant execute on function public.sa_comment(text, text, text) to authenticated;
