-- Retry-safe writes. On a flaky connection a save can reach the server while
-- its answer never comes back; pressing Save again must not post twice. The
-- app sends a key per draft (the same key on every retry); a comment or
-- thread already created with that key by the same person is returned
-- instead of a new one.

alter table public.sa_positions add column if not exists client_key text;
create unique index if not exists sa_positions_client_key on public.sa_positions (author_id, client_key) where client_key is not null;
alter table public.sa_threads add column if not exists client_key text;
create unique index if not exists sa_threads_client_key on public.sa_threads (author_id, client_key) where client_key is not null;

drop function if exists public.sa_comment(text, text, text);
create or replace function public.sa_comment(p_thread text, p_text text, p_parent text default null, p_key text default null) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_uid(); cid text := 'c' || replace(gen_random_uuid()::text, '-', ''); closed boolean; existing text;
begin
  if p_key is not null then
    select id into existing from public.sa_positions where author_id = uid and client_key = p_key;
    if existing is not null then return existing; end if;
  end if;
  if length(trim(coalesce(p_text, ''))) = 0 then raise exception 'Say something first'; end if;
  select (settled is not null or declined is not null) into closed from public.sa_threads where id = p_thread and deleted_at is null;
  if closed is null then raise exception 'No such thread'; end if;
  if p_parent is null and closed then raise exception 'This thread is closed to new options; reply to a comment instead'; end if;
  if p_parent is not null and not exists (select 1 from public.sa_positions where id = p_parent and thread_id = p_thread) then
    raise exception 'That comment is not on this thread';
  end if;
  insert into public.sa_positions (id, thread_id, text, author_id, parent_id, ord, client_key)
  values (cid, p_thread, trim(p_text), uid, p_parent,
    case when p_parent is null then coalesce((select max(ord) + 1 from public.sa_positions where thread_id = p_thread and parent_id is null), 0) else 0 end,
    p_key);
  perform public.sa_touch(p_thread);
  return cid;
end $$;
revoke execute on function public.sa_comment(text, text, text, text) from anon, public;
grant execute on function public.sa_comment(text, text, text, text) to authenticated;

drop function if exists public.sa_start_thread(text, text, text, text, text, text, jsonb, jsonb);
create or replace function public.sa_start_thread(p_zone text, p_title text, p_body text, p_type text, p_version text, p_part text default null, p_pcb jsonb default null, p_source jsonb default null, p_key text default null)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.sa_uid(); tid text; existing text;
begin
  if p_key is not null then
    select id into existing from public.sa_threads where author_id = uid and client_key = p_key;
    if existing is not null then return existing; end if;
  end if;
  if length(trim(coalesce(p_title, ''))) = 0 then raise exception 'A thread needs a title'; end if;
  tid := 'Q-' || public.sa_next('thread');
  insert into public.sa_threads (id, zone, part, pcb, title, body, type, system, version, author_id, source, client_key)
  values (tid, p_zone, p_part, p_pcb, trim(p_title), coalesce(p_body, ''), coalesce(p_type, 'question'), p_zone, coalesce(p_version, ''), uid, p_source, p_key);
  return tid;
end $$;
revoke execute on function public.sa_start_thread(text, text, text, text, text, text, jsonb, jsonb, text) from anon, public;
grant execute on function public.sa_start_thread(text, text, text, text, text, text, jsonb, jsonb, text) to authenticated;
