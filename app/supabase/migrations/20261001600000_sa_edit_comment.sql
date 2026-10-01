-- Editing your own comment. Authors only; never the adopted option (the
-- decision quotes it) and never a deleted comment. The comment shows that it
-- was edited; every earlier version is kept in sa_comment_edits, which
-- nothing reads through the API, so what people voted on stays on record.

alter table public.sa_positions add column if not exists edited_at timestamptz;

create table if not exists public.sa_comment_edits (
  id bigint generated always as identity primary key,
  comment_id text not null references public.sa_positions (id) on delete cascade,
  thread_id text not null,
  text text not null,
  written_at timestamptz not null,
  replaced_at timestamptz not null default now(),
  replaced_by uuid references auth.users (id) on delete set null
);
create index if not exists sa_comment_edits_comment on public.sa_comment_edits (comment_id);
alter table public.sa_comment_edits enable row level security;
revoke all on public.sa_comment_edits from anon, authenticated;

create or replace function public.sa_edit_comment(p_comment text, p_text text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_uid();
  c public.sa_positions;
begin
  if length(trim(coalesce(p_text, ''))) = 0 then raise exception 'Say something first'; end if;
  select * into c from public.sa_positions where id = p_comment and deleted_at is null for update;
  if c.id is null then raise exception 'No such comment'; end if;
  if c.author_id is distinct from uid then raise exception 'You can only edit your own comments' using errcode = '42501'; end if;
  if exists (select 1 from public.sa_threads where id = c.thread_id and deleted_at is not null) then raise exception 'This thread was deleted'; end if;
  if exists (select 1 from public.sa_threads where id = c.thread_id and settled->>'positionId' = p_comment) then
    raise exception 'This is the adopted option; the decision quotes it as written';
  end if;
  if trim(p_text) = c.text then return; end if;
  insert into public.sa_comment_edits (comment_id, thread_id, text, written_at, replaced_by)
  values (c.id, c.thread_id, c.text, coalesce(c.edited_at, c.created_at), uid);
  update public.sa_positions set text = trim(p_text), edited_at = now() where id = p_comment;
  perform public.sa_touch(c.thread_id);
end $$;
grant execute on function public.sa_edit_comment(text, text) to authenticated;
