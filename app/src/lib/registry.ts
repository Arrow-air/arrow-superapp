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
/** The database's rule for blurbs (sa_registry_has_url): plain words, no links,
 * spelled-out or spaced dots, full-width dots, or anything.tld/path. */
export const blurbHasLink = (t: string) => new RegExp([
  'https?:', 'www\\.', 'discord\\.gg', 't\\.me/',
  '[a-z0-9-]\\s*[。．｡]\\s*[a-z]{2,}',
  '[a-z0-9-]\\s*(\\(dot\\)|\\[dot\\]|\\s\\.\\s|\\sdot\\s)\\s*[a-z]{2,}',
  '[a-z0-9-]\\.[a-z]{2,}/\\S',
  '\\b[a-z0-9-]+\\.(com|net|org|io|co|gg|me|ly|xyz|app|dev|ai|link|to|so|sh|ru|cc|tk|info|biz|top|site|online|shop|club|live|eu|uk|de|in|us|ca|au|fr|nl|pw|cn|vip|fun|lol|art)(/|\\b)',
].join('|'), 'i').test(t);

// Shapes -------------------------------------------------------------------
export interface Link { label?: string; url: string }

/** The map's public card. City, lat and lng only at city precision; a GitHub
 * or Discord handle only when a sign-in (or the team's lookup) proved it. */
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
  /** What they never want to be asked: only to the person and the team. */
  never?: string | null;
  links: Link[];
  blurb: string | null;
  map_disciplines: string[];
  agent_drafted: boolean;
  updated_at: string;
  finished_at: string | null;
  /** The Discord handle they typed: "said, not checked", never on the card. */
  discord_said?: string | null;
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

/** A person as members see them (place at the precision they chose for the map);
 * the optional parts are for themselves (map, ref, their whole place) and for
 * core and leads (the rest). For the team, discord and github are what the
 * record holds, resolved or not: github_id and discord_id say which. */
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
  /** The ids the app resolved: GitHub's numeric id, Discord's snowflake as text. */
  github_id?: number | null;
  discord_id?: string | null;
  outreach?: Outreach[];
  /** The team's guesses; the place is what the team typed before the record linked. */
  guess?: Guess | null;
  note_count?: number;
  /** Notes of kind call. */
  call_notes?: number;
  open_matches?: number;
}

export interface Guess {
  disciplines: string[]; tools: Tool[]; updated_at: string;
  city?: string | null; country?: string | null; lat?: number | null; lng?: number | null; tz?: string | null;
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
  /** What the lead judges by: the account as its sign-in proved it... */
  account_email?: string | null;
  account_created_at?: string | null;
  account_github?: string | null;
  account_discord?: string | null;
  /** ...and what the record holds, and whether each handle was resolved to an id. */
  record_email?: string | null;
  record_github?: string | null;
  record_github_resolved?: boolean;
  record_discord?: string | null;
  record_discord_resolved?: boolean;
  reason: string;
  created_at: string;
}
/** One person; notes, skill checks and matches come only to core and leads. */
export interface PersonDetail extends Person {
  notes?: Note[];
  skill_checks?: SkillCheck[];
  matches?: Match[];
}

/** person_id is the account's record, or null (no record yet, or only a weak
 * match, which files a card for a lead and says nothing about it). */
export interface ClaimResult { person_id: string | null; linked: boolean; how: 'github' | 'discord' | 'email' | null }

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
/** Members: people who finished a profile, and themselves. Core and leads: everyone, with what the team knows. */
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
/** Leads: undoes a link. The account gets its own row back with the profile it
 * wrote; the team's record is unclaimed again and keeps its notes. */
export async function unlinkPerson(person: string): Promise<string> {
  if (!remote) return demoUnlink(person);
  return rpc<string>('sa_unlink_person', { p_person: person });
}
/** Leads: deletes a record with its notes, outreach, guesses and cards. */
export async function deletePerson(person: string): Promise<void> {
  if (!remote) return demoDeletePerson(person);
  await rpc('sa_delete_person', { p_person: person });
}
/** The signed-in person deletes their profile. The account stays. A row they
 * made themselves goes with everything on it; a record the team added goes
 * back to unclaimed and keeps the team's notes. */
export async function deleteMyProfile(): Promise<void> {
  if (!remote) return demoDeleteMine();
  await rpc('sa_delete_my_profile');
}

// Demo -----------------------------------------------------------------------
// The database's tables, in this browser, seeded from the mockups. The
// visitor is "me"; registryDemo.role is who they are in the workspace.
interface Row {
  id: string; user_id: string | null; display_name: string; github_login: string | null; github_id: number | null;
  discord_username: string | null; discord_id: string | null; email: string | null;
  city: string | null; country: string | null; lat: number | null; lng: number | null; tz: string | null; map: MapPrecision;
  source: string; ref: string | null; added_by: string | null; created_at: string; claimed_at: string | null;
}
interface DemoState {
  people: Row[];
  profiles: Record<string, Profile & { call_ok: boolean; call_windows: string | null; heard_from: string | null }>;
  notes: (Note & { person_id: string })[];
  outreach: (Outreach & { person_id: string })[];
  guesses: Record<string, Guess>;
  skills: (SkillCheck & { person_id: string })[];
  matches: (Match & { person_id: string; settled: boolean; outcome?: 'same' | 'different' | 'superseded' })[];
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
const DEMO_KEY = 'superapp:registry.v3';
const iso = (d: string) => new Date(`${d}T15:00:00Z`).toISOString();
const newId = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const isTeam = () => registryDemo.role === 'core' || registryDemo.role === 'lead';
const demoFail = (msg: string): never => { throw new Error(msg); };

function seed(): DemoState {
  const s: DemoState = { people: [], profiles: {}, notes: [], outreach: [], guesses: {}, skills: [], matches: [] };
  for (const p of SAMPLE_PEOPLE) {
    const created = iso(p.joined ?? p.added!.on);
    // Someone who joined typed their Discord handle (Discord sign-in isn't on
    // yet): it's what they said. The team's typed one stays on the record.
    s.people.push({
      id: p.id, user_id: p.joined ? `u-${p.id}` : null, display_name: p.name, github_login: p.github, github_id: p.github ? demoGitHubId(p.github) : null,
      discord_username: p.joined ? null : p.discord, discord_id: null, email: p.email ?? null,
      city: p.city, country: p.country, lat: p.lat, lng: p.lng, tz: p.tz, map: p.map, source: p.source, ref: p.ref,
      added_by: p.added?.by ?? null, created_at: created, claimed_at: p.joined ? created : null,
    });
    if (p.joined) {
      s.profiles[p.id] = {
        wants_to_build: p.wantsToBuild ?? null, lanes: p.lanes ?? [], can: p.can, learn: p.learn, experience: null, story: p.story ?? null,
        tools: p.tools, build: p.build, travel: p.travel ?? null, hours: p.hours ?? null, availability: p.when ?? null, wants: p.wants,
        never: null, links: [], blurb: p.blurb ?? null, map_disciplines: p.can.slice(0, 3), agent_drafted: false,
        updated_at: created, finished_at: created, discord_said: p.discord, call_ok: p.callOk, call_windows: null, heard_from: p.source,
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
  s.people.push({ id: 'rosa-gh', user_id: 'u-rosa-gh', display_name: 'Rosa Delgado', github_login: 'rdelgado-waco', github_id: demoGitHubId('rdelgado-waco'),
    discord_username: null, discord_id: null, email: null,
    city: null, country: null, lat: null, lng: null, tz: null, map: 'off', source: 'Signed up', ref: null, added_by: null, created_at: on, claimed_at: on });
  s.matches.push({ id: 'm-rosa', person_id: 'rosa', user_id: 'u-rosa-gh', account_person_id: 'rosa-gh', account_name: 'Rosa Delgado',
    account_email: 'rdelgado.waco@example.com', account_created_at: on, account_github: 'rdelgado-waco', reason: 'same name', created_at: on, settled: false });
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

/** The demo's stand-in for GitHub's numeric ids: the same login always gets the same id. */
export function demoGitHubId(login: string) {
  let h = 7;
  for (const c of login.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) % 90_000_000;
  return 10_000_000 + h;
}

const round2 = (n: number | null) => (n == null ? null : Math.round(n * 100) / 100);
// As the database's views: sa_reg_card, sa_reg_member_view, sa_reg_self_view, sa_reg_team_view.
function card(r: Row): Card {
  const pr = db().profiles[r.id];
  const shown = r.map === 'city' || r.map === 'country';
  return {
    id: r.id, name: r.display_name, city: r.map === 'city' ? r.city : null, country: shown ? r.country : null,
    lat: r.map === 'city' ? round2(r.lat) : null, lng: r.map === 'city' ? round2(r.lng) : null, tz: shown ? r.tz : null,
    disciplines: pr?.map_disciplines ?? [], blurb: pr?.blurb ?? null,
    discord: r.discord_id ? r.discord_username : null, github: r.github_id ? r.github_login : null,
    joined: (r.claimed_at ?? r.created_at).slice(0, 7),
  };
}
/** Members: the card's place (at the map's precision), and the profile without "never". */
function memberView(r: Row): Person {
  const pr = db().profiles[r.id];
  let profile: Profile | null = null;
  if (pr) { const { call_ok: _c, call_windows: _w, heard_from: _h, never: _n, ...rest } = pr; profile = { discord_said: null, ...rest }; }
  return { ...card(r), has_account: r.user_id != null, profile };
}
function selfView(r: Row): Person {
  const pr = db().profiles[r.id];
  return { ...memberView(r), city: r.city, country: r.country, tz: r.tz, lat: r.lat, lng: r.lng, map: r.map, ref: r.ref, claimed_at: r.claimed_at,
    profile: pr ? { discord_said: null, ...pr } : null };
}
function teamView(r: Row): Person {
  const s = db();
  return {
    ...selfView(r), email: r.email, source: r.source, added_by: r.added_by, user_id: r.user_id, created_at: r.created_at,
    github: r.github_login, discord: r.discord_username, github_id: r.github_id, discord_id: r.discord_id,
    outreach: s.outreach.filter((o) => o.person_id === r.id).map(({ person_id: _p, history: _h, ...o }) => o),
    guess: s.guesses[r.id] ?? null,
    note_count: s.notes.filter((n) => n.person_id === r.id).length,
    call_notes: s.notes.filter((n) => n.person_id === r.id && n.kind === 'call').length,
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
/** Members see people who finished a profile, and themselves. */
const memberSees = (r: Row) => !!r.user_id && (r.user_id === DEMO_ME || !!db().profiles[r.id]?.finished_at);
function demoPeople(): Person[] {
  requireMember();
  return db().people.filter((r) => isTeam() || memberSees(r)).map(viewFor);
}
function demoPerson(id: string): PersonDetail {
  requireMember();
  const r = row(id);
  if (!isTeam()) { if (!memberSees(r)) demoFail('No such person'); return viewFor(r); }
  const s = db();
  return {
    ...teamView(r),
    notes: s.notes.filter((n) => n.person_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(({ person_id: _p, ...n }) => n),
    outreach: s.outreach.filter((o) => o.person_id === id).map(({ person_id: _p, ...o }) => o),
    skill_checks: s.skills.filter((k) => k.person_id === id).map(({ person_id: _p, ...k }) => k),
    matches: s.matches.filter((m) => m.person_id === id && !m.settled).map(matchView),
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
    r = { id: DEMO_ME, user_id: DEMO_ME, display_name: 'You', github_login: null, github_id: null, discord_username: null, discord_id: null, email: null, city: null, country: null, lat: null, lng: null,
      tz: null, map: 'off', source: 'Signed up', ref: f.ref ?? joinRef() ?? null, added_by: null, created_at: now, claimed_at: now };
    s.people.push(r);
  }
  const { ref: _ref, display_name, discord, city, country, lat, lng, tz, map, ...rest } = f;
  if (display_name !== undefined) r.display_name = display_name.trim() || demoFail('Your name can\'t be empty');
  if (city !== undefined) r.city = city;
  if (country !== undefined) r.country = country;
  // A new city or country without coordinates clears the old ones.
  if (lat !== undefined) r.lat = lat; else if (city !== undefined || country !== undefined) r.lat = null;
  if (lng !== undefined) r.lng = lng; else if (city !== undefined || country !== undefined) r.lng = null;
  if (tz !== undefined) r.tz = tz;
  if (map !== undefined) r.map = map;
  const pr = s.profiles[r.id] ??= {
    wants_to_build: null, lanes: [], can: [], learn: [], experience: null, story: null, tools: [], build: [], travel: null, hours: null, availability: null,
    wants: [], never: null, links: [], blurb: null, map_disciplines: [], agent_drafted: false, updated_at: now, finished_at: null, call_ok: false, call_windows: null, heard_from: null,
  };
  Object.assign(pr, rest, { updated_at: now });
  if (discord !== undefined) pr.discord_said = discord.replace(/^@/, '').trim() || null;
  if (finish) {
    if (!pr.wants_to_build?.trim()) demoFail('Tell us what you want to build first');
    pr.finished_at ??= now;
  }
  forgetJoinRef();
  persist();
  return selfView(r);
}
function demoFind(q: { name?: string; discord?: string; github?: string; email?: string; githubId?: number; discordId?: string }): Candidate[] {
  requireTeam();
  const nm = q.name?.trim().toLowerCase(), dc = q.discord?.trim().replace(/^@/, '').toLowerCase(), gh = q.github?.trim().replace(/^@/, '').toLowerCase(), em = q.email?.trim().toLowerCase();
  return db().people.flatMap((r) => {
    const n = r.display_name.toLowerCase();
    const why = [
      nm && (n === nm || (nm.length >= 4 && (n.includes(nm) || nm.includes(n)))) ? 'name' : null,
      (dc && r.discord_username?.toLowerCase() === dc) || (q.discordId && r.discord_id === q.discordId) ? 'discord' : null,
      (gh && r.github_login?.toLowerCase() === gh) || (q.githubId && r.github_id === q.githubId) ? 'github' : null,
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
  // As sa_add_person: the ids the app resolved and the email are one record each.
  const dup = s.people.find((r) => (p.githubId != null && r.github_id === p.githubId) || (p.discordId != null && r.discord_id === p.discordId) || (email && r.email?.toLowerCase() === email));
  if (dup) demoFail(`Already in the registry: ${dup.display_name}`);
  if (p.owner && !SAMPLE_TEAM.some((m) => m.id === p.owner)) demoFail('The owner has to be core or a lead');
  const now = new Date().toISOString(), id = newId(), by = demoTeamMe();
  s.people.push({ id, user_id: null, display_name: p.name.trim(), github_login: p.githubLogin?.trim().replace(/^@/, '') || null, github_id: p.githubId ?? null,
    discord_username: p.discordUsername?.trim().replace(/^@/, '') || null, discord_id: p.discordId ?? null,
    email, city: p.city?.trim() || null, country: p.country?.trim() || null, lat: p.lat ?? null, lng: p.lng ?? null, tz: p.tz ?? null, map: 'off', source: p.source.trim(), ref: null,
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
  const { guess_disciplines, guess_tools, ...rest } = f;
  const dup = db().people.find((x) => x.id !== id && ((rest.github_id != null && x.github_id === rest.github_id) || (rest.discord_id != null && x.discord_id === rest.discord_id)
    || (rest.email && x.email?.toLowerCase() === rest.email.trim().toLowerCase())));
  if (dup) demoFail(`Already in the registry: ${dup.display_name}`);
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
/** A card with its evidence, as sa_reg_match: the account's from its own row, the record's as it stands. */
function matchView(m: DemoState['matches'][number]): Match {
  const s = db();
  const { settled: _s, outcome: _o, ...rest } = m;
  const rec = s.people.find((p) => p.id === m.person_id);
  const acct = s.people.find((p) => p.user_id === m.user_id);
  return {
    ...rest, person_name: rec?.display_name,
    account_github: m.account_github ?? (acct?.github_id ? acct.github_login : null), account_discord: m.account_discord ?? (acct?.discord_id ? acct.discord_username : null),
    record_email: rec?.email ?? null, record_github: rec?.github_login ?? null, record_github_resolved: rec?.github_id != null,
    record_discord: rec?.discord_username ?? null, record_discord_resolved: rec?.discord_id != null,
  };
}
function demoMatches(): Match[] {
  requireTeam();
  return db().matches.filter((m) => !m.settled).map(matchView);
}
const requireLead = () => { requireMember(); if (registryDemo.role !== 'lead') demoFail('Only a lead can do that'); };
function demoLink(match: string, same: boolean): string | null {
  requireLead();
  const s = db();
  const m = s.matches.find((x) => x.id === match) ?? demoFail('No such match');
  if (m.settled) demoFail('That was settled already');
  if (!same) { m.settled = true; m.outcome = 'different'; persist(); return m.account_person_id; }
  const rec = row(m.person_id);
  if (rec.user_id) demoFail('That record is already linked to an account');
  // As sa_link_person: the account's own row folds into the team's record,
  // unless the record holds a GitHub or Discord account it doesn't sign in with.
  const mine = s.people.find((p) => p.user_id === m.user_id);
  if (mine?.added_by) demoFail('That account is already linked to a record the team added');
  if (rec.github_id != null && rec.github_id !== mine?.github_id) {
    demoFail('This record holds a GitHub account that this account doesn\'t sign in with. If it\'s them, they sign in with that GitHub and it links by itself; if the record is wrong, fix it first.');
  }
  if (rec.discord_id != null && rec.discord_id !== mine?.discord_id) {
    demoFail('This record holds a Discord account that this account doesn\'t sign in with. If it\'s them, they sign in with that Discord and it links by itself; if the record is wrong, fix it first.');
  }
  const said = !!(mine && s.profiles[mine.id]);
  // The place the team typed moves to its guesses; what they said replaces it.
  if (rec.city || rec.country || rec.lat != null || rec.tz) {
    const g = s.guesses[rec.id] ??= { disciplines: [], tools: [], updated_at: '' };
    Object.assign(g, { city: g.city ?? rec.city, country: g.country ?? rec.country, lat: g.lat ?? rec.lat, lng: g.lng ?? rec.lng, tz: g.tz ?? rec.tz, updated_at: new Date().toISOString() });
  }
  if (!rec.github_id) rec.github_login = mine?.github_id ? mine.github_login : null;
  rec.github_id ??= mine?.github_id ?? null;
  if (!rec.discord_id) rec.discord_username = mine?.discord_id ? mine.discord_username : null;
  rec.discord_id ??= mine?.discord_id ?? null;
  rec.city = mine?.city ?? null; rec.country = mine?.country ?? null; rec.lat = mine?.lat ?? null; rec.lng = mine?.lng ?? null; rec.tz = mine?.tz ?? null;
  rec.map = mine?.map ?? 'off';
  if (mine) {
    if (said) { s.profiles[rec.id] = s.profiles[mine.id]!; delete s.profiles[mine.id]; }
    for (const n of s.notes) if (n.person_id === mine.id) n.person_id = rec.id;
    for (const k of s.skills) if (k.person_id === mine.id) k.person_id = rec.id;
    s.outreach = s.outreach.filter((o) => o.person_id !== mine.id || !s.outreach.some((x) => x.person_id === rec.id && x.kind === o.kind));
    for (const o of s.outreach) if (o.person_id === mine.id) o.person_id = rec.id;
    for (const x of s.matches) if (x.account_person_id === mine.id) x.account_person_id = rec.id;
    s.people = s.people.filter((p) => p.id !== mine.id);
    if (said) rec.display_name = mine.display_name;
    rec.ref = mine.ref ?? rec.ref;
  }
  rec.user_id = m.user_id;
  rec.claimed_at = new Date().toISOString();
  m.settled = true; m.outcome = 'same';
  for (const x of s.matches) if (!x.settled && (x.person_id === rec.id || x.user_id === m.user_id)) { x.settled = true; x.outcome = 'superseded'; }
  persist();
  return rec.id;
}
/** As sa_people_account_gone: an account leaves a row. Its own row goes; a
 * record the team added loses the profile and place and is unclaimed. */
function accountGone(r: Row) {
  const s = db();
  delete s.profiles[r.id];
  if (!r.added_by) { dropPerson(r.id); return; }
  Object.assign(r, { user_id: null, claimed_at: null, map: 'off', city: null, country: null, lat: null, lng: null, tz: null, ref: null });
}
function dropPerson(id: string) {
  const s = db();
  s.people = s.people.filter((p) => p.id !== id);
  delete s.profiles[id];
  delete s.guesses[id];
  s.notes = s.notes.filter((n) => n.person_id !== id);
  s.outreach = s.outreach.filter((o) => o.person_id !== id);
  s.skills = s.skills.filter((k) => k.person_id !== id);
  s.matches = s.matches.filter((m) => m.person_id !== id);
  for (const m of s.matches) if (m.account_person_id === id) m.account_person_id = null;
}
function demoUnlink(person: string): string {
  requireLead();
  const s = db();
  const rec = row(person);
  if (!rec.user_id) demoFail('That record isn\'t linked to an account');
  if (!rec.added_by) demoFail('That is their own record, not one the team added');
  const acct = rec.user_id!, now = new Date().toISOString(), id = newId();
  const pr = s.profiles[rec.id];
  s.people.push({ id, user_id: acct, display_name: rec.display_name, github_login: null, github_id: null, discord_username: null, discord_id: null, email: null,
    city: rec.city, country: rec.country, lat: rec.lat, lng: rec.lng, tz: rec.tz, map: rec.map, source: 'Signed up', ref: rec.ref, added_by: null, created_at: now, claimed_at: now });
  if (pr) { s.profiles[id] = pr; delete s.profiles[rec.id]; }
  // The GitHub account its sign-in proves goes back with it.
  const m = s.matches.find((x) => x.person_id === rec.id && x.user_id === acct && x.outcome === 'same');
  const mine = s.people.find((p) => p.id === id)!;
  if (m?.account_github && rec.github_login === m.account_github) {
    Object.assign(mine, { github_login: rec.github_login, github_id: rec.github_id });
    Object.assign(rec, { github_login: null, github_id: null });
  }
  accountGone(rec);
  for (const m of s.matches) if (m.person_id === rec.id && m.user_id === acct && m.outcome === 'same') { m.outcome = 'different'; m.account_person_id = id; }
  persist();
  return id;
}
function demoDeletePerson(person: string): void {
  requireLead();
  row(person);
  dropPerson(person);
  persist();
}
function demoDeleteMine(): void {
  if (registryDemo.signedOut) demoFail('Sign in first');
  const r = db().people.find((p) => p.user_id === DEMO_ME);
  if (!r) return;
  accountGone(r);
  persist();
}
