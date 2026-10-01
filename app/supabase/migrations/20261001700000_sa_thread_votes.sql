-- Up and down votes on a thread itself, Reddit style: is this worth the
-- group's time. Weighted in the app like comment votes. One vote per person
-- per thread; the same vote again takes it back. Open threads only.

create table if not exists public.sa_thread_votes (
  thread_id text not null references public.sa_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  cast_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);
alter table public.sa_thread_votes enable row level security;
revoke insert, update, delete on public.sa_thread_votes from anon, authenticated;
grant select on public.sa_thread_votes to anon, authenticated;
drop policy if exists "sa public read" on public.sa_thread_votes;
create policy "sa public read" on public.sa_thread_votes for select to anon, authenticated
  using (exists (select 1 from public.sa_threads th where th.id = thread_id and th.deleted_at is null));
drop trigger if exists sa_guard_deleted on public.sa_thread_votes;
create trigger sa_guard_deleted before insert or update on public.sa_thread_votes for each row execute function public.sa_guard_deleted();

create or replace function public.sa_vote_thread(p_thread text, p_value smallint) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_uid(); cur smallint; t public.sa_threads;
begin
  if p_value not in (-1, 1) then raise exception 'A vote is up or down'; end if;
  select * into t from public.sa_threads where id = p_thread and deleted_at is null;
  if t.id is null then raise exception 'No such thread'; end if;
  if t.settled is not null or t.declined is not null then raise exception 'This thread is closed'; end if;
  select value into cur from public.sa_thread_votes where thread_id = p_thread and user_id = uid;
  if cur = p_value then
    delete from public.sa_thread_votes where thread_id = p_thread and user_id = uid;
  else
    insert into public.sa_thread_votes (thread_id, user_id, value) values (p_thread, uid, p_value)
    on conflict (thread_id, user_id) do update set value = excluded.value, cast_at = now();
  end if;
  perform public.sa_touch(p_thread);
end $$;
grant execute on function public.sa_vote_thread(text, smallint) to authenticated;
