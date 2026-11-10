-- Exercises sa_forum_sign_in (forum sign-in, DiscourseConnect) on the real database without leaving a trace:
-- run it after any not-yet-applied migrations in the same transaction, which this file rolls back.
--   (echo 'begin;'; cat <pending migrations> supabase/tests/sa_forum_sign_in_test.sql) \
--     | ssh <box> 'docker exec -i openship-supabase-db psql -U postgres -X -A -t -v ON_ERROR_STOP=1'
-- On its own it opens the transaction itself. Every check prints "ok ..." or "FAIL ..."; the run ends with ROLLBACK.
-- The last line ("vector ...") is a signed answer under a throwaway secret, for checking with Discourse's own parser.
begin;

create function pg_temp.expect_error(q text, want text) returns text language plpgsql as $$
begin
  execute q;
  return 'FAIL no error: ' || q;
exception when others then
  if position(want in sqlerrm) > 0 then return 'ok   rejects: ' || sqlerrm; end if;
  return 'FAIL wrong error "' || sqlerrm || '" for: ' || q;
end $$;
create function pg_temp.check(label text, cond boolean) returns text language sql as $$
  select case when cond then 'ok   ' else 'FAIL ' end || label
$$;
-- What the forum sends: a nonce and where to answer, form-encoded, Base64, signed.
create function pg_temp.request(secret text, nonce text, back text default 'https://dao.arrowair.com/session/sso_login',
  out sso text, out sig text) language sql as $$
  select x, encode(extensions.hmac(x, secret, 'sha256'), 'hex')
  from (select replace(encode(convert_to('nonce=' || nonce || '&return_sso_url=' || public.sa_forum_urlencode(back), 'UTF8'), 'base64'), E'\n', '') as x) s
$$;
-- One field of the answer the function produced.
create function pg_temp.field(url text, k text) returns text language sql as $$
  select public.sa_forum_urldecode(substring('&' || convert_from(decode(public.sa_forum_urldecode(substring(url from '[?&]sso=([^&]*)')), 'base64'), 'UTF8') from '&' || k || '=([^&]*)'))
$$;

-- A throwaway secret for the run (rolled back with everything else).
select vault.update_secret((select id from vault.secrets where name = 'sa_forum_connect'), repeat('5ec7e7', 10) || 'abcd');
select repeat('5ec7e7', 10) || 'abcd' as secret \gset

-- Throwaway accounts:
--   f1 GitHub, confirmed, a name and login with non-ASCII letters and a plus in the email
--   f2 email only, confirmed, metadata claiming to be errrks
--   f3 email only, not confirmed
--   f4 GitHub, confirmed, banned
insert into auth.users (id, aud, role, email, email_confirmed_at, banned_until, raw_user_meta_data, raw_app_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'sa-forum+gh@example.invalid', now(), null,
   '{"user_name": "sa-forum-gh"}', '{"provider": "github"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated', 'sa-forum-mail@example.invalid', now(), null,
   '{"user_name": "errrks", "full_name": "Not Erick", "avatar_url": "https://avatars.githubusercontent.com/u/113721398?v=4"}', '{"provider": "email"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000f3', 'authenticated', 'authenticated', 'sa-forum-new@example.invalid', null, null,
   '{}', '{"provider": "email"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000f4', 'authenticated', 'authenticated', 'sa-forum-banned@example.invalid', now(), now() + interval '1 day',
   '{}', '{"provider": "github"}', now(), now());
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
  ('999000201', '00000000-0000-4000-8000-0000000000f1',
   '{"sub": "999000201", "user_name": "sa-forum-gh", "full_name": "Zoë Ångström & Co=1", "avatar_url": "https://example.invalid/f1.png?s=40&v=4"}', 'github', now(), now(), now()),
  ('999000204', '00000000-0000-4000-8000-0000000000f4',
   '{"sub": "999000204", "user_name": "sa-forum-banned"}', 'github', now(), now(), now());

select sso, sig from pg_temp.request(:'secret', '0123456789abcdef0123456789abcdef') \gset

-- Signed out.
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select pg_temp.expect_error(format('select public.sa_forum_sign_in(%L, %L)', :'sso', :'sig'), 'permission denied');
reset role;

-- The GitHub account, through the API's role.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);
select public.sa_forum_sign_in(:'sso', :'sig') as url \gset
reset role;
select pg_temp.check('the answer goes to the forum''s sso_login', :'url' like 'https://dao.arrowair.com/session/sso_login?sso=%&sig=%');
select pg_temp.check('the answer is signed with the shared secret',
  substring(:'url' from '&sig=([0-9a-f]{64})$') = encode(extensions.hmac(public.sa_forum_urldecode(substring(:'url' from '[?&]sso=([^&]*)')), :'secret', 'sha256'), 'hex'));
select pg_temp.check('the Base64 in the answer is one line, escaped for the address',
  substring(:'url' from '[?&]sso=([^&]*)') !~ '[+/=\s]');
select pg_temp.check('it echoes the forum''s nonce', pg_temp.field(:'url', 'nonce') = '0123456789abcdef0123456789abcdef');
select pg_temp.check('external_id is the Arrow account id', pg_temp.field(:'url', 'external_id') = '00000000-0000-4000-8000-0000000000f1');
select pg_temp.check('the email comes from the account, plus sign intact', pg_temp.field(:'url', 'email') = 'sa-forum+gh@example.invalid');
select pg_temp.check('the forum may link by email (require_activation=false)', pg_temp.field(:'url', 'require_activation') = 'false');
select pg_temp.check('login, name and avatar come from GitHub''s record, non-ASCII and & = intact',
  pg_temp.field(:'url', 'username') = 'sa-forum-gh' and pg_temp.field(:'url', 'name') = 'Zoë Ångström & Co=1'
  and pg_temp.field(:'url', 'avatar_url') = 'https://example.invalid/f1.png?s=40&v=4');
select pg_temp.check('nothing about staff or groups is sent',
  pg_temp.field(:'url', 'admin') is null and pg_temp.field(:'url', 'moderator') is null and pg_temp.field(:'url', 'groups') is null);

-- The email account whose metadata claims errrks: no GitHub login, name or avatar at all.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f2", "role": "authenticated"}', true);
select public.sa_forum_sign_in(:'sso', :'sig') as url2 \gset
reset role;
select pg_temp.check('an email account sends its email and id only; claimed metadata is ignored',
  pg_temp.field(:'url2', 'email') = 'sa-forum-mail@example.invalid' and pg_temp.field(:'url2', 'external_id') = '00000000-0000-4000-8000-0000000000f2'
  and pg_temp.field(:'url2', 'username') is null and pg_temp.field(:'url2', 'name') is null and pg_temp.field(:'url2', 'avatar_url') is null);

-- Requests the forum didn't sign, or that point somewhere else.
select sso as evil_sso, sig as evil_sig from pg_temp.request(:'secret', 'abad1dea', 'https://evil.example/session/sso_login') \gset
select sso as other_sso, sig as other_sig from pg_temp.request('a-different-secret-a-different-secret!', '0123456789abcdef') \gset
select sso as empty_sso, sig as empty_sig from pg_temp.request(:'secret', '') \gset
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);
select pg_temp.expect_error(format('select public.sa_forum_sign_in(%L, %L)', :'sso', repeat('0', 64)), 'isn''t valid');
select pg_temp.expect_error(format('select public.sa_forum_sign_in(%L, %L)', :'other_sso', :'other_sig'), 'isn''t valid');
select pg_temp.expect_error(format('select public.sa_forum_sign_in(%L, %L)', :'evil_sso', :'evil_sig'), 'isn''t valid');
select pg_temp.expect_error(format('select public.sa_forum_sign_in(%L, %L)', :'empty_sso', :'empty_sig'), 'isn''t valid');
select pg_temp.expect_error(format('select public.sa_forum_sign_in(%L, %L)', 'not base64!', :'sig'), 'isn''t valid');
select pg_temp.expect_error($q$select public.sa_forum_sign_in(null, null)$q$, 'isn''t valid');
-- Not confirmed yet, and banned.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f3", "role": "authenticated"}', true);
select pg_temp.expect_error(format('select public.sa_forum_sign_in(%L, %L)', :'sso', :'sig'), 'Confirm your email');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f4", "role": "authenticated"}', true);
select pg_temp.expect_error(format('select public.sa_forum_sign_in(%L, %L)', :'sso', :'sig'), 'can''t sign in');
-- An account that no longer exists.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000ff", "role": "authenticated"}', true);
select pg_temp.expect_error(format('select public.sa_forum_sign_in(%L, %L)', :'sso', :'sig'), 'Confirm your email');
-- The secret stays out of reach.
select pg_temp.expect_error($q$select decrypted_secret from vault.decrypted_secrets$q$, 'permission denied');
select pg_temp.expect_error($q$select public.sa_forum_urlencode('x')$q$, 'permission denied');
reset role;

-- Who may call what.
select pg_temp.check('signed-in accounts can ask for a forum sign-in; visitors and the encoders are closed',
  has_function_privilege('authenticated', 'public.sa_forum_sign_in(text, text)', 'execute')
  and not has_function_privilege('anon', 'public.sa_forum_sign_in(text, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.sa_forum_urlencode(text)', 'execute')
  and not has_function_privilege('anon', 'public.sa_forum_urldecode(text)', 'execute'));
select pg_temp.check('there is exactly one forum secret', (select count(*) from vault.secrets where name = 'sa_forum_connect') = 1);
select pg_temp.check('the encoders round-trip every byte',
  public.sa_forum_urldecode(public.sa_forum_urlencode(x)) = x)
  from (select string_agg(chr(c), '' order by c) as x from generate_series(1, 400) c) s;

select 'vector ' || :'url';
rollback;
