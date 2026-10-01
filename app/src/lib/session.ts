// Who is signed in, the workspace members, and the sign-in actions. Reads are
// public; anything that writes asks for sign-in first.
import { reactive } from 'vue';
import { remote, sb } from './backend';

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
  notice: '',
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

async function onUser(user: { id: string; email?: string } | null) {
  session.userId = user?.id ?? null;
  session.email = user?.email ?? '';
  session.member = null;
  if (user && sb) {
    const { data, error } = await sb.rpc('sa_join');
    if (error) say(`Couldn't join the workspace: ${error.message}`);
    else session.member = data as Member;
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
export async function signOut() {
  await sb!.auth.signOut();
}
