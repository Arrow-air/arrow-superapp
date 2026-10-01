-- Deleting threads. Soft: the row stays with who deleted it, when and why,
-- and disappears from every read along with everything hanging off it.
-- Leads can delete any thread; an author can delete their own thread until
-- someone else has taken part. Threads with funded work can't be deleted.

alter table public.sa_threads
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users (id) on delete set null,
  add column if not exists delete_reason text;

drop policy if exists "sa public read" on public.sa_threads;
create policy "sa public read" on public.sa_threads for select to anon, authenticated using (deleted_at is null);

do $$
declare t text;
begin
  foreach t in array array['sa_positions', 'sa_votes', 'sa_replies', 'sa_builders', 'sa_work'] loop
    execute format('drop policy if exists "sa public read" on public.%I', t);
    execute format('create policy "sa public read" on public.%I for select to anon, authenticated using (exists (select 1 from public.sa_threads th where th.id = thread_id and th.deleted_at is null))', t);
  end loop;
end $$;

-- Nothing new lands on a deleted thread, whichever function writes it.
create or replace function public.sa_guard_deleted() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists (select 1 from public.sa_threads where id = new.thread_id and deleted_at is not null) then
    raise exception 'This thread was deleted';
  end if;
  return new;
end $$;
do $$
declare t text;
begin
  foreach t in array array['sa_positions', 'sa_votes', 'sa_replies', 'sa_builders', 'sa_work'] loop
    execute format('drop trigger if exists sa_guard_deleted on public.%I', t);
    execute format('create trigger sa_guard_deleted before insert or update on public.%I for each row execute function public.sa_guard_deleted()', t);
  end loop;
end $$;

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
    others := exists (select 1 from public.sa_positions where thread_id = p_thread and author_id is distinct from uid)
      or exists (select 1 from public.sa_replies where thread_id = p_thread and author_id is distinct from uid)
      or exists (select 1 from public.sa_votes where thread_id = p_thread and user_id <> uid);
    if t.author_id is distinct from uid or others then
      raise exception 'Only a lead can delete this thread' using errcode = '42501';
    end if;
  end if;
  update public.sa_threads set deleted_at = now(), deleted_by = uid, delete_reason = nullif(trim(coalesce(p_reason, '')), '') where id = p_thread;
end $$;

revoke execute on function public.sa_guard_deleted() from anon, authenticated, public;
grant execute on function public.sa_delete_thread(text, text) to authenticated;
