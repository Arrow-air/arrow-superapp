import { computed, reactive } from 'vue';
import { me, members, threads as seed, type Member, type Thread, type ThreadType } from './data';
import { selLabel, type Sel } from '../model/model';
import { tally, voteWeight, weightingChangedWinner, type Role, type Tally, type WeightBreakdown } from './weights';

// Module state: the threads (cloned so edits stay in memory), who you are
// voting as, and the derived tallies and statuses.
export const state = reactive({
  threads: structuredClone(seed) as Thread[],
  role: 'core' as Role,
});

export const myVoter = computed(() => ({ ...me, role: state.role }));

export const person = (id: string): Member | undefined =>
  id === 'me' ? { ...me, role: state.role } : members.find((m) => m.id === id);

export function weightOf(thread: Thread, memberId: string): WeightBreakdown {
  const p = person(memberId)!;
  return voteWeight(p, thread);
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

/** One vote per position; voting the same way again takes it back. */
export function vote(thread: Thread, positionId: string, value: 1 | -1) {
  const i = thread.votes.findIndex((v) => v.memberId === 'me' && v.positionId === positionId);
  if (i >= 0 && thread.votes[i].value === value) thread.votes.splice(i, 1);
  else if (i >= 0) thread.votes[i].value = value;
  else thread.votes.push({ memberId: 'me', positionId, value });
}

/** Lead only. Settling on anything but the weighted leader is recorded as an override. */
export function settle(thread: Thread, positionId: string, note: string) {
  const { top } = leaderOf(thread);
  thread.settled = { positionId, byId: 'me', at: 'just now', override: positionId !== top?.positionId, note };
}
export const reopen = (thread: Thread) => { thread.settled = undefined; };

export function reply(thread: Thread, text: string) {
  thread.replies.push({ id: `r${Date.now()}`, authorId: 'me', text, at: 'just now' });
}

/** A new thread, from you, at the top of the list. In memory like votes and replies. */
export function createThread(d: { page?: string; system: string; part?: Sel; type: ThreadType; title: string; body: string }): Thread {
  const n = Math.max(0, ...state.threads.map((t) => Number(t.id.split('-')[1]) || 0)) + 1;
  const t: Thread = {
    id: `ARW-${n}`, page: d.page, part: d.part, title: d.title, body: d.body,
    kind: 'technical', type: d.type, context: 'design', system: d.system,
    anchor: { kind: 'model', label: d.part ? selLabel(d.part) : 'Page' }, version: 'PT 2.0',
    authorId: 'me', raised: 'Today', active: 'now', positions: [], votes: [], replies: [], objections: 0,
  };
  state.threads.unshift(t);
  return t;
}
