// The Arrow forum (dao.arrowair.com) signs people in with their Arrow account
// (DiscourseConnect). The forum sends the browser to #/forum/sign-in with a
// request it signed; once someone is signed in here, the database vouches for
// the account (sa_forum_sign_in) and the browser goes back to the forum. The
// forum learns who they are, never their session.
import { sb } from './backend';

export const FORUM = 'https://dao.arrowair.com';

/** A forum request waiting on a sign-in that leaves the page (GitHub, an
 * email confirmation link), kept long enough for the forum's nonce to last. */
const KEY = 'arrow-forum-sign-in';
const KEEP_MS = 25 * 60 * 1000;

export interface ForumRequest { sso: string; sig: string }

export function rememberForumRequest(r: ForumRequest) {
  localStorage.setItem(KEY, JSON.stringify({ ...r, at: Date.now() }));
}

export function forgetForumRequest() {
  localStorage.removeItem(KEY);
}

/** The forum request someone left to sign in, if it is still fresh. */
export function pendingForumRequest(): ForumRequest | null {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (r && typeof r.sso === 'string' && typeof r.sig === 'string' && Date.now() - r.at < KEEP_MS) return { sso: r.sso, sig: r.sig };
  } catch { /* fall through */ }
  forgetForumRequest();
  return null;
}

/** True when this page load is the return from GitHub or an email link that a
 * forum sign-in was waiting on. Read at load, before supabase-js tidies the
 * address. */
export const forumLanding = /access_token=|[?&]code=/.test(location.hash + location.search) && pendingForumRequest() !== null;

/** Where to send the browser to finish signing in on the forum, or why not. */
export async function forumAnswer(r: ForumRequest): Promise<{ url: string } | { error: string }> {
  const { data, error } = await sb!.rpc('sa_forum_sign_in', { sso: r.sso, sig: r.sig });
  if (error) return { error: error.message };
  const url = String(data ?? '');
  if (!url.startsWith(`${FORUM}/session/sso_login?`)) return { error: 'The forum sign-in came back malformed.' };
  return { url };
}
