// Turning a handle the team typed into an id that can link a record to its
// person (Add a person). GitHub's public API answers in the browser:
// https://api.github.com/users/<login> gives the account's numeric id, which
// stays when the login changes, so a login someone else takes later gets
// nothing. Without an id the login is saved on its own, and a lead confirms
// the match when they join. Discord usernames wait for phase 2's bot (its
// guild member search); nothing here looks them up.
// The demo never calls GitHub: it makes up an id from the login, and says
// "not found" for logins starting with "no-such-".
import { remote } from '../../lib/backend';
import { demoGitHubId } from '../../lib/registry';

export type GitHubLookup =
  | { ok: true; login: string; id: number; name: string | null }
  | { ok: false; why: 'invalid' | 'not_found' | 'rate_limited' | 'offline' | 'error'; detail?: string };

/** A login from what was typed: "@octocat", "octocat" or a github.com link. */
export function githubLogin(typed: string): string {
  let v = typed.trim();
  const m = v.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)/i);
  if (m) v = m[1]!;
  return v.replace(/^@/, '');
}
/** GitHub's rule: letters, digits and single hyphens inside, 39 at most. */
export const validGitHubLogin = (login: string) => /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(login);

const cache = new Map<string, GitHubLookup>();

export async function lookupGitHub(typed: string, signal?: AbortSignal): Promise<GitHubLookup> {
  const login = githubLogin(typed);
  if (!validGitHubLogin(login)) return { ok: false, why: 'invalid' };
  const key = login.toLowerCase();
  const known = cache.get(key);
  if (known) return known;
  let r: GitHubLookup;
  if (!remote) {
    await new Promise((res) => setTimeout(res, 150));
    r = key.startsWith('no-such-') ? { ok: false, why: 'not_found' } : { ok: true, login, id: demoGitHubId(login), name: null };
  } else {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, why: 'offline' };
    let res: Response;
    try {
      res = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, { headers: { Accept: 'application/vnd.github+json' }, signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      return { ok: false, why: 'offline' };
    }
    if (res.status === 404) r = { ok: false, why: 'not_found' };
    else if (res.status === 429 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0')) {
      const reset = Number(res.headers.get('x-ratelimit-reset'));
      const at = reset ? new Date(reset * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
      return { ok: false, why: 'rate_limited', detail: at };
    } else if (!res.ok) return { ok: false, why: 'error', detail: String(res.status) };
    else {
      const j = await res.json().catch(() => null) as { id?: unknown; login?: unknown; name?: unknown; type?: unknown } | null;
      if (!j || typeof j.id !== 'number' || !Number.isSafeInteger(j.id) || j.id <= 0 || typeof j.login !== 'string') return { ok: false, why: 'error', detail: 'an answer without an id' };
      r = { ok: true, login: j.login, id: j.id, name: typeof j.name === 'string' && j.name.trim() ? j.name.trim() : null };
    }
  }
  cache.set(key, r);
  return r;
}

/** What the page says when a login didn't resolve. */
export function lookupWords(r: Extract<GitHubLookup, { ok: false }>, login: string): string {
  switch (r.why) {
    case 'invalid': return `“${login}” isn't a GitHub login: letters, numbers and single hyphens, 39 at most.`;
    case 'not_found': return `GitHub has nobody called ${login}. Check the spelling, or leave it empty.`;
    case 'rate_limited': return `GitHub won't answer more lookups from this network for now${r.detail ? ` (until about ${r.detail})` : ''}.`;
    case 'offline': return 'Couldn\'t reach GitHub: this browser looks offline.';
    default: return `GitHub didn't answer properly${r.detail ? ` (${r.detail})` : ''}.`;
  }
}
