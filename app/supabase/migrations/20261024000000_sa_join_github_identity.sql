-- Who someone is on GitHub now comes from auth.identities, the record GoTrue
-- writes from GitHub at sign-in, instead of auth.users.raw_user_meta_data.
-- Any signed-in account can rewrite its own user_metadata
-- (supabase.auth.updateUser({ data: { user_name: 'errrks' } })), and email
-- sign-up is open on this shared project, so sa_join handed a lead's grant to
-- whoever claimed the login. Identities can't be edited through the API. The
-- display name still falls back to the account's metadata after GitHub's,
-- since people choose it anyway; login, avatar and role never do.
--
-- Role grants also pin to GitHub's numeric user id the first time they're
-- used: a login can be renamed and then registered by someone else, an id
-- can't. A grant made by login before someone's first sign-in still works.

alter table public.sa_role_grants add column if not exists github_id text;

-- An account's GitHub identity, if it has one. Internal: only sa_join calls it.
create or replace function public.sa_github(uid uuid, out login text, out github_id text, out name text, out avatar text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare d jsonb;
begin
  select identity_data, provider_id into d, github_id from auth.identities
    where user_id = uid and provider = 'github'
    order by last_sign_in_at desc nulls last
    limit 1;
  login := nullif(coalesce(d->>'user_name', d->>'preferred_username'), '');
  name := coalesce(nullif(d->>'full_name', ''), nullif(d->>'name', ''));
  avatar := nullif(d->>'avatar_url', '');
end $$;
revoke execute on function public.sa_github(uuid) from public, anon, authenticated;

-- Joining: a member row from the account. A role is granted once, when someone
-- first joins: by their GitHub id, or by login while the grant is unused.
create or replace function public.sa_join() returns public.sa_members language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := public.sa_uid();
  gh record;
  meta jsonb;
  mail text;
  grant_login text;
  granted text;
  row public.sa_members;
begin
  select * into gh from public.sa_github(uid);
  select u.raw_user_meta_data, u.email into meta, mail from auth.users u where u.id = uid;
  if gh.github_id is not null and not exists (select 1 from public.sa_members where user_id = uid) then
    select g.github, g.role into grant_login, granted from public.sa_role_grants g
      where g.github_id = gh.github_id or (g.github_id is null and lower(g.github) = lower(gh.login))
      order by g.github_id is null
      limit 1;
  end if;
  insert into public.sa_members (user_id, display_name, avatar_url, github, role)
  values (
    uid,
    coalesce(gh.name, nullif(meta->>'full_name', ''), nullif(meta->>'name', ''), gh.login, split_part(mail, '@', 1)),
    gh.avatar,
    gh.login,
    coalesce(granted, 'member')
  )
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    github = excluded.github
  returning * into row;
  if grant_login is not null then
    update public.sa_role_grants set github_id = gh.github_id where github = grant_login and github_id is null;
  end if;
  return row;
end $$;

-- Grants already used: pin each to the one GitHub account that holds its login.
with used as (
  select lower(coalesce(nullif(i.identity_data->>'user_name', ''), i.identity_data->>'preferred_username')) as login, min(i.provider_id) as github_id
  from auth.identities i join public.sa_members m on m.user_id = i.user_id
  where i.provider = 'github'
  group by 1
  having count(distinct i.provider_id) = 1
)
update public.sa_role_grants g set github_id = used.github_id
from used
where used.login = lower(g.github) and g.github_id is null;

-- Members' GitHub logins and avatars as GitHub has them, without waiting for
-- everyone to sign in again.
update public.sa_members m set github = x.login, avatar_url = x.avatar
from public.sa_members s cross join lateral public.sa_github(s.user_id) x
where s.user_id = m.user_id and (m.github is distinct from x.login or m.avatar_url is distinct from x.avatar);
