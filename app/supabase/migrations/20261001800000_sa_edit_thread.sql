-- Editing a thread's title and description. Its author or a lead (leads can
-- tidy threads seeded from notes, which have no author). Not once the
-- thread's version is frozen: the frozen spec lists the titles. The thread
-- shows that it was edited; every earlier version is kept in
-- sa_thread_edits, which nothing reads through the API.

alter table public.sa_threads add column if not exists edited_at timestamptz;

create table if not exists public.sa_thread_edits (
  id bigint generated always as identity primary key,
  thread_id text not null references public.sa_threads (id) on delete cascade,
  title text not null,
  body text not null,
  written_at timestamptz not null,
  replaced_at timestamptz not null default now(),
  replaced_by uuid references auth.users (id) on delete set null
);
create index if not exists sa_thread_edits_thread on public.sa_thread_edits (thread_id);
alter table public.sa_thread_edits enable row level security;
revoke all on public.sa_thread_edits from anon, authenticated;

create or replace function public.sa_edit_thread(p_thread text, p_title text, p_body text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_uid();
  t public.sa_threads;
  new_body text := trim(coalesce(p_body, ''));
begin
  if length(trim(coalesce(p_title, ''))) = 0 then raise exception 'A thread needs a title'; end if;
  select * into t from public.sa_threads where id = p_thread and deleted_at is null for update;
  if t.id is null then raise exception 'No such thread'; end if;
  if public.sa_role() <> 'lead' and t.author_id is distinct from uid then
    raise exception 'Only its author or a lead can edit this thread' using errcode = '42501';
  end if;
  if exists (select 1 from public.sa_release where version = t.version and frozen_at is not null) then raise exception 'That version is frozen'; end if;
  if trim(p_title) = t.title and new_body = t.body then return; end if;
  insert into public.sa_thread_edits (thread_id, title, body, written_at, replaced_by)
  values (t.id, t.title, t.body, coalesce(t.edited_at, t.raised_at), uid);
  update public.sa_threads set title = trim(p_title), body = new_body, edited_at = now() where id = p_thread;
  perform public.sa_touch(p_thread);
end $$;
grant execute on function public.sa_edit_thread(text, text, text) to authenticated;
