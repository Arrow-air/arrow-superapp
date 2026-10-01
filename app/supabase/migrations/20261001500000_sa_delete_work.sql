-- Deleting a bounty or grant. Leads only, and only while nobody has taken
-- it on (draft, open, or withdrawn after a reopen); once claimed, it stays
-- on the record. The row moves to sa_deleted_work, which nothing reads
-- through the API, and leaves every list; the thread can be funded afresh.
-- W-numbers are not reused.

create table if not exists public.sa_deleted_work (
  like public.sa_work including defaults,
  deleted_at timestamptz not null default now(),
  deleted_by uuid references auth.users (id) on delete set null
);
alter table public.sa_deleted_work enable row level security;
revoke all on public.sa_deleted_work from anon, authenticated;

create or replace function public.sa_delete_work(p_work text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_require_lead();
  w public.sa_work;
begin
  select * into w from public.sa_work where id = p_work for update;
  if w.id is null then raise exception 'No such work'; end if;
  if w.stage in ('in_progress', 'in_review', 'completed') then
    raise exception '% has been taken on, so it stays on the record', w.id;
  end if;
  insert into public.sa_deleted_work select (w).*, now(), uid;
  delete from public.sa_work where id = p_work;
  perform public.sa_touch(w.thread_id);
end $$;
grant execute on function public.sa_delete_work(text) to authenticated;
