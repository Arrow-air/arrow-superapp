import { computed, reactive, watch } from 'vue';
import { threads as seed, type Position, type Thread } from './data';
import { tally, voteWeight, weightingChangedWinner, type Role, type Tally, type Voter, type WeightBreakdown } from './weights';
import { personById, type Person } from '../../data/people';
import { zoneTab } from '../../frame/nav';

// Module state: the threads, who you are voting as, and the derived tallies
// and statuses. A demo with no backend: everything you do is kept in this
// browser's localStorage, and "Reset demo" puts the seed back.
const KEY = 'quiver-demo.threads.v2';

interface Saved { threads: Thread[]; role: Role; builder: boolean; nextThread: number; nextDecision: number }
const fresh = (): Saved => ({
  threads: structuredClone(seed),
  role: 'member',
  builder: false,
  nextThread: seed.length + 1,
  nextDecision: 1,
});
function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch { /* storage unavailable or corrupt: start clean */ }
  return fresh();
}

export const state = reactive<Saved>(load());
watch(state, (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } }, { deep: true });

export function resetDemo() {
  Object.assign(state, fresh());
}
/** True once anything differs from the seed, so the reset control can show. */
export const touched = computed(() => JSON.stringify(state.threads) !== JSON.stringify(seed) || state.role !== 'member');

// People: the visitor votes; everyone else is shown, never scored. Nobody in
// the notes has a role, holdings or verified expertise recorded yet.
export const person = (id: string | undefined): Person | undefined => personById(id);
const voterOf = (id: string): Voter =>
  id === 'me'
    ? { tokenBalance: 0, expertise: [], builder: state.builder, role: state.role }
    : { tokenBalance: 0, expertise: [], builder: false, role: 'member' };

export function weightOf(thread: Thread, memberId: string): WeightBreakdown {
  return voteWeight(voterOf(memberId), thread);
}

export function talliesOf(thread: Thread): Tally[] {
  return tally(
    thread.positions.map((p) => p.id),
    thread.votes.map((v) => ({ ...v, weight: weightOf(thread, v.memberId).total })),
  );
}

export type Status = 'needs' | 'converging' | 'settled';
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
  const { top, margin, share } = leaderOf(thread);
  return top && top.weightedScore > 0 && share >= CONVERGE_SHARE && margin >= CONVERGE_MARGIN ? 'converging' : 'needs';
}

export const changedWinner = (thread: Thread) => weightingChangedWinner(talliesOf(thread));

export const myVote = (thread: Thread, positionId: string) =>
  thread.votes.find((v) => v.memberId === 'me' && v.positionId === positionId)?.value ?? 0;

const now = () => new Date().toISOString();

/** One vote per position; voting the same way again takes it back. */
export function vote(thread: Thread, positionId: string, value: 1 | -1) {
  const i = thread.votes.findIndex((v) => v.memberId === 'me' && v.positionId === positionId);
  if (i >= 0 && thread.votes[i].value === value) thread.votes.splice(i, 1);
  else if (i >= 0) thread.votes[i].value = value;
  else thread.votes.push({ memberId: 'me', positionId, value });
  thread.activeAt = now();
}

/** Lead only. Settling on anything but the weighted leader is recorded as an override. */
export function settle(thread: Thread, positionId: string, note: string) {
  const { top } = leaderOf(thread);
  const decision = thread.settled?.decision ?? `D-${String(state.nextDecision++).padStart(3, '0')}`;
  thread.settled = { positionId, byId: 'me', at: now(), override: positionId !== top?.positionId, note, decision };
  thread.activeAt = now();
}
export const reopen = (thread: Thread) => { thread.settled = undefined; thread.activeAt = now(); };

export function reply(thread: Thread, text: string) {
  thread.replies.push({ id: `r${Date.now()}`, authorId: 'me', text, at: now() });
  thread.activeAt = now();
}

export function propose(thread: Thread, text: string): Position {
  const p: Position = { id: `p${Date.now()}`, text, authorId: 'me', at: now() };
  thread.positions.push(p);
  thread.activeAt = now();
  return p;
}

export function startThread(input: { zone: string; title: string; body: string; type?: Thread['type']; fromCall?: string }): Thread {
  const t: Thread = {
    id: `Q-${state.nextThread++}`,
    zone: input.zone,
    title: input.title,
    body: input.body,
    kind: 'technical',
    type: input.type ?? 'question',
    system: input.zone,
    version: 'Next',
    authorId: 'me',
    source: input.fromCall ? { kind: 'call', ref: input.fromCall, label: 'Sep 29 call' } : undefined,
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
/** The tab a thread's zone sits under: Attachments, Software, Aircraft… */
export const areaOf = (t: Thread) => zoneTab(t.zone)?.id ?? 'overview';
export const byActivity = (a: Thread, b: Thread) => b.activeAt.localeCompare(a.activeAt);

/** One line on where a thread stands, for rows and the panel. */
export function standing(t: Thread) {
  const letter = (id: string) => String.fromCharCode(65 + t.positions.findIndex((p) => p.id === id));
  if (t.settled) return { status: 'settled' as Status, text: `Decided: ${letter(t.settled.positionId)} · ${t.settled.decision}` };
  const n = t.positions.length;
  if (!n) return { status: 'needs' as Status, text: 'No positions yet' };
  const votes = t.votes.length;
  const { top, share } = leaderOf(t);
  const pos = `${n} position${n === 1 ? '' : 's'}`;
  if (!votes || !top || top.weightedScore <= 0) return { status: statusOf(t), text: `${pos} · no votes yet` };
  return { status: statusOf(t), text: `${pos} · ${letter(top.positionId)} leads with ${Math.round(share * 100)}%` };
}
export const openIn = (zone: string) => threadsInZone(zone).filter((t) => !t.settled).length;
