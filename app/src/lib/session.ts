// Who is signed in, the workspace members, and the sign-in actions. Reads are
// public; anything that writes asks for sign-in first.
import { reactive } from 'vue';
import { remote, sb } from './backend';
import { forumLanding } from './forum';
import { claimRegistry } from './registry';

export interface Member { user_id: string; display_name: string; avatar_url: string | null; github: string | null; role: 'member' | 'core' | 'lead' }

export const session = reactive({
  ready: !remote,
  userId: null as string | null,
  email: '',
  member: null as Member | null,
  members: {} as Record<string, Member>,
  /** "thread|user" pairs: who declared they'd help build what. */
  builders: [] as string[],
  signInOpen: false,
  /** 'forum' while the forum (dao.arrowair.com) is waiting on this sign-in. */
  signInFor: '' as '' | 'forum',
  /** A reset link signed them in: they still have to choose a password. */
  newPassword: false,
  notice: '',
});

// supabase-js reports a reset link while it reads the address, before
// initSession runs, so this listens from the start.
sb?.auth.onAuthStateChange((event) => {
  if (event !== 'PASSWORD_RECOVERY') return;
  session.newPassword = true;
  session.signInOpen = true;
});

let reloadHook: () => Promise<void> = async () => {};
export const onReload = (fn: () => Promise<void>) => { reloadHook = fn; };
export const reload = () => reloadHook();

export function say(msg: string) {
  session.notice = msg;
  window.setTimeout(() => { if (session.notice === msg) session.notice = ''; }, 6000);
}

/** True when the visitor may write; otherwise opens the sign-in dialog. */
export function requireSignIn(): boolean {
  if (!remote || session.userId) return true;
  session.signInOpen = true;
  return false;
}

// Signing in to the forum through this app doesn't make someone a workspace member.
const onForumPage = () => forumLanding || location.hash.startsWith('#/forum/');

async function onUser(user: { id: string; email?: string } | null) {
  session.userId = user?.id ?? null;
  session.email = user?.email ?? '';
  session.member = null;
  if (user && sb && !onForumPage()) {
    const { data, error } = await sb.rpc('sa_join');
    if (error) say(`Couldn't join the workspace: ${error.message}`);
    else {
      session.member = data as Member;
      // Links a registry record the team added for them; never blocks sign-in.
      void claimRegistry();
    }
  }
  await reload();
  session.ready = true;
}

export async function initSession() {
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  await onUser(data.session?.user ?? null);
  let last = data.session?.user?.id ?? null;
  sb.auth.onAuthStateChange((_event, s) => {
    const id = s?.user?.id ?? null;
    if (id === last) return; // token refreshes don't change who is signed in
    last = id;
    void onUser(s?.user ?? null);
  });
  // flights.arrowair.com keeps its sign-in in this app's storage
  // (public/session-bridge.html), so signing in or out there shows up here as a
  // change to the stored session.
  window.addEventListener('storage', (e) => {
    if (!e.key || !/^sb-[a-z0-9-]+-auth-token$/.test(e.key)) return;
    void sb!.auth.getSession().then(({ data: { session: s } }) => {
      const id = s?.user?.id ?? null;
      if (id === last) return;
      last = id;
      void onUser(s?.user ?? null);
    });
  });
  // Keep up with everyone else: refresh while the tab is visible, and on return.
  window.setInterval(() => { if (document.visibilityState === 'visible') void reload(); }, 20000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void reload(); });
}

export const signInWithGitHub = () => sb!.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: `${location.origin}/` } });
export async function signInWithPassword(email: string, password: string) {
  const { error } = await sb!.auth.signInWithPassword({ email, password });
  if (!error) session.signInOpen = false;
  return error?.message ?? null;
}
/** Joins someone who signed in on the forum page and then stayed in the app. */
export async function joinIfSignedIn() {
  if (!sb || !session.userId || session.member) return;
  const { data, error } = await sb.rpc('sa_join');
  if (error) return;
  session.member = data as Member;
  void claimRegistry();
}
/** A new Arrow account. The confirmation link signs them in here. */
export async function signUpWithPassword(email: string, password: string) {
  const { error } = await sb!.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/` } });
  return error?.message ?? null;
}
/** The reset link comes back here (PKCE: to the browser that asked), which
 * then asks for the new password. */
export async function sendPasswordReset(email: string) {
  const { error } = await sb!.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/` });
  return error?.message ?? null;
}
/** After a reset link signed them in: the password they'll use from now on. */
export async function setNewPassword(password: string) {
  const { error } = await sb!.auth.updateUser({ password });
  if (error) return error.message;
  session.newPassword = false;
  session.signInOpen = false;
  return null;
}
export async function signOut() {
  await sb!.auth.signOut();
}
