-- Forum sign-in: the forum (dao.arrowair.com) links an existing forum account
-- to whoever arrives with its email address, staff accounts included. Until
-- 2026-11-09 04:50 UTC Arrow sign-ups were confirmed without any email being
-- sent, so email_confirmed_at alone doesn't prove someone owns the address.
-- sa_forum_sign_in now sends require_activation=true unless the address is
-- proven (sa_forum_email_proven). Discourse then doesn't link by email: it
-- makes a new forum account that the address's owner has to activate from
-- their inbox, or refuses if the address is already taken.
--
-- Proven means one of:
-- - confirmed by a link this sign-in service emailed. confirmation_sent_at is
--   only set when a confirmation email went out, so accounts confirmed
--   automatically never count, before 2026-11-09 or after any return to
--   automatic confirmation;
-- - the email GitHub verified on the account's GitHub sign-in;
-- - vouched for in sa_forum_vouched, by an admin who checked who owns it.

create table if not exists public.sa_forum_vouched (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text not null,
  at timestamptz not null default now()
);
alter table public.sa_forum_vouched enable row level security;
revoke all on table public.sa_forum_vouched from public, anon, authenticated;

create or replace function public.sa_forum_email_proven(uid uuid) returns boolean
language sql stable set search_path = pg_catalog, public as $$
  select exists (
      select 1 from auth.users u
      where u.id = uid and u.confirmation_sent_at is not null
        and u.email_confirmed_at >= u.confirmation_sent_at)
    or exists (
      select 1 from auth.users u join auth.identities i on i.user_id = u.id
      where u.id = uid and i.provider = 'github'
        and lower(i.identity_data->>'email') = lower(u.email)
        and i.identity_data->>'email_verified' = 'true')
    or exists (select 1 from public.sa_forum_vouched v where v.user_id = uid)
$$;

revoke execute on function public.sa_forum_email_proven(uuid) from public, anon, authenticated;

-- sso and sig are what the forum put on the address. Returns where to send the
-- browser next: the forum's /session/sso_login with the signed answer.
create or replace function public.sa_forum_sign_in(sso text, sig text) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  forum constant text := 'https://dao.arrowair.com';
  uid uuid := public.sa_uid();
  secret text;
  ask text;
  nonce text;
  back text;
  acct record;
  gh record;
  answer text;
  packed text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'sa_forum_connect';
  if coalesce(length(secret), 0) < 32 then
    raise exception 'Forum sign-in isn''t set up yet.' using errcode = '55000';
  end if;

  -- Only a request the forum signed: it names the nonce and where to answer.
  sso := regexp_replace(coalesce(sso, ''), '\s', '', 'g');
  if sso !~ '^[A-Za-z0-9+/]+={0,2}$' or coalesce(sig, '') !~ '^[0-9A-Fa-f]{64}$'
     or encode(extensions.hmac(sso, secret, 'sha256'), 'hex') <> lower(sig) then
    raise exception 'This forum sign-in link isn''t valid. Start again from the forum.' using errcode = '22023';
  end if;
  ask := '&' || convert_from(decode(sso, 'base64'), 'UTF8');
  nonce := public.sa_forum_urldecode(substring(ask from '&nonce=([^&]*)'));
  back := public.sa_forum_urldecode(substring(ask from '&return_sso_url=([^&]*)'));
  if coalesce(nonce, '') = '' or back is distinct from forum || '/session/sso_login' then
    raise exception 'This forum sign-in link isn''t valid. Start again from the forum.' using errcode = '22023';
  end if;

  select u.email, u.email_confirmed_at, u.banned_until into acct from auth.users u where u.id = uid;
  if acct.email is null or acct.email_confirmed_at is null then
    raise exception 'Confirm your email address first: open the link we emailed you, then try again.' using errcode = '28000';
  end if;
  if acct.banned_until is not null and acct.banned_until > now() then
    raise exception 'This account can''t sign in right now.' using errcode = '28000';
  end if;

  -- GitHub login, name and avatar from GitHub's sign-in record, never from
  -- user metadata, which every account can rewrite.
  select * into gh from public.sa_github(uid);
  answer := 'nonce=' || public.sa_forum_urlencode(nonce)
    || '&external_id=' || uid::text
    || '&email=' || public.sa_forum_urlencode(acct.email)
    -- The forum links by email only when the address is proven (see above).
    || '&require_activation=' || case when public.sa_forum_email_proven(uid) then 'false' else 'true' end
    || coalesce('&username=' || public.sa_forum_urlencode(gh.login), '')
    || coalesce('&name=' || public.sa_forum_urlencode(gh.name), '')
    || coalesce('&avatar_url=' || public.sa_forum_urlencode(gh.avatar), '');
  packed := replace(encode(convert_to(answer, 'UTF8'), 'base64'), E'\n', '');
  return back || '?sso=' || public.sa_forum_urlencode(packed)
    || '&sig=' || encode(extensions.hmac(packed, secret, 'sha256'), 'hex');
end $$;

revoke execute on function public.sa_forum_sign_in(text, text) from public, anon;
grant execute on function public.sa_forum_sign_in(text, text) to authenticated;
