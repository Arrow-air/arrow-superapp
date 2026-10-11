-- Answers to a manufacturing guide's open questions (Longshot's pack build
-- guide first). The guide's steps live in the app; what the record doesn't
-- say yet is asked as a question, and whoever knows answers it here: one
-- current answer per person, per question, per build ('' for the process in
-- general). Public read, like the rest of the workspace; every write goes
-- through the two functions below. Earlier versions of an edited answer, and
-- removed answers, are kept in sa_guide_answer_history, which nothing reads
-- through the API.

create table if not exists public.sa_guide_answers (
  id text primary key,
  project text not null references public.sa_projects (id),
  guide text not null,
  question text not null,
  build text not null default '',
  value text not null,
  note text not null default '',
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create unique index if not exists sa_guide_answers_current on public.sa_guide_answers (project, guide, question, build, author_id);
alter table public.sa_guide_answers enable row level security;
drop policy if exists "sa public read" on public.sa_guide_answers;
create policy "sa public read" on public.sa_guide_answers for select to anon, authenticated using (true);
revoke all on public.sa_guide_answers from anon, authenticated;
grant select on public.sa_guide_answers to anon, authenticated;

create table if not exists public.sa_guide_answer_history (
  id bigint generated always as identity primary key,
  answer_id text not null,
  project text not null,
  guide text not null,
  question text not null,
  build text not null,
  value text not null,
  note text not null,
  author_id uuid,
  written_at timestamptz not null,
  replaced_at timestamptz not null default now(),
  replaced_by uuid references auth.users (id) on delete set null,
  removed boolean not null default false
);
create index if not exists sa_guide_answer_history_answer on public.sa_guide_answer_history (answer_id);
alter table public.sa_guide_answer_history enable row level security;
revoke all on public.sa_guide_answer_history from anon, authenticated;

-- Answer, or change your answer. Saving the same answer again (a retry whose
-- reply was lost) changes nothing, so it is safe to press Save twice.
create or replace function public.sa_guide_answer(p_project text, p_guide text, p_question text, p_value text, p_note text default '', p_build text default '')
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_uid();
  v text := btrim(coalesce(p_value, ''), E' \t\r\n');
  n text := btrim(coalesce(p_note, ''), E' \t\r\n');
  b text := coalesce(p_build, '');
  a public.sa_guide_answers;
  aid text;
begin
  if v = '' then raise exception 'Give an answer first'; end if;
  if length(v) > 2000 or length(n) > 4000 then raise exception 'That answer is too long'; end if;
  if coalesce(p_guide, '') !~ '^[a-z0-9-]{1,64}$' or coalesce(p_question, '') !~ '^[a-z0-9-]{1,64}$' or b !~ '^[a-z0-9-]{0,32}$' then
    raise exception 'Unknown guide question';
  end if;
  if not exists (select 1 from public.sa_projects where id = p_project) then raise exception 'No such project'; end if;
  for attempt in 1..3 loop
    select * into a from public.sa_guide_answers
      where project = p_project and guide = p_guide and question = p_question and build = b and author_id = uid for update;
    if a.id is not null then
      if a.value = v and a.note = n then return a.id; end if;
      insert into public.sa_guide_answer_history (answer_id, project, guide, question, build, value, note, author_id, written_at, replaced_by)
      values (a.id, a.project, a.guide, a.question, a.build, a.value, a.note, a.author_id, coalesce(a.edited_at, a.created_at), uid);
      update public.sa_guide_answers set value = v, note = n, edited_at = now() where id = a.id;
      return a.id;
    end if;
    aid := 'g' || replace(gen_random_uuid()::text, '-', '');
    begin
      insert into public.sa_guide_answers (id, project, guide, question, build, value, note, author_id)
      values (aid, p_project, p_guide, p_question, b, v, n, uid);
      return aid;
    exception when unique_violation then
      -- Another first save of this answer landed while this one waited: go
      -- round again, so this one counts as a repeat (same words) or an edit.
      null;
    end;
  end loop;
  -- Only reached outside READ COMMITTED, where the save that won stays out of sight.
  raise exception 'Couldn''t save that answer; try again' using errcode = '40001';
end $$;
revoke execute on function public.sa_guide_answer(text, text, text, text, text, text) from anon, public;
grant execute on function public.sa_guide_answer(text, text, text, text, text, text) to authenticated;

-- Remove an answer: its author, or a lead. Removing one that is already gone
-- (a retry) does nothing.
create or replace function public.sa_guide_answer_delete(p_answer text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_uid();
  a public.sa_guide_answers;
begin
  select * into a from public.sa_guide_answers where id = p_answer for update;
  if a.id is null then return; end if;
  if a.author_id is distinct from uid and public.sa_role() <> 'lead' then
    raise exception 'Only its author or a lead can remove an answer' using errcode = '42501';
  end if;
  insert into public.sa_guide_answer_history (answer_id, project, guide, question, build, value, note, author_id, written_at, replaced_by, removed)
  values (a.id, a.project, a.guide, a.question, a.build, a.value, a.note, a.author_id, coalesce(a.edited_at, a.created_at), uid, true);
  delete from public.sa_guide_answers where id = a.id;
end $$;
revoke execute on function public.sa_guide_answer_delete(text) from anon, public;
grant execute on function public.sa_guide_answer_delete(text) to authenticated;
