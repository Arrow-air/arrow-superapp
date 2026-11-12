// The Community workspace's shared state: who is looking (signed out, a
// member, core or a lead), the people the database let them see, the saved
// views and filters over them, and the team's names. The People list, the
// sidebar's counts and the person pages all read from here, so a change on
// one shows on the others.
//
// What a viewer sees is decided by the database (sa_registry_cards for
// visitors, sa_registry_people and sa_registry_person for members and the
// team). Nothing here widens it: views that need team data (call status,
// owners, people the team added) are offered only to core and leads, and
// they only ever read fields the API returned.
import { computed, reactive, watch } from 'vue';
import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { remote } from '../../lib/backend';
import { session } from '../../lib/session';
import { state as threadState } from '../threads/store';
import type { IconName } from '../../frame/icons';
import {
  TAXONOMY, TOOLS, demoTeam, demoTeamMe, loadCards, loadMatches, loadPeople, registryDemo,
  type Card, type Match, type OutreachStatus, type Person, type Tool,
} from '../../lib/registry';

// Who is looking -----------------------------------------------------------------
export type Viewer = 'public' | 'member' | 'core' | 'lead';

// The demo's registry answers for whoever the demo menu says you are.
if (!remote) watch(() => threadState.role, (r) => { registryDemo.role = r; }, { immediate: true });

export const viewer = computed<Viewer>(() => {
  if (!remote) return registryDemo.signedOut ? 'public' : threadState.role;
  if (!session.userId) return 'public';
  return session.member?.role ?? 'member';
});
export const onTeam = computed(() => viewer.value === 'core' || viewer.value === 'lead');

// The team's names ---------------------------------------------------------------------
/** Core and leads, for owner pickers. */
export const teamMembers = computed<{ id: string; name: string }[]>(() => (remote
  ? Object.values(session.members).filter((m) => m.role !== 'member').map((m) => ({ id: m.user_id, name: m.display_name }))
  : demoTeam.map((m) => ({ id: m.id, name: m.name }))).sort((a, b) => a.name.localeCompare(b.name)));
/** The signed-in team member's id, as the database writes it on notes and owners. */
export const myTeamId = () => (remote ? session.userId : demoTeamMe());
/** A team member's name, or "you" (lower case: cap() it to start a sentence). */
export function teamName(id: string | null | undefined): string {
  if (!id) return '';
  if (id === myTeamId()) return 'you';
  if (remote) return session.members[id]?.display_name ?? 'Someone on the team';
  return demoTeam.find((m) => m.id === id)?.name ?? 'Someone on the team';
}
/** "Julius's", "your"; fallback when nobody's named. */
export const whose = (id: string | null | undefined, fallback = 'the team\'s') => (!id ? fallback : id === myTeamId() ? 'your' : `${teamName(id)}'s`);
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// The data ------------------------------------------------------------------------------
export const community = reactive({
  phase: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
  error: '',
  /** Who the data below was loaded for; a different viewer reloads. */
  loadedFor: '',
  /** Members and the team: people, as sa_registry_people returned them. */
  people: [] as Person[],
  /** Signed out: the public cards. */
  cards: [] as Card[],
  /** Leads: "same person?" cards. */
  matches: [] as Match[],
});

const keyNow = () => `${viewer.value}|${session.userId ?? ''}`;
/** Loads what this viewer may see; again only when the viewer changed, or forced. */
export async function loadCommunity(force = false) {
  if (remote && !session.ready) return; // the watch below calls again once the session is known
  const key = keyNow();
  if (!force && community.loadedFor === key && community.phase !== 'error') return;
  if (community.loadedFor !== key) { community.phase = 'loading'; community.people = []; community.cards = []; community.matches = []; }
  community.loadedFor = key;
  try {
    const v = viewer.value;
    const [people, cards, matches] = await Promise.all([
      v === 'public' ? [] : loadPeople(),
      v === 'public' ? loadCards() : [],
      v === 'lead' ? loadMatches() : [],
    ]);
    if (keyNow() !== key) return; // someone else is looking now
    Object.assign(community, { people, cards, matches, phase: 'ready', error: '' });
  } catch (e) {
    if (keyNow() !== key) return;
    community.error = (e as Error).message;
    community.phase = 'error';
  }
}
watch([viewer, () => session.userId, () => session.ready], () => { if (community.phase !== 'idle') void loadCommunity(); });

// About a person ----------------------------------------------------------------------------
export const STATUS: Record<OutreachStatus, [string, string]> = {
  new: ['New', 'sky'], invited: ['Invited', 'amber'], booked: ['Call booked', 'indigo'], talked: ['Talked', 'jade'],
  active: ['Active', 'jade'], quiet: ['Quiet', 'slate'], skipped: ['Skipped', 'slate'],
};
export const intro = (p: Person) => p.outreach?.find((o) => o.kind === 'intro');
/** Someone the team added who hasn't joined. Only core and leads ever get these. */
export const teamAdded = (p: Person) => !p.has_account;
/** What they said they can do; for someone who hasn't said, the team's guess. */
export function skillsOf(p: Person): { names: string[]; guess: boolean } {
  const can = p.profile?.can ?? [];
  if (can.length || !p.guess?.disciplines.length) return { names: can, guess: false };
  return { names: p.guess.disciplines, guess: true };
}
export function toolsOf(p: Person): { tools: Tool[]; guess: boolean } {
  const own = p.profile?.tools ?? [];
  if (own.length || !p.guess?.tools.length) return { tools: own, guess: false };
  return { tools: p.guess.tools, guess: true };
}
/** Three or more tools: a shop, as the mockups count it. */
export const hasShop = (p: Person) => toolsOf(p).tools.length >= 3;
export const openToCall = (p: Person) => !!p.profile?.call_ok && ['new', 'invited'].includes(intro(p)?.status ?? 'new');
/** When they joined: their account's claim, or (members don't get that) when they finished their profile. */
export const joinedAt = (p: Person) => (p.has_account ? p.claimed_at ?? p.profile?.finished_at ?? null : null);
const DAY = 864e5;
const daysSince = (iso: string | null | undefined) => (iso ? (Date.now() - Date.parse(iso)) / DAY : Infinity);
/** A finished profile nobody on the team has answered for a week. */
export const waitingOnUs = (p: Person) => p.has_account && !!p.profile?.finished_at && daysSince(p.profile.finished_at) >= 7 && (intro(p)?.status ?? 'new') === 'new';
/** Marked quiet, or invited or talked to and nothing has moved in 30 days. */
export const quiet = (p: Person) => {
  const o = intro(p);
  if (!o) return false;
  return o.status === 'quiet' || (['invited', 'booked', 'talked'].includes(o.status) && daysSince(o.updated_at) >= 30);
};

// Saved views ---------------------------------------------------------------------------------
export interface View { id: string; label: string; icon: IconName; team: boolean; test: (p: Person) => boolean; hint: string }
export const VIEWS: View[] = [
  { id: 'all', label: 'All people', icon: 'people', team: false, test: () => true, hint: '' },
  { id: 'new', label: 'New this week', icon: 'spark', team: false, test: (p) => daysSince(joinedAt(p)) < 7, hint: 'Joined in the last 7 days' },
  { id: 'call', label: 'Open to a call', icon: 'video', team: true, test: openToCall, hint: 'Said yes to an intro call, and nobody has had one with them yet' },
  { id: 'shop', label: 'Has a shop', icon: 'wrench', team: false, test: hasShop, hint: 'Three or more tools' },
  { id: 'team', label: 'Added by the team', icon: 'plus', team: true, test: teamAdded, hint: 'No account yet' },
  { id: 'waiting', label: 'Waiting on us 7+ days', icon: 'clock', team: true, test: waitingOnUs, hint: 'Finished a profile a week or more ago, and nobody has reached out' },
  { id: 'quiet', label: 'Quiet 30+ days', icon: 'eye', team: true, test: quiet, hint: 'Marked quiet, or nothing has moved in 30 days since we reached out' },
];
/** The views this viewer can use. Signed out, only All. */
export const viewsFor = (v: Viewer) => VIEWS.filter((x) => (v === 'public' ? x.id === 'all' : !x.team || v === 'core' || v === 'lead'));
export const findView = (id: unknown, v: Viewer) => viewsFor(v).find((x) => x.id === id) ?? VIEWS[0]!;

export const GROUPS = TAXONOMY.map(([group, , colour, tags]) => ({ group, colour, tags }));
const groupTags = (g: string) => GROUPS.find((x) => x.group === g)?.tags ?? [];
export const inGroup = (names: string[], g: string) => names.some((d) => groupTags(g).includes(d));

// The list's filters, from the route: /community/people?view=…&cat=…&q=…&shop=1&call=1.
export interface Filters { view: string; cat: string; q: string; shop: boolean; call: boolean }
export function filtersOf(route: RouteLocationNormalizedLoaded): Filters {
  const s = (k: string) => (typeof route.query[k] === 'string' ? (route.query[k] as string) : '');
  return { view: s('view') || 'all', cat: s('cat'), q: s('q'), shop: s('shop') === '1', call: s('call') === '1' };
}
const lc = (s: string | null | undefined) => (s ?? '').toLowerCase();
/** Names, what they want to build, places, skills and tools (and, for the team, where we know them from). */
export function haystack(p: Person) {
  const pr = p.profile;
  return [p.name, pr?.wants_to_build, p.city, p.country, pr?.blurb ?? p.blurb, p.discord, p.github, p.source,
    ...skillsOf(p).names, ...(pr?.learn ?? []), ...toolsOf(p).tools.map((t) => TOOLS[t])].map(lc).join(' \n ');
}
export function filterPeople(people: Person[], f: Filters, v: Viewer) {
  const view = findView(f.view, v);
  const q = lc(f.q).trim();
  return people.filter((p) => view.test(p)
    && (!f.cat || inGroup(skillsOf(p).names, f.cat))
    && (!f.shop || hasShop(p))
    && (!f.call || (v !== 'member' && openToCall(p)))
    && (!q || q.split(/\s+/).every((w) => haystack(p).includes(w))));
}
export function filterCards(cards: Card[], f: Filters) {
  const q = lc(f.q).trim();
  return cards.filter((c) => (!f.cat || inGroup(c.disciplines, f.cat))
    && (!q || q.split(/\s+/).every((w) => [c.name, c.city, c.country, c.blurb, c.discord, c.github, ...c.disciplines].map(lc).join(' ').includes(w))));
}

// The sidebar ------------------------------------------------------------------------------------
export interface SideItem { id: string; label: string; icon?: IconName; dot?: string; to: string | { path: string; query?: Record<string, string> }; count?: number; active: boolean; title?: string }
export interface SideGroup { id: string; label: string; items: SideItem[] }

/** Saved views with counts, the taxonomy groups as filters, and the team's pages. */
export function communitySidebar(route: RouteLocationNormalizedLoaded, activeHint?: string): SideGroup[] {
  const v = viewer.value;
  const ready = community.phase === 'ready';
  const onList = route.path === '/community/people';
  const f = filtersOf(route);
  const active = onList ? (f.cat ? `cat:${f.cat}` : `view:${findView(f.view, v).id}`) : activeHint ?? '';
  const people = community.people;
  const views: SideItem[] = viewsFor(v).map((x) => ({
    id: `view:${x.id}`, label: x.label, icon: x.icon, title: x.hint || undefined, active: active === `view:${x.id}`,
    to: { path: '/community/people', query: x.id === 'all' ? {} as Record<string, string> : { view: x.id } },
    count: ready ? (v === 'public' ? community.cards.length : people.filter(x.test).length) : undefined,
  }));
  const cats: SideItem[] = GROUPS.map(({ group, colour }) => ({
    id: `cat:${group}`, label: group, dot: colour, active: active === `cat:${group}`,
    to: { path: '/community/people', query: { cat: group } },
    count: v === 'public' ? community.cards.filter((c) => inGroup(c.disciplines, group)).length : people.filter((p) => inGroup(skillsOf(p).names, group)).length,
  })).filter((x) => !ready || x.count! > 0);
  const groups: SideGroup[] = [{ id: 'people', label: 'People', items: views }];
  if (ready && cats.length) groups.push({ id: 'can', label: 'Can do', items: cats.map((c) => ({ ...c, count: c.count })) });
  if (v === 'core' || v === 'lead') {
    groups.push({ id: 'team', label: 'Team', items: [
      { id: 'reach-out', label: 'Reach out', icon: 'send', to: '/community/reach-out', active: route.path === '/community/reach-out' },
      { id: 'add', label: 'Add a person', icon: 'plus', to: '/community/people/add', active: route.path === '/community/people/add' },
    ] });
  }
  return groups;
}

// Time ----------------------------------------------------------------------------------------------
function offsetMinutes(tz: string, at: Date) {
  try {
    const s = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(at).find((x) => x.type === 'timeZoneName')?.value ?? '';
    const m = s.match(/GMT([+-])(\d+)(?::(\d+))?/);
    return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
  } catch { return 0; }
}
/** "+7 h from you", "same time as you". */
export function fromYou(tz: string | null | undefined, at = new Date()) {
  if (!tz) return '';
  const d = (offsetMinutes(tz, at) + at.getTimezoneOffset()) / 60;
  if (d === 0) return 'same time as you';
  const h = Math.abs(d) % 1 ? Math.abs(d).toFixed(1) : String(Math.abs(d));
  return `${d > 0 ? '+' : '−'}${h} h from you`;
}
export const shortPlace = (city: string | null | undefined, country: string | null | undefined) =>
  [city, country === 'United States' && city ? 'US' : country].filter(Boolean).join(', ');
export const day = (iso: string | null | undefined) => {
  if (!iso) return '';
  const t = new Date(iso);
  if (Number.isNaN(+t)) return '';
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (t.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return t.toLocaleDateString('en-US', opts);
};
