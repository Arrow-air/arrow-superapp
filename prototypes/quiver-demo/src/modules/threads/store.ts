import { computed, reactive, watch } from 'vue';
import { LATER, NEXT, threads as seed, type Position, type SourceRef, type Thread } from './data';
import { allocateRetro, proposerAward, type RetroAllocation, type Scored } from './retro';
import { tally, voteWeight, weightingChangedWinner, type Role, type Tally, type Voter, type WeightBreakdown } from './weights';
import { personById, type Hue, type Person } from '../../data/people';
import { zoneTab } from '../../frame/nav';
import { remote, sb } from '../../lib/backend';
import { reload, requireSignIn, say, session, type Member } from '../../lib/session';

// Module state: the threads, who you are voting as, and the derived tallies
// and statuses. Two modes, one set of views:
// - demo (no Supabase env): everything lives in this browser's localStorage,
//   and "Reset demo" puts the seed back;
// - live (the shared Arrow Supabase): remote.ts loads the workspace into this
//   same state, and every write below goes through a checked database
//   function, then reloads.
const KEY = 'quiver-demo.threads.v6';
/** The zones that make up the next Dev Kit revision, in page order. */
export const V11_ZONES = ['airframe', 'gps-rf', 'propulsion', 'power', 'avionics'];

// Work drafted from a decision: a bounty (a fixed deliverable anyone can
// claim) or a grant (scoped work for someone to take on). Carries the
// proposer award, 25% of the reward to whoever wrote the adopted idea.
export type WorkKind = 'bounty' | 'grant';
export type WorkStage = 'draft' | 'open' | 'in_progress' | 'in_review' | 'completed';
export interface Proposer {
  /** 'me' for the visitor; a person named in notes; absent when only a document is the source. */
  personId?: string;
  source?: SourceRef;
  /** Named in notes is not proof of who raised it: the award is held until a lead confirms. */
  confirmedBy?: string;
}
export interface Work {
  id: string;
  threadId: string;
  decision: string;
  positionId: string;
  kind: WorkKind;
  title: string;
  scope: string;
  acceptance: string;
  /** In $ARROW. A record only: nothing is paid from the app. */
  reward: number;
  proposerShare: number;
  proposer: Proposer;
  stage: WorkStage;
  ownerId?: string;
  evidence?: string;
  history: { at: string; byId: string; note: string }[];
  createdAt: string;
}
/** The next version's plan: freeze date and retro pool, then the recorded freeze. */
export interface Release {
  pool?: number;
  freezeTarget?: string;
  frozenAt?: string;
  frozenBy?: string;
  allocation?: RetroAllocation;
}

interface Saved {
  threads: Thread[]; role: Role; builder: boolean; nextThread: number; nextDecision: number;
  work: Work[]; nextWork: number; release: Release;
}
const fresh = (): Saved => ({
  threads: remote ? [] : structuredClone(seed),
  role: 'member',
  builder: false,
  nextThread: seed.length + 1,
  nextDecision: 1 + seed.filter((t) => t.settled).length,
  work: [],
  nextWork: 1,
  release: {},
});
function load(): Saved {
  if (remote) return fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch { /* storage unavailable or corrupt: start clean */ }
  return fresh();
}

export const state = reactive<Saved>(load());
if (!remote) watch(state, (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } }, { deep: true });

/** Live writes: ask for sign-in, call the database function, then reload. Undefined on failure. */
async function call<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T | undefined> {
  if (!requireSignIn()) return undefined;
  const { data, error } = await sb!.rpc(fn, args);
  await reload();
  if (error) { say(error.message); return undefined; }
  return data as T;
}

export function resetDemo() {
  Object.assign(state, fresh());
}
/** True once anything differs from the seed, so the reset control can show. */
export const touched = computed(() => JSON.stringify(state.threads) !== JSON.stringify(seed) || state.role !== 'member' || state.work.length > 0 || Object.keys(state.release).length > 0);

// People. In the demo, the visitor votes and everyone else is shown, never
// scored. Live, accounts are workspace members with a role a lead sets;
// people named in notes still resolve through people.ts.
const HUES: Hue[] = ['indigo', 'jade', 'plum', 'amber', 'sky', 'red'];
const hueOf = (id: string) => HUES[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];
const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
const memberPerson = (m: Member, id: string): Person => ({
  id, name: m.display_name, initials: initialsOf(m.display_name), hue: hueOf(m.user_id), github: m.github ?? undefined, avatar: m.avatar_url ?? undefined,
  does: [{ text: m.role === 'lead' ? 'Lead' : m.role === 'core' ? 'Core contributor' : 'Member', source: 'workspace role' }],
});
export const person = (id: string | undefined): Person | undefined => {
  if (remote && id === 'me' && session.member) return memberPerson(session.member, 'me');
  if (remote && id && session.members[id]) return memberPerson(session.members[id], id);
  return personById(id);
};
export const isBuilder = (thread: Thread, id = 'me') =>
  remote ? session.builders.includes(`${thread.id}|${id === 'me' ? session.userId : id}`) : id === 'me' && state.builder;
const voterOf = (id: string, thread: Thread): Voter => {
  if (!remote) return id === 'me' ? { tokenBalance: 0, expertise: [], builder: state.builder, role: state.role } : { tokenBalance: 0, expertise: [], builder: false, role: 'member' };
  const role = id === 'me' ? session.member?.role : session.members[id]?.role;
  return { tokenBalance: 0, expertise: [], builder: isBuilder(thread, id), role: role ?? 'member' };
};
/** "I'd help build this": one more point of weight on your votes in this thread. */
export function setBuilder(thread: Thread, on: boolean) {
  if (!remote) { state.builder = on; return; }
  void call('sa_set_builder', { p_thread: thread.id, p_on: on });
}
export const setRole = (userId: string, role: Role) => void call('sa_set_role', { p_user: userId, p_role: role });

export function weightOf(thread: Thread, memberId: string): WeightBreakdown {
  return voteWeight(voterOf(memberId, thread), thread);
}

export function talliesOf(thread: Thread): Tally[] {
  return tally(
    thread.positions.map((p) => p.id),
    thread.votes.map((v) => ({ ...v, weight: weightOf(thread, v.memberId).total })),
  );
}

export type Status = 'needs' | 'converging' | 'settled' | 'declined';
/** Converging: the weighted leader holds this share of the positive weighted vote… */
export const CONVERGE_SHARE = 0.65;
/** …and is at least this many weighted points ahead of the runner-up. */
export const CONVERGE_MARGIN = 3;

export function leaderOf(thread: Thread) {
  const t = [...talliesOf(thread)].sort((a, b) => b.weightedScore - a.weightedScore);
  const top = t[0];
  const margin = top ? top.weightedScore - (t[1]?.weightedScore ?? 0) : 0;
  const positive = t.reduce((s, x) => s + Math.max(0, x.weightedScore), 0);
  const share = top && positive ? Math.max(0, top.weightedScore) / positive : 0;
  return { top, margin: Math.round(margin * 100) / 100, share };
}

export function statusOf(thread: Thread): Status {
  if (thread.settled) return 'settled';
  if (thread.declined) return 'declined';
  const { top, margin, share } = leaderOf(thread);
  return top && top.weightedScore > 0 && share >= CONVERGE_SHARE && margin >= CONVERGE_MARGIN ? 'converging' : 'needs';
}

export const changedWinner = (thread: Thread) => weightingChangedWinner(talliesOf(thread));

export const myVote = (thread: Thread, positionId: string) =>
  thread.votes.find((v) => v.memberId === 'me' && v.positionId === positionId)?.value ?? 0;

const now = () => new Date().toISOString();

/** One vote per position; voting the same way again takes it back. */
export function vote(thread: Thread, positionId: string, value: 1 | -1) {
  if (remote && !requireSignIn()) return;
  if (remote) void call('sa_vote', { p_position: positionId, p_value: value });
  const i = thread.votes.findIndex((v) => v.memberId === 'me' && v.positionId === positionId);
  if (i >= 0 && thread.votes[i].value === value) thread.votes.splice(i, 1);
  else if (i >= 0) thread.votes[i].value = value;
  else thread.votes.push({ memberId: 'me', positionId, value });
  thread.activeAt = now();
}

/** Lead only. Settling on anything but the weighted leader is recorded as an override. */
export function settle(thread: Thread, positionId: string, note: string) {
  const { top } = leaderOf(thread);
  if (remote) { void call('sa_settle', { p_thread: thread.id, p_position: positionId, p_note: note, p_override: positionId !== top?.positionId }); return; }
  const decision = thread.settled?.decision ?? `D-${String(state.nextDecision++).padStart(3, '0')}`;
  thread.settled = { positionId, byId: 'me', at: now(), override: positionId !== top?.positionId, note, decision };
  thread.activeAt = now();
}
export const reopen = (thread: Thread) => {
  if (remote) { void call('sa_reopen', { p_thread: thread.id }); return; }
  thread.settled = undefined; thread.declined = undefined; thread.activeAt = now(); };

/** Open: neither adopted nor declined. Deferred threads stay open in their new version. */
export const isOpen = (t: Thread) => !t.settled && !t.declined;
/** A frozen version's outcomes are locked. */
export const locked = (t: Thread) => t.version === NEXT && !!state.release.frozenAt;

/** Lead only. Close without adopting anything; the reason is required. */
export function decline(thread: Thread, note: string) {
  if (remote) { void call('sa_decline', { p_thread: thread.id, p_note: note }); return; }
  thread.declined = { byId: 'me', at: now(), note };
  thread.activeAt = now();
}
/** Lead only. Push to the version after v1.1; it stays open there. */
export function defer(thread: Thread, note?: string) {
  if (remote) { void call('sa_defer', { p_thread: thread.id, p_to: LATER, p_note: note ?? null }); return; }
  (thread.deferrals ??= []).push({ from: thread.version, to: LATER, byId: 'me', at: now(), note });
  thread.version = LATER;
  thread.activeAt = now();
}

// Work drafted from decisions.
export const workFor = (t: Thread) => state.work.find((w) => w.threadId === t.id);
export function draftWork(t: Thread, input: { kind: WorkKind; title: string; scope: string; acceptance: string; reward: number }): Work | undefined {
  if (remote) {
    void call('sa_draft_work', { p_thread: t.id, p_kind: input.kind, p_title: input.title, p_scope: input.scope, p_acceptance: input.acceptance, p_reward: input.reward });
    return undefined;
  }
  const p = t.positions.find((x) => x.id === t.settled!.positionId);
  const w: Work = {
    id: `W-${state.nextWork++}`,
    threadId: t.id,
    decision: t.settled!.decision,
    positionId: t.settled!.positionId,
    ...input,
    proposerShare: 0.25,
    proposer: { personId: p?.authorId, source: p?.source, confirmedBy: p?.authorId === 'me' ? 'me' : undefined },
    stage: 'draft',
    history: [{ at: now(), byId: 'me', note: `Drafted from ${t.settled!.decision}` }],
    createdAt: now(),
  };
  state.work.push(w);
  t.activeAt = now();
  return w;
}
const move = (w: Work, stage: WorkStage, note: string) => { w.stage = stage; w.history.push({ at: now(), byId: 'me', note }); };
const step = (w: Work, action: string, text?: string) => void call('sa_work_step', { p_work: w.id, p_action: action, p_text: text ?? null });
export const publishWork = (w: Work) => (remote ? step(w, 'publish') : move(w, 'open', `Published as an open ${w.kind}`));
export const claimWork = (w: Work) => (remote ? step(w, 'claim') : (w.ownerId = 'me', move(w, 'in_progress', 'Claimed')));
export const submitWork = (w: Work, evidence: string) => (remote ? step(w, 'submit', evidence) : (w.evidence = evidence, move(w, 'in_review', 'Submitted for review')));
export const acceptWork = (w: Work) => (remote ? step(w, 'accept') : move(w, 'completed', 'Accepted by the lead'));
export const requestChanges = (w: Work, note: string) => (remote ? step(w, 'changes', note) : move(w, 'in_progress', `Changes requested: ${note}`));
export const confirmProposer = (w: Work) => {
  if (remote) return step(w, 'confirm');
  w.proposer.confirmedBy = 'me';
  w.history.push({ at: now(), byId: 'me', note: 'Confirmed the proposer award' });
};
export const awardOf = (w: Work) => proposerAward(w.reward, w.proposerShare);

// The v1.1 retro pool: every position on a v1.1 thread, adopted or not,
// scored by weighted net support. Recipients are the person the position is
// attributed to ('me' for the visitor), or its source when no person is named.
export function retroContributions(): Scored[] {
  return state.threads
    .filter((t) => t.version === NEXT)
    .flatMap((t) => {
      const tallies = talliesOf(t);
      return t.positions.map((p) => ({
        positionId: p.id,
        threadId: t.id,
        recipient: p.authorId ?? `source:${p.source?.label ?? 'unattributed'}`,
        score: Math.max(0, tallies.find((x) => x.positionId === p.id)?.weightedScore ?? 0),
      }));
    });
}
export const retroPreview = () => (state.release.allocation ?? allocateRetro(state.release.pool ?? 0, retroContributions()));
export const setReleasePlan = (plan: { pool?: number; freezeTarget?: string }) => {
  if (remote) return void call('sa_set_release_plan', { p_version: NEXT, p_pool: plan.pool ?? null, p_freeze: plan.freezeTarget ?? null });
  Object.assign(state.release, plan);
};
/** Lead only, once every v1.1 thread is adopted, declined or deferred. */
export function freezeRelease() {
  if (remote) {
    // Record recipients by account id, not 'me', so the split reads the same for everyone.
    const a = allocateRetro(state.release.pool ?? 0, retroContributions());
    const lines = a.lines.map((l) => ({ ...l, recipient: l.recipient === 'me' ? session.userId : l.recipient }));
    return void call('sa_freeze', { p_version: NEXT, p_allocation: { ...a, lines, at: now() } });
  }
  state.release.allocation = { ...allocateRetro(state.release.pool ?? 0, retroContributions()), at: now() };
  state.release.frozenAt = now();
  state.release.frozenBy = 'me';
}
/** Deferring what is left is how a lead clears the way to the freeze. */
export const deferOpen = (note: string) => remote
  ? void call('sa_defer_open', { p_version: NEXT, p_to: LATER, p_note: note })
  : state.threads.filter((t) => t.version === NEXT && isOpen(t)).forEach((t) => defer(t, note));

export function reply(thread: Thread, text: string) {
  if (remote && !requireSignIn()) return;
  if (remote) void call('sa_reply', { p_thread: thread.id, p_text: text });
  thread.replies.push({ id: `r${Date.now()}`, authorId: 'me', text, at: now() });
  thread.activeAt = now();
}

export function propose(thread: Thread, text: string): Position | undefined {
  if (remote && !requireSignIn()) return undefined;
  if (remote) void call('sa_propose', { p_thread: thread.id, p_text: text });
  const p: Position = { id: `p${Date.now()}`, text, authorId: 'me', at: now() };
  thread.positions.push(p);
  thread.activeAt = now();
  return p;
}

export async function startThread(input: { zone: string; title: string; body: string; type?: Thread['type']; fromCall?: string; version?: string; part?: string; pcb?: Thread['pcb'] }): Promise<Thread | undefined> {
  const source: SourceRef | undefined = input.fromCall ? { kind: 'call', ref: input.fromCall, label: 'Sep 29 call' } : undefined;
  const version = (() => {
    const v = input.version ?? (V11_ZONES.includes(input.zone) ? NEXT : '');
    return v === NEXT && state.release.frozenAt ? LATER : v;
  })();
  if (remote) {
    const id = await call<string>('sa_start_thread', {
      p_zone: input.zone, p_title: input.title, p_body: input.body, p_type: input.type ?? 'question', p_version: version,
      p_part: input.part ?? null, p_pcb: input.pcb ?? null, p_source: source ?? null,
    });
    return id ? state.threads.find((t) => t.id === id) : undefined;
  }
  const t: Thread = {
    id: `Q-${state.nextThread++}`,
    zone: input.zone,
    part: input.part,
    pcb: input.pcb,
    title: input.title,
    body: input.body,
    kind: 'technical',
    type: input.type ?? 'question',
    system: input.zone,
    // Threads in the next-revision zones are about v1.1 unless said otherwise;
    // once v1.1 is frozen, new proposals go to the version after it.
    version,
    authorId: 'me',
    source,
    raisedAt: now(),
    activeAt: now(),
    positions: [],
    votes: [],
    replies: [],
    objections: 0,
  };
  state.threads.unshift(t);
  return t;
}

/** "3h", "2d", "Sep 29": how long since a thread moved. */
export function ago(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return day(iso);
}
export const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const threadsInZone = (zone: string) => state.threads.filter((t) => t.zone === zone);
export const threadsOnPart = (part: string) => state.threads.filter((t) => t.part === part);
export const threadsOnComponent = (board: string, ref: string) => state.threads.filter((t) => t.pcb?.board === board && t.pcb.ref === ref);
/** The tab a thread's zone sits under: Attachments, Software, Aircraft… */
export const areaOf = (t: Thread) => zoneTab(t.zone)?.id ?? 'overview';
export const byActivity = (a: Thread, b: Thread) => b.activeAt.localeCompare(a.activeAt);

/** One line on where a thread stands, for rows and the panel. */
export function standing(t: Thread) {
  const letter = (id: string) => String.fromCharCode(65 + t.positions.findIndex((p) => p.id === id));
  if (t.settled) {
    const w = workFor(t);
    const work = w ? ` · ${w.id} ${w.stage === 'completed' ? 'done' : w.stage.replace('_', ' ')}` : '';
    return { status: 'settled' as Status, text: `Decided: ${letter(t.settled.positionId)} · ${t.settled.decision}${work}` };
  }
  if (t.declined) return { status: 'declined' as Status, text: 'Declined' };
  const n = t.positions.length;
  if (!n) return { status: 'needs' as Status, text: 'No positions yet' };
  const votes = t.votes.length;
  const { top, share } = leaderOf(t);
  const pos = `${n} position${n === 1 ? '' : 's'}`;
  if (!votes || !top || top.weightedScore <= 0) return { status: statusOf(t), text: `${pos} · no votes yet` };
  return { status: statusOf(t), text: `${pos} · ${letter(top.positionId)} leads with ${Math.round(share * 100)}%` };
}
export const openIn = (zone: string) => threadsInZone(zone).filter(isOpen).length;
