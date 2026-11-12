// The join wizard's answers. They live in this browser (like lib/drafts.ts)
// from the first keystroke until the database has them, so a reload or a
// dropped connection loses nothing; each step is then saved with
// sa_save_profile (lib/registry.ts) and the last one finishes the profile.
import {
  BLURB_MAX, DISCIPLINES, blurbHasLink,
  type BuildOption, type Card, type Lane, type Link, type MapPrecision, type Person, type ProfileFields, type Tool, type Want,
} from '../../lib/registry';

export type StepId = 'signin' | 'build' | 'skills' | 'story' | 'place' | 'time' | 'links' | 'visibility' | 'done';
export const STEPS: StepId[] = ['signin', 'build', 'skills', 'story', 'place', 'time', 'links', 'visibility', 'done'];
/** The questions "Just following along" skips, as in Gavin's wizard. */
export const WORK_STEPS: StepId[] = ['skills', 'story', 'place', 'time'];
export const STEP_LABEL: Record<StepId, string> = {
  signin: 'Sign in', build: 'Build', skills: 'Skills', story: 'Story', place: 'Place', time: 'Time', links: 'Links', visibility: 'Who sees what', done: 'Done',
};

// Choices whose words are what gets saved.
export const EXPERIENCE = ['Learning', 'Hobbyist', 'Did it for a living', 'Could lead it'];
export const TRAVEL = ['Stay local', 'Up to 300 km', 'Anywhere in my country', 'Anywhere'];
export const HOURS = ['A few hours a month', '2 to 5 h a week', '5 to 10 h a week', '10+ h a week', 'This is my main thing'];
export const WHEN = ['Weekday days', 'Weekday evenings', 'Weekends', 'Flexible'];
export const CALL_WINDOWS = ['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Weekends'];
export const HEARD = ['X', 'YouTube', 'Discord', 'GitHub', 'A friend', 'An event', 'Search', 'Other'];

export interface JoinDraft {
  v: 1;
  /** Whose answers these are once someone signed in ('me' in the demo). */
  userId: string | null;
  step: StepId;
  /** Editing a finished profile rather than making one. */
  edit: boolean;
  updatedAt: string;
  wants_to_build: string;
  lanes: Lane[];
  can: string[];
  learn: string[];
  experience: string;
  story: string;
  city: string;
  country: string;
  /** How much of the place the map shows when they're on it. */
  mapAt: 'city' | 'country';
  mapOn: boolean;
  tools: Tool[];
  build: BuildOption[];
  buildNotNow: boolean;
  travel: string;
  hours: string;
  when: string[];
  tz: string;
  wants: Want[];
  never: string;
  discord: string;
  x: string;
  linkedin: string;
  github: string;
  work: string[];
  heard_from: string;
  name: string;
  blurb: string;
  map_disciplines: string[];
  /** False until they pick the card's disciplines themselves: until then it follows their first three can-dos. */
  mapPicked: boolean;
  call_ok: boolean;
  call_windows: string[];
}

export const browserTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };

export function blankDraft(): JoinDraft {
  return {
    v: 1, userId: null, step: 'signin', edit: false, updatedAt: new Date().toISOString(),
    wants_to_build: '', lanes: [], can: [], learn: [], experience: '', story: '',
    city: '', country: '', mapAt: 'city', mapOn: true, tools: [], build: [], buildNotNow: false, travel: '',
    hours: '', when: [], tz: browserTz(), wants: [], never: '',
    discord: '', x: '', linkedin: '', github: '', work: [''], heard_from: '',
    name: '', blurb: '', map_disciplines: [], mapPicked: false, call_ok: false, call_windows: [],
  };
}

// Storage ---------------------------------------------------------------------
const KEY = 'superapp:join-draft.v1';
export function loadDraft(): JoinDraft | null {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (d && d.v === 1 && STEPS.includes(d.step)) return { ...blankDraft(), ...d };
  } catch { /* corrupt: start again */ }
  return null;
}
export function storeDraft(d: JoinDraft) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...d, updatedAt: new Date().toISOString() })); } catch { /* storage unavailable */ }
}
export function forgetDraft() { try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ } }

/** A join waiting on a sign-in that leaves the page (GitHub, an email link):
 * the landing back at the app picks it up and returns to /join (main.ts).
 * Kept long enough to open a confirmation email, not forever, so a later
 * unrelated sign-in doesn't land in the wizard. */
const PENDING = 'superapp:join-pending';
const PENDING_MS = 2 * 60 * 60 * 1000;
export function rememberPendingJoin() { try { localStorage.setItem(PENDING, String(Date.now())); } catch { /* storage unavailable */ } }
export function forgetPendingJoin() { try { localStorage.removeItem(PENDING); } catch { /* storage unavailable */ } }
export function pendingJoin(): boolean {
  try {
    const at = Number(localStorage.getItem(PENDING));
    if (at && Date.now() - at < PENDING_MS) return true;
  } catch { /* fall through */ }
  forgetPendingJoin();
  return false;
}
/** True when this page load is the return from GitHub or an email link that a
 * join was waiting on. Read at load, before supabase-js tidies the address. */
export const joinLanding = /access_token=|[?&]code=/.test(location.hash + location.search) && pendingJoin();

// Steps ------------------------------------------------------------------------
export const following = (d: JoinDraft) => d.lanes.includes('follow');
/** The steps this person goes through, in order. */
export function stepsFor(d: JoinDraft, signedIn: boolean): StepId[] {
  return STEPS.filter((s) => !(following(d) && WORK_STEPS.includes(s)) && !(s === 'signin' && (signedIn || d.edit)));
}
/** The questions only: what the progress bar counts. */
export const questionSteps = (d: JoinDraft, signedIn: boolean): StepId[] => stepsFor(d, signedIn).filter((s) => s !== 'signin' && s !== 'done');

/** Where someone who left an unfinished profile on another device picks up:
 * the first question they haven't answered. */
export function resumeStep(d: JoinDraft): StepId {
  if (!d.wants_to_build.trim()) return 'build';
  const filled: Partial<Record<StepId, boolean>> = {
    skills: d.can.length + d.learn.length > 0, story: !!d.story.trim(), place: !!(d.country || d.city || d.tools.length),
    time: !!(d.hours || d.when.length || d.wants.length), links: !!(d.heard_from || d.x || d.linkedin || d.work.some((w) => w.trim())),
  };
  return questionSteps(d, true).find((s) => filled[s] === false) ?? 'visibility';
}

// The answers as the database takes them -------------------------------------------
/** What the map shows: city precision needs a city; nothing, if they said so. */
export function mapOf(d: JoinDraft): MapPrecision {
  if (!d.mapOn) return 'off';
  return d.mapAt === 'city' && d.city.trim() ? 'city' : 'country';
}
const withScheme = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);
const handle = (v: string) => v.trim().replace(/^@/, '');
/** A link someone typed, as a full address, or null when it isn't one. */
export function linkUrl(kind: 'x' | 'linkedin' | 'github' | 'work', raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/\s/.test(v)) return null;
  if (kind === 'x' && /^@?[A-Za-z0-9_]{1,15}$/.test(v)) return `https://x.com/${handle(v)}`;
  if (kind === 'github' && /^@?[A-Za-z0-9-]{1,39}$/.test(v)) return `https://github.com/${handle(v)}`;
  if (kind === 'linkedin' && /^[A-Za-z0-9-]{3,100}$/.test(v)) return `https://www.linkedin.com/in/${v}`;
  if (!/^(https?:\/\/)?[^/.\s]+\.[^\s]+$/i.test(v)) return null;
  return withScheme(v);
}
export function linksOf(d: JoinDraft): Link[] {
  const out: Link[] = [];
  const add = (label: string | undefined, kind: Parameters<typeof linkUrl>[0], v: string) => { const url = linkUrl(kind, v); if (url) out.push(label ? { label, url } : { url }); };
  add('X', 'x', d.x);
  add('LinkedIn', 'linkedin', d.linkedin);
  add('GitHub', 'github', d.github);
  for (const w of d.work) add(undefined, 'work', w);
  return out.slice(0, 12);
}

/** What each step saves. */
export function fieldsOf(step: StepId, d: JoinDraft): ProfileFields {
  switch (step) {
    case 'build': return { wants_to_build: d.wants_to_build.trim(), lanes: d.lanes };
    case 'skills': return { can: d.can, learn: d.learn, experience: d.experience };
    case 'story': return { story: d.story };
    case 'place': return { city: d.city.trim() || null, country: d.country.trim() || null, map: mapOf(d), tools: d.tools, build: d.buildNotNow ? [] : d.build, travel: d.travel };
    case 'time': return { hours: d.hours, availability: d.when.join(', '), tz: d.tz, wants: d.wants, never: d.never };
    case 'links': return { ...(d.discord.trim() ? { discord: d.discord.trim() } : {}), links: linksOf(d), heard_from: d.heard_from };
    case 'visibility': return {
      ...(d.name.trim() ? { display_name: d.name.trim() } : {}),
      // The visibility step can fill in the country a follower skipped.
      ...(following(d) ? { country: d.country.trim() || null } : {}),
      blurb: d.blurb.trim(), map_disciplines: mapDisciplines(d), map: mapOf(d), call_ok: d.call_ok,
      call_windows: d.call_ok ? d.call_windows.join(', ') : '', tz: d.tz,
    };
    default: return {};
  }
}
/** Everything answered up to and including a step, so a save that failed
 * offline goes through with the next one. */
export function fieldsUpTo(step: StepId, d: JoinDraft, steps: StepId[]): ProfileFields {
  const upto = steps.indexOf(step);
  return Object.assign({}, ...steps.filter((_, i) => i <= upto).map((s) => fieldsOf(s, d)));
}

/** The card's disciplines: their pick, else the first three they can do. */
export const mapDisciplines = (d: JoinDraft) => (d.mapPicked ? d.map_disciplines : d.can).filter((x) => d.can.includes(x) || d.learn.includes(x)).slice(0, 3);

/** Their public card as the map would show it. */
export function cardOf(d: JoinDraft, extra: { github?: string | null; joined?: string } = {}): Card {
  const map = mapOf(d);
  return {
    id: 'preview', name: d.name.trim() || 'Your name', city: map === 'city' ? d.city.trim() : null, country: map !== 'off' ? d.country.trim() || null : null,
    lat: null, lng: null, tz: map !== 'off' ? d.tz : null, disciplines: mapDisciplines(d), blurb: d.blurb.trim() || null,
    discord: d.discord.trim().replace(/^@/, '') || null, github: extra.github ?? null, joined: extra.joined ?? new Date().toISOString().slice(0, 7),
  };
}

// Validation ---------------------------------------------------------------------
export type Problems = Partial<Record<string, string>>;
/** What's wrong on a step, by field, in words for next to the field. */
export function problemsOf(step: StepId, d: JoinDraft): Problems {
  const p: Problems = {};
  const tooLong = (field: string, v: string, max: number, what: string) => { if (v.trim().length > max) p[field] = `${what} is ${v.trim().length} characters; ${max} at most.`; };
  if (step === 'build') {
    if (!d.wants_to_build.trim()) p.wants_to_build = 'Tell us what you want to build, in a sentence or two. It\'s the one answer we need.';
    tooLong('wants_to_build', d.wants_to_build, 500, 'This');
  }
  if (step === 'skills') {
    const bad = [...d.can, ...d.learn].find((x) => !DISCIPLINES.includes(x));
    if (bad) p.can = `${bad} isn't on Arrow's discipline list.`;
  }
  if (step === 'story') tooLong('story', d.story, 4000, 'Your story');
  if (step === 'place') {
    tooLong('city', d.city, 80, 'The city');
    tooLong('country', d.country, 60, 'The country');
    tooLong('travel', d.travel, 120, 'This');
  }
  if (step === 'time') {
    if (!validTz(d.tz)) p.tz = 'Pick your time zone from the list.';
    tooLong('never', d.never, 500, 'This');
  }
  if (step === 'links') {
    if (d.discord.trim().length > 40) p.discord = 'A Discord username is 40 characters at most.';
    for (const k of ['x', 'linkedin', 'github'] as const) if (d[k].trim() && !linkUrl(k, d[k])) p[k] = 'That doesn\'t look like a link or a handle.';
    d.work.forEach((w, i) => { if (w.trim() && !linkUrl('work', w)) p[`work${i}`] = 'That doesn\'t look like a link. Paste the whole address.'; });
    if ([d.x, d.linkedin, d.github, ...d.work].filter((w) => w.trim()).length > 12) p.work = 'Twelve links at most.';
  }
  if (step === 'visibility') {
    if (!d.name.trim()) p.name = 'Your name, as people will see it.';
    tooLong('name', d.name, 80, 'Your name');
    if (d.blurb.trim().length > BLURB_MAX) p.blurb = `${d.blurb.trim().length} characters: the map takes ${BLURB_MAX} at most.`;
    else if (blurbHasLink(d.blurb)) p.blurb = 'Keep links out of the blurb; add them on the Links step.';
    if (d.mapPicked && d.map_disciplines.length > 3) p.map_disciplines = 'Pick 3 at most.';
    if (d.mapOn && !d.country.trim()) p.country = 'The map needs at least your country. Add it, or turn the map off.';
  }
  return p;
}
export function validTz(tz: string) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return !!tz; } catch { return false; }
}

/** Which step and field a message from the database is about. */
export function fieldOfError(msg: string): { step: StepId; field: string } | null {
  const m = msg.toLowerCase();
  // Most specific first: "Keep links out of the blurb" is about the blurb, not the links.
  const map: [RegExp, StepId, string][] = [
    [/blurb/, 'visibility', 'blurb'], [/map disciplines/, 'visibility', 'map_disciplines'], [/your name/, 'visibility', 'name'],
    [/call times/, 'visibility', 'call_windows'], [/the map shows/, 'place', 'city'],
    [/what you want to build|tell us what you want/, 'build', 'wants_to_build'], [/lanes/, 'build', 'wants_to_build'],
    [/disciplines|want to learn|experience/, 'skills', 'can'],
    [/your story/, 'story', 'story'],
    [/city/, 'place', 'city'], [/country/, 'place', 'country'], [/travel/, 'place', 'travel'], [/tools|build has/, 'place', 'tools'],
    [/time zone/, 'time', 'tz'], [/never ask/, 'time', 'never'], [/hours|when is/, 'time', 'hours'], [/what you want/, 'time', 'never'],
    [/discord/, 'links', 'discord'], [/how you heard/, 'links', 'heard_from'], [/link/, 'links', 'work'],
  ];
  for (const [re, step, field] of map) if (re.test(m)) return { step, field };
  return null;
}

// From a saved profile -------------------------------------------------------------
const splitList = (v: string | null | undefined, known: string[]) => (v ?? '').split(/,\s*/).map((x) => x.trim()).filter((x) => x && known.includes(x));
const handleFrom = (url: string, host: RegExp) => { const m = url.match(host); return m ? m[1] : url; };
/** A draft that edits what someone saved. */
export function draftFrom(me: Person, base = blankDraft()): JoinDraft {
  const pr = me.profile;
  const links = pr?.links ?? [];
  const take = (label: string) => links.find((l) => l.label === label)?.url ?? '';
  const work = links.filter((l) => !['X', 'LinkedIn', 'GitHub'].includes(l.label ?? '')).map((l) => l.url);
  return {
    ...base,
    edit: !!pr?.finished_at,
    wants_to_build: pr?.wants_to_build ?? '', lanes: pr?.lanes ?? [], can: pr?.can ?? [], learn: pr?.learn ?? [],
    experience: pr?.experience ?? '', story: pr?.story ?? '',
    city: me.city ?? '', country: me.country ?? '',
    mapAt: me.map === 'country' ? 'country' : 'city', mapOn: me.map ? me.map !== 'off' : base.mapOn,
    tools: pr?.tools ?? [], build: pr?.build ?? [], buildNotNow: !!pr?.finished_at && !(pr?.build ?? []).length, travel: pr?.travel ?? '',
    hours: pr?.hours ?? '', when: splitList(pr?.availability, WHEN), tz: me.tz ?? base.tz, wants: pr?.wants ?? [], never: pr?.never ?? '',
    discord: me.discord ?? '', x: handleFrom(take('X'), /^https:\/\/(?:x|twitter)\.com\/([A-Za-z0-9_]+)\/?$/), linkedin: take('LinkedIn'),
    github: handleFrom(take('GitHub'), /^https:\/\/github\.com\/([A-Za-z0-9-]+)\/?$/), work: work.length ? work : [''],
    heard_from: pr?.heard_from ?? '',
    // 'You' is the demo's stand-in until they give a name.
    name: me.name === 'You' ? '' : me.name, blurb: pr?.blurb ?? '',
    map_disciplines: pr?.map_disciplines ?? [], mapPicked: !!pr?.map_disciplines?.length,
    call_ok: !!pr?.call_ok, call_windows: splitList(pr?.call_windows, CALL_WINDOWS),
  };
}

/** How someone heard of Arrow, read from the ref of the link they came by. */
export function heardFromRef(ref: string | null | undefined): string {
  const r = (ref ?? '').toLowerCase();
  if (!r) return '';
  if (/^(x|tw|twitter)[-_.]/.test(r) || r === 'x') return 'X';
  if (/^(yt|youtube)/.test(r)) return 'YouTube';
  if (/^(dm|discord)/.test(r)) return 'Discord';
  if (/^(gh|github|readme)/.test(r)) return 'GitHub';
  if (/^(event|build-?day|meetup)/.test(r)) return 'An event';
  if (/^(invite|friend)/.test(r)) return 'A friend';
  if (/^(search|google)/.test(r)) return 'Search';
  return '';
}
