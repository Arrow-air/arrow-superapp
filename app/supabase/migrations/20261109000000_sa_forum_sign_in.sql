-- Forum sign-in: dao.arrowair.com (Discourse, hosted by Discourse) signs people
-- in with their Arrow account through DiscourseConnect. The forum sends the
-- browser to app.arrowair.com/#/forum/sign-in with a signed request; once the
-- visitor is signed in there, sa_forum_sign_in vouches for the account and
-- returns the forum address to go back to, with a signed answer. The forum
-- learns who someone is (account id, confirmed email, GitHub login, name,
-- avatar), never their session.
--
-- The secret shared with the forum lives in Vault as 'sa_forum_connect' and
-- only this function reads it. This migration makes one if there is none; the
-- same value goes in the forum's discourse_connect_secret setting.

select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'sa_forum_connect',
  'DiscourseConnect secret shared with dao.arrowair.com (its discourse_connect_secret setting)'
)
where not exists (select 1 from vault.secrets where name = 'sa_forum_connect');

-- Form encoding as Discourse writes and reads it (Rack): UTF-8, unreserved
-- characters as they are, everything else as %XX.
create or replace function public.sa_forum_urlencode(s text) returns text
language sql immutable strict set search_path = pg_catalog as $$
  select coalesce(string_agg(case
      when b between 48 and 57 or b between 65 and 90 or b between 97 and 122 or b in (45, 46, 95, 126) then chr(b)
      else '%' || upper(lpad(to_hex(b), 2, '0'))
    end, '' order by i), '')
  from convert_to(s, 'UTF8') as t(bytes),
       generate_series(0, length(t.bytes) - 1) as g(i),
       get_byte(t.bytes, g.i) as v(b)
$$;

create or replace function public.sa_forum_urldecode(s text) returns text
language sql immutable strict set search_path = pg_catalog as $$
  select convert_from(coalesce(string_agg(case
      when m[1] is not null then decode(substr(m[1], 2), 'hex')
      else convert_to(m[2], 'UTF8')
    end, ''::bytea order by n), ''::bytea), 'UTF8')
  from regexp_matches(replace(s, '+', ' '), '(%[0-9A-Fa-f]{2})|([^%]+|%)', 'g') with ordinality as r(m, n)
$$;

revoke execute on function public.sa_forum_urlencode(text) from public, anon, authenticated;
revoke execute on function public.sa_forum_urldecode(text) from public, anon, authenticated;

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

  -- The forum links accounts by email, so it only ever gets a confirmed one.
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
    || '&require_activation=false'
    || coalesce('&username=' || public.sa_forum_urlencode(gh.login), '')
    || coalesce('&name=' || public.sa_forum_urlencode(gh.name), '')
    || coalesce('&avatar_url=' || public.sa_forum_urlencode(gh.avatar), '');
  packed := replace(encode(convert_to(answer, 'UTF8'), 'base64'), E'\n', '');
  return back || '?sso=' || public.sa_forum_urlencode(packed)
    || '&sig=' || encode(extensions.hmac(packed, secret, 'sha256'), 'hex');
end $$;

revoke execute on function public.sa_forum_sign_in(text, text) from public, anon;
grant execute on function public.sa_forum_sign_in(text, text) to authenticated;
