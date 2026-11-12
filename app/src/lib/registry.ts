// The contributor registry: everyone Arrow knows, with an account or not, what
// they said about themselves, and (core and leads only) what the team knows.
// Live: the shared Supabase, only through the sa_registry functions
// (supabase/migrations/20261112000000_sa_registry.sql), which decide who sees
// what. Demo: the mockups' sample people, kept in this browser, with the same
// rules applied for whichever role registryDemo.role says.
import { reactive } from 'vue';
import { remote, sb } from './backend';
import { SAMPLE_NOTES, SAMPLE_PEOPLE, SAMPLE_SKILLS, SAMPLE_TEAM } from '../data/registry-sample';

// Vocabularies --------------------------------------------------------------
export type Role = 'member' | 'core' | 'lead';
export type MapPrecision = 'city' | 'country' | 'off';
export type Lane = 'engineer' | 'hardware' | 'fly' | 'code' | 'story' | 'dao' | 'follow';
export type Tool = 'fdm' | 'resin' | 'cnc' | 'mill' | 'lathe' | 'laser' | 'solder' | 'spot' | 'scope' | 'composite' | 'weld' | 'field' | 'aircraft';
export type BuildOption = 'own' | 'parts' | 'day' | 'host' | 'fly';
export type Want = 'learning' | 'paid' | 'mission' | 'job' | 'business' | 'own';
export type NoteKind = 'note' | 'call' | 'review' | 'skill';
export type Verdict = 'seen_work' | 'talked' | 'tested';
export type OutreachKind = 'intro' | 'say_hi';
export type OutreachStatus = 'new' | 'invited' | 'booked' | 'talked' | 'active' | 'quiet' | 'skipped';

/** Taxonomy v1.0, as on the website: [group, what it is, colour, disciplines]. */
export const TAXONOMY: [string, string, string, string[]][] = [
  ['Engineering', 'Design and build the aircraft', '#89a5e3', ['Mechanical', 'CAD', 'Electrical', 'Aerodynamics', 'Power', 'Propulsion', 'Certification', 'Safety']],
  ['Flight Systems', 'The brains in the air', '#7ab3bd', ['Firmware', 'Software', 'Controls', 'Autonomy', 'Telemetry', 'Simulation']],
  ['Flight Ops', 'Fly, test and keep them flying', '#e89982', ['Piloting', 'Flight Test', 'Maintenance', 'Support', 'Regulatory', 'Missions']],
  ['Manufacturing', 'Make and ship real parts', '#d4b882', ['3D Printing', 'Machining', 'Composites', 'Assembly', 'Sourcing', 'Quality']],
  ['Design', 'How Arrow looks and feels', '#ce95b2', ['Industrial', 'Interface', 'Graphics']],
  ['Content', 'Teach and tell the story', '#af9ddd', ['Documentation', 'Media', 'Social Media']],
  ['Growth', 'Bring the world in', '#86bda6', ['Marketing', 'Community', 'Business Development']],
  ['Local', 'Run Arrow where you live', '#b2bc8f', ['Hosting', 'Workshops', 'Vertiports']],
  ['Operations', 'Run the DAO machinery', '#9fa4ac', ['Governance', 'Tokenomics', 'Coordination', 'Legal', 'Tooling']],
];
export const DISCIPLINES: string[] = TAXONOMY.flatMap((t) => t[3]);
export const TOOLS: Record<Tool, string> = {
  fdm: 'FDM printer', resin: 'Resin printer', cnc: 'CNC router', mill: 'Mill', lathe: 'Lathe', laser: 'Laser cutter', solder: 'Soldering station',
  spot: 'Spot welder', scope: 'Scope and bench supply', composite: 'Composite layup', weld: 'Welder', field: 'A field to fly', aircraft: 'Own drone, 25 kg class',
};
export const LANES: Record<Lane, string> = {
  engineer: 'Design and engineer', hardware: 'Build hardware near me', fly: 'Fly and test', code: 'Write software',
  story: 'Tell the story', dao: 'Govern and fund', follow: 'Just following along',
};
export const BUILD_OPTIONS: Record<BuildOption, string> = {
  own: 'Build my own Quiver or pack', parts: 'Make parts for the project', day: 'Help at a build day', host: 'Host a build day', fly: 'Fly and test',
};
export const WANTS: Record<Want, string> = {
  learning: 'Learning', paid: 'Paid work', mission: 'The mission', job: 'A job', business: 'Starting a business', own: 'Build my own',
};
export const BLURB_MAX = 140;
/** The database's rule for blurbs: plain words, no links. */
export const blurbHasLink = (t: string) =>
  /(https?:\/\/|www\.|discord\.gg|\b[a-z0-9-]+\.(com|net|org|io|co|gg|me|ly|xyz|app|dev|ai|link|to|so|sh)(\/|\b))/i.test(t);

// Shapes -------------------------------------------------------------------
export interface Link { label?: string; url: string }

/** The map's public card. City, lat and lng only at city precision. */
export interface Card {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  tz: string | null;
  disciplines: string[];
  blurb: string | null;
  discord: string | null;
  github: string | null;
  /** YYYY-MM */
  joined: string;
}

export interface Profile {
  wants_to_build: string | null;
  lanes: Lane[];
  can: string[];
  learn: string[];
  experience: string | null;
  story: string | null;
  tools: Tool[];
  build: BuildOption[];
  travel: string | null;
  hours: string | null;
  availability: string | null;
  wants: Want[];
  never: string | null;
  links: Link[];
  blurb: string | null;
  map_disciplines: string[];
  agent_drafted: boolean;
  updated_at: string;
  finished_at: string | null;
  /** Only to the person and the team. */
  call_ok?: boolean;
  call_windows?: string | null;
  heard_from?: string | null;
}

export interface Outreach {
  kind: OutreachKind;
  owner_id: string | null;
  status: OutreachStatus;
  next_step: string | null;
  good_for: string[];
  intro_queue: boolean;
  updated_at: string;
  history?: { at: string; by: string; status?: string; owner?: string; next_step?: string; intro_queue?: boolean; note?: string }[];
}

/** A person as members see them; the optional parts are for themselves (map, ref)
 * and for core and leads (the rest). */
export interface Person extends Card {
  has_account: boolean;
  profile: Profile | null;
  map?: MapPrecision;
  ref?: string | null;
  claimed_at?: string | null;
  email?: string | null;
  source?: string;
  added_by?: string | null;
  user_id?: string | null;
  created_at?: string;
  outreach?: Outreach[];
  guess?: { disciplines: string[]; tools: Tool[]; updated_at: string } | null;
  note_count?: number;
  open_matches?: number;
}

export interface Note {
  id: string;
  kind: NoteKind;
  body: string;
  author_id: string | null;
  created_at: string;
  edited_at: string | null;
  edits: { body: string; written_at: string; replaced_at: string; replaced_by: string | null }[];
}
export interface SkillCheck { id: string; discipline: string; verdict: Verdict; note_id: string | null; checked_by: string | null; checked_at: string }
export interface Match {
  id: string;
  person_id?: string;
  person_name?: string;
  user_id: string;
  account_person_id: string | null;
  account_name: string | null;
  reason: string;
  created_at: string;
}
/** One person; notes, skill checks and matches come only to core and leads. */
export interface PersonDetail extends Person {
  notes?: Note[];
  skill_checks?: SkillCheck[];
  matches?: Match[];
}

export interface ClaimResult { person_id: string | null; linked: boolean; how: 'github' | 'discord' | 'email' | null; possible: number }

/** What sa_save_profile takes: only the fields being saved. */
export type ProfileFields = Partial<{
  ref: string; display_name: string; discord: string; city: string | null; country: string | null; lat: number | null; lng: number | null;
  tz: string | null; map: MapPrecision; wants_to_build: string; lanes: Lane[]; can: string[]; learn: string[]; experience: string;
  story: string; tools: Tool[]; build: BuildOption[]; travel: string; hours: string; availability: string; wants: Want[]; never: string;
  links: Link[]; heard_from: string; blurb: string; map_disciplines: string[]; call_ok: boolean; call_windows: string; agent_drafted: boolean;
}>;

export interface NewPerson {
  name: string;
  /** Where we know them from. Required. */
  source: string;
  githubLogin?: string;
  /** GitHub's numeric id, resolved by the app; null when it couldn't be. */
  githubId?: number | null;
  discordUsername?: string;
  /** Discord's numeric id (a snowflake, as a string), resolved by the bot. */
  discordId?: string | null;
  email?: string;
  city?: string; country?: string; lat?: number; lng?: number; tz?: string;
  guessDisciplines?: string[];
  guessTools?: Tool[];
  owner?: string;
  note?: string;
  introQueue?: boolean;
  goodFor?: string[];
}
export type PersonFields = Partial<{
  display_name: string; source: string; github_login: string | null; github_id: number | null; discord_username: string | null; discord_id: string | null;
  email: string | null; city: string | null; country: string | null; lat: number | null; lng: number | null; tz: string | null;
  guess_disciplines: string[]; guess_tools: Tool[];
}>;
export interface Candidate { id: string; name: string; github: string | null; discord: string | null; email: string | null; has_account: boolean; source: string; why: ('name' | 'discord' | 'github' | 'email')[] }
export interface OutreachChange {
  kind?: OutreachKind; status?: OutreachStatus; owner?: string; unassign?: boolean;
  /** '' clears it. */
  nextStep?: string; goodFor?: string[]; introQueue?: boolean; note?: string;
}

// State ----------------------------------------------------------------------
export const registry = reactive({
  /** What the last sign-in's claim found. */
  claim: null as ClaimResult | null,
});

// Live ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb!.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

const JOIN_REF = 'superapp:join-ref';
/** Keeps the ref of a /join?ref=… link until their profile is made. */
export function rememberJoinRef(ref: string | null | undefined) {
  const r = (ref ?? '').toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(r)) return;
  try { localStorage.setItem(JOIN_REF, r); } catch { /* storage unavailable */ }
}
const joinRef = () => { try { return localStorage.getItem(JOIN_REF) ?? undefined; } catch { return undefined; } };
const forgetJoinRef = () => { try { localStorage.removeItem(JOIN_REF); } catch { /* storage unavailable */ } };

/** Links the signed-in account to its registry record, if the team added one
 * (by GitHub or Discord id, or a proven email). The app calls it right after
 * sa_join. Never throws: until the registry exists in the database, sign-in
 * carries on as before. */
export async function claimRegistry(): Promise<ClaimResult | null> {
  if (!remote) return null;
  try {
    const r = await rpc<ClaimResult>('sa_registry_claim', { p_ref: joinRef() ?? null });
    registry.claim = r;
    if (r?.person_id) forgetJoinRef();
    return r;
  } catch (e) {
    console.warn('registry claim:', (e as Error).message);
    return null;
  }
}

/** The map: people who chose it, at the precision they chose. Anyone. */
export async function loadCards(): Promise<Card[]> {
  if (!remote) return demoCards();
  return (await rpc<Card[]>('sa_registry_cards')) ?? [];
}
/** Members: people with accounts. Core and leads: everyone, with what the team knows. */
export async function loadPeople(): Promise<Person[]> {
  if (!remote) return demoPeople();
  return (await rpc<Person[]>('sa_registry_people')) ?? [];
}
export async function loadPerson(id: string): Promise<PersonDetail> {
  if (!remote) return demoPerson(id);
  return rpc<PersonDetail>('sa_registry_person', { p_person: id });
}
/** The signed-in person's own record, or null before their first save. */
export async function myProfile(): Promise<Person | null> {
  if (!remote) return demoMine();
  return rpc<Person | null>('sa_my_profile');
}
/** Saves the fields given (a wizard step); finish marks the profile done,
 * which needs wants_to_build. */
export async function saveProfile(fields: ProfileFields, finish = false): Promise<Person> {
  if (!remote) return demoSave(fields, finish);
  const ref = joinRef();
  const r = await rpc<Person>('sa_save_profile', { p_profile: ref && !fields.ref ? { ...fields, ref } : fields, p_finish: finish });
  forgetJoinRef();
  return r;
}

// Core and leads.
export async function findPeople(q: { name?: string; discord?: string; github?: string; email?: string; githubId?: number; discordId?: string }): Promise<Candidate[]> {
  if (!remote) return demoFind(q);
  return (await rpc<Candidate[]>('sa_find_people', {
    p_name: q.name || null, p_discord: q.discord || null, p_github: q.github || null, p_email: q.email || null,
    p_github_id: q.githubId ?? null, p_discord_id: q.discordId ?? null,
  })) ?? [];
}
export async function addPerson(p: NewPerson): Promise<string> {
  if (!remote) return demoAdd(p);
  return rpc<string>('sa_add_person', {
    p_name: p.name, p_source: p.source, p_github_login: p.githubLogin || null, p_github_id: p.githubId ?? null,
    p_discord_username: p.discordUsername || null, p_discord_id: p.discordId ?? null, p_email: p.email || null,
    p_city: p.city || null, p_country: p.country || null, p_lat: p.lat ?? null, p_lng: p.lng ?? null, p_tz: p.tz || null,
    p_guess_disciplines: p.guessDisciplines ?? null, p_guess_tools: p.guessTools ?? null, p_owner: p.owner || null,
    p_note: p.note || null, p_intro_queue: !!p.introQueue, p_good_for: p.goodFor ?? null,
  });
}
export async function updatePerson(id: string, fields: PersonFields): Promise<void> {
  if (!remote) return demoUpdate(id, fields);
  await rpc('sa_update_person', { p_person: id, p_fields: fields });
}
export async function addNote(person: string, kind: NoteKind, body: string, skill?: { discipline: string; verdict: Verdict }): Promise<string> {
  if (!remote) return demoAddNote(person, kind, body, skill);
  return rpc<string>('sa_add_note', { p_person: person, p_kind: kind, p_body: body, p_discipline: skill?.discipline ?? null, p_verdict: skill?.verdict ?? null });
}
export async function editNote(note: string, body: string): Promise<void> {
  if (!remote) return demoEditNote(note, body);
  await rpc('sa_edit_note', { p_note: note, p_body: body });
}
export async function setOutreach(person: string, c: OutreachChange): Promise<void> {
  if (!remote) return demoOutreach(person, c);
  await rpc('sa_set_outreach', {
    p_person: person, p_kind: c.kind ?? 'intro', p_status: c.status ?? null, p_owner: c.owner ?? null, p_next_step: c.nextStep ?? null,
    p_good_for: c.goodFor ?? null, p_intro_queue: c.introQueue ?? null, p_note: c.note ?? null, p_unassign: !!c.unassign,
  });
}
/** "Same person?" cards waiting for a lead. */
export async function loadMatches(): Promise<Match[]> {
  if (!remote) return demoMatches();
  return (await rpc<Match[]>('sa_registry_matches')) ?? [];
}
/** Leads: same folds the account into the team's record; returns the person the account ends up with. */
export async function linkPerson(match: string, same: boolean): Promise<string | null> {
  if (!remote) return demoLink(match, same);
  return rpc<string | null>('sa_link_person', { p_match: match, p_same: same });
}

// Demo -----------------------------------------------------------------------
// The database's tables, in this browser, seeded from the mockups. The
// visitor is "me"; registryDemo.role is who they are in the workspace.
interface Row {
  id: string; user_id: string | null; display_name: string; github_login: string | null; discord_username: string | null; email: string | null;
  city: string | null; country: string | null; lat: number | null; lng: number | null; tz: string | null; map: MapPrecision;
  source: string; ref: string | null; added_by: string | null; created_at: string; claimed_at: string | null;
}
interface DemoState {
  people: Row[];
  profiles: Record<string, Profile & { call_ok: boolean; call_windows: string | null; heard_from: string | null }>;
  notes: (Note & { person_id: string })[];
  outreach: (Outreach & { person_id: string })[];
  guesses: Record<string, { disciplines: string[]; tools: Tool[]; updated_at: string }>;
  skills: (SkillCheck & { person_id: string })[];
  matches: (Match & { person_id: string; settled: boolean })[];
}

const SIGNED_OUT = 'superapp:registry.signed-out';
/** role follows the demo menu's View as (modules/registry/community.ts keeps
 * it in step); signedOut is its "Signed out", kept for this tab only. */
export const registryDemo = reactive({
  role: 'lead' as Role,
  signedOut: (() => { try { return sessionStorage.getItem(SIGNED_OUT) === '1'; } catch { return false; } })(),
});
/** The demo menu's "Signed out": the registry answers as it would a visitor. */
export function setDemoSignedOut(on: boolean) {
  registryDemo.signedOut = on;
  try { if (on) sessionStorage.setItem(SIGNED_OUT, '1'); else sessionStorage.removeItem(SIGNED_OUT); } catch { /* storage unavailable */ }
}
export const DEMO_ME = 'me';
const DEMO_KEY = 'superapp:registry.v1';
const iso = (d: string) => new Date(`${d}T15:00:00Z`).toISOString();
const newId = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const isTeam = () => registryDemo.role === 'core' || registryDemo.role === 'lead';
const demoFail = (msg: string): never => { throw new Error(msg); };

function seed(): DemoState {
  const s: DemoState = { people: [], profiles: {}, notes: [], outreach: [], guesses: {}, skills: [], matches: [] };
  for (const p of SAMPLE_PEOPLE) {
    const created = iso(p.joined ?? p.added!.on);
    s.people.push({
      id: p.id, user_id: p.joined ? `u-${p.id}` : null, display_name: p.name, github_login: p.github, discord_username: p.discord, email: p.email ?? null,
      city: p.city, country: p.country, lat: p.lat, lng: p.lng, tz: p.tz, map: p.map, source: p.source, ref: p.ref,
      added_by: p.added?.by ?? null, created_at: created, claimed_at: p.joined ? created : null,
    });
    if (p.joined) {
      s.profiles[p.id] = {
        wants_to_build: p.wantsToBuild ?? null, lanes: p.lanes ?? [], can: p.can, learn: p.learn, experience: null, story: p.story ?? null,
        tools: p.tools, build: p.build, travel: p.travel ?? null, hours: p.hours ?? null, availability: p.when ?? null, wants: p.wants,
        never: null, links: [], blurb: p.blurb ?? null, map_disciplines: p.can.slice(0, 3), agent_drafted: false,
        updated_at: created, finished_at: created, call_ok: p.callOk, call_windows: null, heard_from: p.source,
      };
    }
    s.outreach.push({
      person_id: p.id, kind: 'intro', owner_id: p.owner ?? null, status: p.status, next_step: p.next ?? null, good_for: p.goodFor ?? [],
      intro_queue: !!p.introQueue, updated_at: created,
      history: p.added ? [{ at: created, by: p.added.by, note: `Added: ${p.added.how}` }] : [],
    });
    if (p.guess) s.guesses[p.id] = { disciplines: p.guess, tools: p.tools, updated_at: created };
  }
  for (const [pid, notes] of Object.entries(SAMPLE_NOTES)) {
    for (const [kind, by, on, body] of notes) s.notes.push({ id: newId(), person_id: pid, kind, body, author_id: by, created_at: iso(on), edited_at: null, edits: [] });
  }
  for (const [pid, checks] of Object.entries(SAMPLE_SKILLS)) {
    for (const [discipline, verdict, by, on] of checks) s.skills.push({ id: newId(), person_id: pid, discipline, verdict, note_id: null, checked_by: by, checked_at: iso(on) });
  }
  // A "same person?" card for a lead: someone signed up with GitHub under
  // Rosa's name, with an email that isn't the one on the record Thomas added.
  const on = iso('2026-11-11');
  s.people.push({ id: 'rosa-gh', user_id: 'u-rosa-gh', display_name: 'Rosa Delgado', github_login: 'rdelgado-waco', discord_username: null, email: null,
    city: null, country: null, lat: null, lng: null, tz: null, map: 'off', source: 'Signed up', ref: null, added_by: null, created_at: on, claimed_at: on });
  s.matches.push({ id: 'm-rosa', person_id: 'rosa', user_id: 'u-rosa-gh', account_person_id: 'rosa-gh', account_name: 'Rosa Delgado', reason: 'same name', created_at: on, settled: false });
  return s;
}
let demo: DemoState | null = null;
function db(): DemoState {
  if (demo) return demo;
  try { demo = JSON.parse(localStorage.getItem(DEMO_KEY) ?? 'null') as DemoState | null; } catch { demo = null; }
  return (demo ??= seed());
}
const persist = () => { try { localStorage.setItem(DEMO_KEY, JSON.stringify(demo)); } catch { /* storage unavailable */ } };
/** Puts the sample people back. */
export function resetRegistryDemo() { demo = seed(); persist(); }
/** The demo's core team, for owner pickers and note authors. */
export const demoTeam = SAMPLE_TEAM;
/** Who the demo visitor is on the team: Thomas as a lead, Julius as core. */
export const demoTeamMe = () => (registryDemo.role === 'lead' ? 'u-thomas' : 'u-julius');

const round2 = (n: number | null) => (n == null ? null : Math.round(n * 100) / 100);
function card(r: Row): Card {
  const pr = db().profiles[r.id];
  const shown = r.map === 'city' || r.map === 'country';
  return {
    id: r.id, name: r.display_name, city: r.map === 'city' ? r.city : null, country: shown ? r.country : null,
    lat: r.map === 'city' ? round2(r.lat) : null, lng: r.map === 'city' ? round2(r.lng) : null, tz: shown ? r.tz : null,
    disciplines: pr?.map_disciplines ?? [], blurb: pr?.blurb ?? null, discord: r.discord_username, github: r.github_login,
    joined: (r.claimed_at ?? r.created_at).slice(0, 7),
  };
}
function memberView(r: Row): Person {
  const pr = db().profiles[r.id];
  let profile: Profile | null = null;
  if (pr) { const { call_ok: _c, call_windows: _w, heard_from: _h, ...rest } = pr; profile = rest; }
  return { ...card(r), city: r.city, country: r.country, tz: r.tz, has_account: r.user_id != null, profile };
}
function selfView(r: Row): Person {
  const pr = db().profiles[r.id];
  return { ...memberView(r), lat: r.lat, lng: r.lng, map: r.map, ref: r.ref, claimed_at: r.claimed_at, profile: pr ? { ...pr } : null };
}
function teamView(r: Row): Person {
  const s = db();
  return {
    ...selfView(r), email: r.email, source: r.source, added_by: r.added_by, user_id: r.user_id, created_at: r.created_at,
    outreach: s.outreach.filter((o) => o.person_id === r.id).map(({ person_id: _p, history: _h, ...o }) => o),
    guess: s.guesses[r.id] ?? null,
    note_count: s.notes.filter((n) => n.person_id === r.id).length,
    open_matches: s.matches.filter((m) => m.person_id === r.id && !m.settled).length,
  };
}
const viewFor = (r: Row) => (isTeam() ? teamView(r) : r.user_id === DEMO_ME ? selfView(r) : memberView(r));
const requireTeam = () => { requireMember(); if (!isTeam()) demoFail('Only core or a lead can do that'); };
const requireMember = () => { if (registryDemo.signedOut) demoFail('Members only'); };
const row = (id: string) => db().people.find((p) => p.id === id) ?? demoFail('No such person');

function demoCards(): Card[] {
  return db().people.filter((r) => r.user_id && r.map !== 'off' && db().profiles[r.id]?.finished_at).map(card);
}
function demoPeople(): Person[] {
  requireMember();
  return db().people.filter((r) => isTeam() || r.user_id).map(viewFor);
}
function demoPerson(id: string): PersonDetail {
  requireMember();
  const r = row(id);
  if (!isTeam()) { if (!r.user_id) demoFail('No such person'); return viewFor(r); }
  const s = db();
  return {
    ...teamView(r),
    notes: s.notes.filter((n) => n.person_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(({ person_id: _p, ...n }) => n),
    outreach: s.outreach.filter((o) => o.person_id === id).map(({ person_id: _p, ...o }) => o),
    skill_checks: s.skills.filter((k) => k.person_id === id).map(({ person_id: _p, ...k }) => k),
    matches: s.matches.filter((m) => m.person_id === id && !m.settled).map(({ person_id: _p, settled: _s, ...m }) => m),
  };
}
function demoMine(): Person | null {
  const r = db().people.find((p) => p.user_id === DEMO_ME);
  return r ? selfView(r) : null;
}
function demoSave(f: ProfileFields, finish: boolean): Person {
  const s = db();
  if (f.blurb && f.blurb.trim().length > BLURB_MAX) demoFail(`The blurb is too long (${BLURB_MAX} characters at most)`);
  if (f.blurb && blurbHasLink(f.blurb)) demoFail('Keep links out of the blurb; add them under Links');
  if (f.map_disciplines && f.map_disciplines.length > 3) demoFail('Map disciplines takes 3 at most');
  for (const d of [...(f.can ?? []), ...(f.learn ?? []), ...(f.map_disciplines ?? [])]) if (!DISCIPLINES.includes(d)) demoFail(`Disciplines has an unknown value: ${d}`);
  const now = new Date().toISOString();
  let r = s.people.find((p) => p.user_id === DEMO_ME);
  if (!r) {
    r = { id: DEMO_ME, user_id: DEMO_ME, display_name: 'You', github_login: null, discord_username: null, email: null, city: null, country: null, lat: null, lng: null,
      tz: null, map: 'off', source: 'Signed up', ref: f.ref ?? joinRef() ?? null, added_by: null, created_at: now, claimed_at: now };
    s.people.push(r);
  }
  const { ref: _ref, display_name, discord, city, country, lat, lng, tz, map, ...rest } = f;
  if (display_name !== undefined) r.display_name = display_name.trim() || demoFail('Your name can\'t be empty');
  if (discord !== undefined) r.discord_username = discord.replace(/^@/, '').trim() || null;
  if (city !== undefined) r.city = city;
  if (country !== undefined) r.country = country;
  if (lat !== undefined) r.lat = lat;
  if (lng !== undefined) r.lng = lng;
  if (tz !== undefined) r.tz = tz;
  if (map !== undefined) r.map = map;
  const pr = s.profiles[r.id] ??= {
    wants_to_build: null, lanes: [], can: [], learn: [], experience: null, story: null, tools: [], build: [], travel: null, hours: null, availability: null,
    wants: [], never: null, links: [], blurb: null, map_disciplines: [], agent_drafted: false, updated_at: now, finished_at: null, call_ok: false, call_windows: null, heard_from: null,
  };
  Object.assign(pr, rest, { updated_at: now });
  if (finish) {
    if (!pr.wants_to_build?.trim()) demoFail('Tell us what you want to build first');
    pr.finished_at ??= now;
  }
  forgetJoinRef();
  persist();
  return selfView(r);
}
function demoFind(q: { name?: string; discord?: string; github?: string; email?: string }): Candidate[] {
  requireTeam();
  const nm = q.name?.trim().toLowerCase(), dc = q.discord?.trim().replace(/^@/, '').toLowerCase(), gh = q.github?.trim().replace(/^@/, '').toLowerCase(), em = q.email?.trim().toLowerCase();
  return db().people.flatMap((r) => {
    const n = r.display_name.toLowerCase();
    const why = [
      nm && (n === nm || (nm.length >= 4 && (n.includes(nm) || nm.includes(n)))) ? 'name' : null,
      dc && r.discord_username?.toLowerCase() === dc ? 'discord' : null,
      gh && r.github_login?.toLowerCase() === gh ? 'github' : null,
      em && r.email?.toLowerCase() === em ? 'email' : null,
    ].filter(Boolean) as Candidate['why'];
    return why.length ? [{ id: r.id, name: r.display_name, github: r.github_login, discord: r.discord_username, email: r.email, has_account: !!r.user_id, source: r.source, why }] : [];
  });
}
function demoAdd(p: NewPerson): string {
  requireTeam();
  if (!p.name?.trim()) demoFail('A name is required');
  if (!p.source?.trim()) demoFail('Say where you know them from');
  const s = db();
  const email = p.email?.trim().toLowerCase() || null;
  const dup = email && s.people.find((r) => r.email?.toLowerCase() === email);
  if (dup) demoFail(`Already in the registry: ${dup.display_name}`);
  const now = new Date().toISOString(), id = newId(), by = demoTeamMe();
  s.people.push({ id, user_id: null, display_name: p.name.trim(), github_login: p.githubLogin?.replace(/^@/, '') || null, discord_username: p.discordUsername?.replace(/^@/, '') || null,
    email, city: p.city ?? null, country: p.country ?? null, lat: p.lat ?? null, lng: p.lng ?? null, tz: p.tz ?? null, map: 'off', source: p.source.trim(), ref: null,
    added_by: by, created_at: now, claimed_at: null });
  s.outreach.push({ person_id: id, kind: 'intro', owner_id: p.owner ?? null, status: 'new', next_step: null, good_for: p.goodFor ?? [], intro_queue: !!p.introQueue,
    updated_at: now, history: [{ at: now, by, note: `Added: ${p.source.trim()}` }] });
  if (p.guessDisciplines?.length || p.guessTools?.length) s.guesses[id] = { disciplines: p.guessDisciplines ?? [], tools: p.guessTools ?? [], updated_at: now };
  if (p.note?.trim()) s.notes.push({ id: newId(), person_id: id, kind: 'note', body: p.note.trim(), author_id: by, created_at: now, edited_at: null, edits: [] });
  persist();
  return id;
}
function demoUpdate(id: string, f: PersonFields): void {
  requireTeam();
  const r = row(id);
  const own = ['source', 'email', 'guess_disciplines', 'guess_tools'];
  if (r.user_id) { const k = Object.keys(f).find((x) => !own.includes(x)); if (k) demoFail(`They have an account now, so ${k} is theirs to change`); }
  const { guess_disciplines, guess_tools, github_id: _g, discord_id: _d, ...rest } = f;
  Object.assign(r, rest);
  if (guess_disciplines || guess_tools) {
    const g = db().guesses[id] ??= { disciplines: [], tools: [], updated_at: '' };
    if (guess_disciplines) g.disciplines = guess_disciplines;
    if (guess_tools) g.tools = guess_tools;
    g.updated_at = new Date().toISOString();
  }
  persist();
}
function demoAddNote(person: string, kind: NoteKind, body: string, skill?: { discipline: string; verdict: Verdict }): string {
  requireTeam();
  row(person);
  if (!body.trim()) demoFail('Write the note first');
  if (kind === 'skill' && !skill) demoFail('A skill check names a discipline and what you saw (seen_work, talked or tested)');
  const now = new Date().toISOString(), id = newId(), by = demoTeamMe();
  db().notes.push({ id, person_id: person, kind, body: body.trim(), author_id: by, created_at: now, edited_at: null, edits: [] });
  if (kind === 'skill' && skill) db().skills.push({ id: newId(), person_id: person, ...skill, note_id: id, checked_by: by, checked_at: now });
  persist();
  return id;
}
function demoEditNote(note: string, body: string): void {
  requireTeam();
  const n = db().notes.find((x) => x.id === note) ?? demoFail('No such note');
  if (n.author_id !== demoTeamMe() && registryDemo.role !== 'lead') demoFail('Only its author or a lead can edit a note');
  if (body.trim() === n.body) return;
  const now = new Date().toISOString();
  n.edits.push({ body: n.body, written_at: n.edited_at ?? n.created_at, replaced_at: now, replaced_by: demoTeamMe() });
  n.body = body.trim();
  n.edited_at = now;
  persist();
}
function demoOutreach(person: string, c: OutreachChange): void {
  requireTeam();
  row(person);
  const s = db(), kind = c.kind ?? 'intro', now = new Date().toISOString();
  let o = s.outreach.find((x) => x.person_id === person && x.kind === kind);
  if (!o) { o = { person_id: person, kind, owner_id: null, status: 'new', next_step: null, good_for: [], intro_queue: false, updated_at: now, history: [] }; s.outreach.push(o); }
  if (c.status) o.status = c.status;
  if (c.unassign) o.owner_id = null; else if (c.owner) o.owner_id = c.owner;
  if (c.nextStep !== undefined) o.next_step = c.nextStep.trim() || null;
  if (c.goodFor) o.good_for = c.goodFor;
  if (c.introQueue !== undefined) o.intro_queue = c.introQueue;
  o.updated_at = now;
  (o.history ??= []).push({ at: now, by: demoTeamMe(), status: c.status, owner: c.unassign ? 'none' : c.owner, next_step: c.nextStep, intro_queue: c.introQueue, note: c.note });
  persist();
}
function demoMatches(): Match[] {
  requireTeam();
  const s = db();
  return s.matches.filter((m) => !m.settled).map(({ settled: _s, ...m }) => ({ ...m, person_name: s.people.find((p) => p.id === m.person_id)?.display_name }));
}
function demoLink(match: string, same: boolean): string | null {
  requireMember();
  if (registryDemo.role !== 'lead') demoFail('Only a lead can do that');
  const s = db();
  const m = s.matches.find((x) => x.id === match) ?? demoFail('No such match');
  if (m.settled) demoFail('That was settled already');
  if (!same) { m.settled = true; persist(); return m.account_person_id; }
  const rec = row(m.person_id);
  if (rec.user_id) demoFail('That record is already linked to an account');
  // As sa_link_person: the account's own row folds into the team's record.
  // What they said wins; the handles and place the team had stay as fallbacks.
  const mine = s.people.find((p) => p.user_id === m.user_id);
  if (mine?.added_by) demoFail('That account is already linked to a record the team added');
  const said = !!(mine && s.profiles[mine.id]);
  if (mine) {
    if (said) { s.profiles[rec.id] = s.profiles[mine.id]!; delete s.profiles[mine.id]; }
    for (const n of s.notes) if (n.person_id === mine.id) n.person_id = rec.id;
    for (const k of s.skills) if (k.person_id === mine.id) k.person_id = rec.id;
    s.outreach = s.outreach.filter((o) => o.person_id !== mine.id || !s.outreach.some((x) => x.person_id === rec.id && x.kind === o.kind));
    for (const o of s.outreach) if (o.person_id === mine.id) o.person_id = rec.id;
    for (const x of s.matches) if (x.account_person_id === mine.id) x.account_person_id = rec.id;
    s.people = s.people.filter((p) => p.id !== mine.id);
    if (said) rec.display_name = mine.display_name;
    rec.github_login ??= mine.github_login;
    rec.discord_username ??= mine.discord_username;
    rec.city = mine.city ?? rec.city; rec.country = mine.country ?? rec.country; rec.tz = mine.tz ?? rec.tz;
    rec.lat = mine.lat ?? rec.lat; rec.lng = mine.lng ?? rec.lng; rec.map = mine.map; rec.ref = mine.ref ?? rec.ref;
  }
  rec.user_id = m.user_id;
  rec.claimed_at = new Date().toISOString();
  for (const x of s.matches) if (x.person_id === rec.id) x.settled = true;
  persist();
  return rec.id;
}
