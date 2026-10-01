-- Deleting comments and replies. A lead can delete any comment; anyone can
-- delete their own. The adopted option stays on the record. Soft, Reddit
-- style: the row keeps its place in the tree, so replies under it stay put,
-- but loses its words, author and source; the original moves to
-- sa_deleted_comments, which nothing reads through the API. Votes on a
-- deleted comment stop counting, and nothing new lands on it.

alter table public.sa_positions
  add column if not exists deleted_at timestamptz,
  -- true when a lead deleted someone else's comment ("Removed by a lead").
  add column if not exists removed boolean not null default false;

create table if not exists public.sa_deleted_comments (
  id text primary key references public.sa_positions (id) on delete cascade,
  thread_id text not null,
  text text not null,
  author_id uuid,
  named text,
  source jsonb,
  deleted_at timestamptz not null default now(),
  deleted_by uuid references auth.users (id) on delete set null
);
alter table public.sa_deleted_comments enable row level security;
revoke all on public.sa_deleted_comments from anon, authenticated;

create or replace function public.sa_delete_comment(p_comment text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_uid();
  c public.sa_positions;
begin
  select * into c from public.sa_positions where id = p_comment and deleted_at is null;
  if c.id is null then raise exception 'No such comment'; end if;
  if exists (select 1 from public.sa_threads where id = c.thread_id and deleted_at is not null) then raise exception 'This thread was deleted'; end if;
  if exists (select 1 from public.sa_threads where id = c.thread_id and settled->>'positionId' = p_comment) then
    raise exception 'This is the adopted option; it stays on the record';
  end if;
  if public.sa_role() <> 'lead' and c.author_id is distinct from uid then
    raise exception 'You can only delete your own comments' using errcode = '42501';
  end if;
  insert into public.sa_deleted_comments (id, thread_id, text, author_id, named, source, deleted_by)
  values (c.id, c.thread_id, c.text, c.author_id, c.named, c.source, uid);
  update public.sa_positions
  set deleted_at = now(), removed = (c.author_id is distinct from uid), text = '', author_id = null, named = null, source = null
  where id = p_comment;
end $$;
grant execute on function public.sa_delete_comment(text) to authenticated;

-- No votes on a deleted comment, and no replies under one, whichever function writes them.
create or replace function public.sa_guard_deleted_comment() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare target text;
begin
  if tg_table_name = 'sa_votes' then target := new.position_id; else target := new.parent_id; end if;
  if target is not null and exists (select 1 from public.sa_positions where id = target and deleted_at is not null) then
    raise exception 'That comment was deleted';
  end if;
  return new;
end $$;
revoke execute on function public.sa_guard_deleted_comment() from anon, authenticated, public;
drop trigger if exists sa_guard_deleted_comment on public.sa_votes;
create trigger sa_guard_deleted_comment before insert or update on public.sa_votes for each row execute function public.sa_guard_deleted_comment();
drop trigger if exists sa_guard_deleted_comment on public.sa_positions;
create trigger sa_guard_deleted_comment before insert on public.sa_positions for each row execute function public.sa_guard_deleted_comment();

-- A deleted comment can't be adopted.
create or replace function public.sa_settle(p_thread text, p_position text, p_note text, p_override boolean) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_require_lead(); dec text;
begin
  if length(trim(coalesce(p_note, ''))) = 0 then raise exception 'A decision needs a note'; end if;
  if not exists (select 1 from public.sa_positions where id = p_position and thread_id = p_thread and parent_id is null and deleted_at is null) then raise exception 'Only a top-level comment on this thread can be adopted'; end if;
  if exists (select 1 from public.sa_threads t join public.sa_release r on r.version = t.version where t.id = p_thread and r.frozen_at is not null) then raise exception 'That version is frozen'; end if;
  dec := coalesce((select settled->>'decision' from public.sa_threads where id = p_thread), 'D-' || lpad(public.sa_next('decision')::text, 3, '0'));
  update public.sa_threads set settled = jsonb_build_object('positionId', p_position, 'byId', uid, 'at', now(), 'override', coalesce(p_override, false), 'note', trim(p_note), 'decision', dec), declined = null, active_at = now()
  where id = p_thread;
  return dec;
end $$;

-- A deleted comment no longer counts as someone else taking part, so an
-- author can still delete their own thread after a lead clears spam off it.
create or replace function public.sa_delete_thread(p_thread text, p_reason text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_uid();
  t public.sa_threads;
  others boolean;
begin
  select * into t from public.sa_threads where id = p_thread and deleted_at is null;
  if t.id is null then raise exception 'No such thread'; end if;
  if exists (select 1 from public.sa_work where thread_id = p_thread) then
    raise exception 'This thread has funded work; it stays on the record';
  end if;
  if public.sa_role() <> 'lead' then
    others := exists (select 1 from public.sa_positions where thread_id = p_thread and deleted_at is null and author_id is distinct from uid)
      or exists (select 1 from public.sa_replies where thread_id = p_thread and author_id is distinct from uid)
      or exists (select 1 from public.sa_votes v join public.sa_positions p on p.id = v.position_id where v.thread_id = p_thread and p.deleted_at is null and v.user_id <> uid);
    if t.author_id is distinct from uid or others then
      raise exception 'Only a lead can delete this thread' using errcode = '42501';
    end if;
  end if;
  update public.sa_threads set deleted_at = now(), deleted_by = uid, delete_reason = nullif(trim(coalesce(p_reason, '')), '') where id = p_thread;
end $$;
