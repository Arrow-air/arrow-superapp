// Reach out's pieces that aren't layout (the onboarding mockups' screen 6,
// Intro calls): who is waiting for an invite and in what order, the stages
// after it, two or three call times picked in your time zone and read in
// theirs, and the drafts. The app never sends anything: a person copies the
// draft and sends it from their own Discord or email.
import { computed } from 'vue';
import type { OutreachStatus, Person } from '../../lib/registry';
import { isOpen, state as threadState } from '../threads/store';
import { ZONE_TAGS } from './matching';
import { intro, skillsOf, teamAdded } from './community';
import { firstName } from './you';
import { listing } from './taxonomy';

// Who is where ------------------------------------------------------------------------------
export type Stage = 'queue' | 'invited' | 'booked' | 'talked' | 'due';
export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: 'queue', label: 'to invite', hint: 'In the intro-call queue, or said yes to a call on their profile, and not invited yet' },
  { id: 'invited', label: 'invited', hint: 'Invited to a call or to join; no call booked yet' },
  { id: 'booked', label: 'call booked', hint: 'A call is booked' },
  { id: 'talked', label: 'talked', hint: 'Had the call' },
  { id: 'due', label: 'notes due', hint: 'Marked talked, with no call notes yet' },
];
const statusOf = (p: Person): OutreachStatus => intro(p)?.status ?? 'new';
/** Waiting for an invite: the team put them in the queue, or they asked for a call. */
export const inQueue = (p: Person) => statusOf(p) === 'new' && (!!intro(p)?.intro_queue || !!p.profile?.call_ok);
export const notesDue = (p: Person) => statusOf(p) === 'talked' && (p.call_notes ?? 0) === 0;
export function inStage(p: Person, s: Stage) {
  if (s === 'queue') return inQueue(p);
  if (s === 'due') return notesDue(p);
  return statusOf(p) === s;
}

// Best signal first -----------------------------------------------------------------------------
/** Disciplines the open threads' zones need, from the same map Matched for you uses. */
export const neededNow = computed(() => {
  const out = new Set<string>();
  for (const t of threadState.threads) if (isOpen(t)) for (const d of ZONE_TAGS[t.zone]?.d ?? []) out.add(d);
  return out;
});
export const RANKING = 'Best signal first: a story with specifics, links (a GitHub account counts), skills that open threads need now, then how long they\'ve waited.';

const DAY = 864e5;
/** Since when they've waited: their finished profile, or the day the team added them. */
export const waitingSince = (p: Person) => p.profile?.finished_at ?? p.created_at ?? p.claimed_at ?? null;
export function waitedDays(p: Person, now = Date.now()) {
  const at = waitingSince(p);
  return at ? Math.max(0, Math.floor((now - Date.parse(at)) / DAY)) : 0;
}
export function signal(p: Person, needed: Set<string>, now = Date.now()): { score: number; why: string[] } {
  let score = 0;
  const why: string[] = [];
  const story = p.profile?.story?.trim() ?? '';
  if (story.length >= 120 || (story && /\d/.test(story))) { score += 2; why.push('a story with specifics'); }
  else if (story) { score += 1; why.push('a short story'); }
  const links = Math.min(2, p.profile?.links?.length ?? 0) + (p.github ? 1 : 0);
  if (links) { score += links; why.push(p.github && links === 1 ? 'GitHub' : `${links} link${links === 1 ? '' : 's'}`); }
  if (teamAdded(p) && (p.note_count ?? 0) > 0) { score += 1; why.push('a note from the team'); }
  const fit = skillsOf(p).names.filter((d) => needed.has(d)).slice(0, 2);
  if (fit.length) { score += fit.length; why.push(`${listing(fit)} needed now`); }
  const days = waitedDays(p, now);
  score += Math.min(3, Math.floor(days / 7));
  why.push(days === 0 ? 'added today' : `waiting ${days} day${days === 1 ? '' : 's'}`);
  return { score, why };
}
export function ranked(people: Person[], needed: Set<string>, now = Date.now()) {
  return people.map((p) => ({ p, ...signal(p, needed, now), days: waitedDays(p, now) }))
    .sort((a, b) => b.score - a.score || b.days - a.days || a.p.name.localeCompare(b.p.name));
}

// Time ------------------------------------------------------------------------------------------
export const myZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
export function validZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}
function hourIn(at: Date, tz: string) {
  const h = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(at);
  return Number(h);
}
function offsetIn(at: Date, tz: string) {
  const s = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(at).find((x) => x.type === 'timeZoneName')?.value ?? '';
  const m = s.match(/GMT([+-])(\d+)(?::(\d+))?/);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
}
/** Same clock as yours at that moment. */
export const sameClock = (at: Date, tz: string) => offsetIn(at, tz) === -at.getTimezoneOffset();
/** "Thu, Nov 12, 2:00 PM" in a zone (with its abbreviation when asked). */
export function slotText(at: Date, tz?: string, zoneName = false) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', ...(zoneName ? { timeZoneName: 'short' } : {}) }).format(at);
}
/** For a datetime-local input, in this browser's zone. */
export function localInput(at: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}
/** Three weekday times from tomorrow on, in your working hours, that fall in theirs if they can
 * (9 to 6 there, then 8 to 9), on three different days. */
export function suggestSlots(theirTz: string | null | undefined, now = new Date(), n = 3): Date[] {
  const tz = validZone(theirTz) ? theirTz : null;
  const hours = [10, 14, 9, 11, 13, 15, 16, 17, 8, 18, 19];
  const days: Date[] = [];
  for (let i = 1; days.length < 8 && i < 16; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(d);
  }
  const at = (d: Date, h: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0);
  for (const [lo, hi] of [[9, 18], [8, 21], [0, 24]] as const) {
    const out: Date[] = [];
    for (const d of days) {
      const h = hours.find((x) => { const t = at(d, x); const th = tz ? hourIn(t, tz) : x; return th >= lo && th < hi; });
      if (h !== undefined) out.push(at(d, h));
      if (out.length === n) return out;
    }
  }
  return days.slice(0, n).map((d) => at(d, 10));
}

// Drafts -------------------------------------------------------------------------------------------
const lowerFirst = (s: string) => (s && !/^[A-Z]{2}/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const noStop = (s: string) => s.trim().replace(/[.!?\s]+$/, '');
/** The first sentence of what they wrote, cut at a word near 180 characters. */
export function firstSentence(s: string, max = 180) {
  const t = s.trim().replace(/\s+/g, ' ');
  const m = t.match(/^.+?[.!?](?=\s|$)/);
  let out = m ? m[0] : t;
  if (out.length > max) out = `${out.slice(0, max).replace(/\s+\S*$/, '')}…`;
  return out;
}
/** Where the draft's first line comes from, said beside the draft. */
export type HookSource = 'story' | 'build' | 'pointer' | 'none';
/** A first line about them: their story, what they want to build, or who on the team pointed you to them. */
export function hookFor(p: Person, pointer: string | null): { line: string; from: HookSource } {
  const story = p.profile?.story?.trim();
  if (story) return { line: `I read your profile: “${firstSentence(story)}” I'd like to hear more about that.`, from: 'story' };
  const wtb = p.profile?.wants_to_build?.trim();
  if (wtb) return { line: `You said you'd like to build ${lowerFirst(noStop(wtb))}. I'd like to hear more about that.`, from: 'build' };
  if (pointer) return { line: `${pointer} pointed me your way, and I'd like to hear what you're working on.`, from: 'pointer' };
  return { line: 'I\'d like to hear what you\'re working on.', from: 'none' };
}
const sign = (me: string) => firstName(me) || me;

export interface CallDraft { person: Person; me: string; hook: string; slots: Date[]; tz: string | null }
export function callDraft({ person, me, hook, slots, tz }: CallDraft) {
  const first = firstName(person.name) || person.name;
  const zone = validZone(tz) ? tz : null;
  const same = !zone || slots.every((s) => sameClock(s, zone));
  const times = slots.map((s) => slotText(s, zone ?? undefined, !zone));
  const list = times.length > 1 ? `${times.slice(0, -1).join('; ')}; or ${times[times.length - 1]}` : times[0] ?? '';
  const when = !times.length ? 'Send me a couple of times that suit you.'
    : `A few times that work for me${zone && !same ? ', in your time' : ''}: ${list}. Or send me a couple that suit you.`;
  return `Hey ${first}, ${sign(me)} from Arrow here.\n\n${hook}\n\nUp for a 20-minute call? ${when}\n\n${sign(me)}`;
}
export function joinDraft(person: Person, me: string, hook: string, link: string) {
  const first = firstName(person.name) || person.name;
  return `Hey ${first}, ${sign(me)} from Arrow here.\n\n${hook}\n\nIf you'd like to build with us, this takes three minutes and tells us what you can do and what you'd like to work on:\n${link}\n\n${sign(me)}`;
}
/** The ref a personal invite carries: "invite-" and who sent it, in the database's ref shape. */
export function inviteRef(me: string) {
  const slug = me.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 56);
  return `invite-${slug || 'team'}`;
}
export const joinLink = (ref: string, origin = location.origin) => `${origin}/#/join?ref=${encodeURIComponent(ref)}`;
export const discordDm = (discordId: string | null | undefined) => (discordId && /^[1-9]\d{5,24}$/.test(discordId) ? `https://discord.com/users/${discordId}` : '');

/** The after-call note, as one call note. */
export function callNote(goodAt: string, wants: string, next: string) {
  return [['Good at', goodAt], ['Wants', wants], ['Next step', next]].filter(([, v]) => v!.trim()).map(([k, v]) => `${k}: ${v!.trim()}`).join('\n');
}
