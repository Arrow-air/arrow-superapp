// Vote weighting, ported from prototypes/spec-threads/src/lib/weights.ts so the
// numbers here are the real formula, not a mock-up.
//
// Technical threads (signal-weighted):
//   weight = (base + token + expertise + builder) × roleMultiplier
// Funding threads (token-weighted, per Thomas's "token for funds flow" note):
//   weight = 1 + √(tokens / scale)   — the square-root curve floated in
//   ideas/weighted-voting.md, never flat, no cap. A proposal, not settled policy.

export type Role = 'lead' | 'core' | 'member';
export type Kind = 'technical' | 'funding';

export interface WeightConfig {
  base: number;
  tokenFactor: number;
  tokenScale: number;
  tokenCap: number;
  expertiseBonus: number;
  builderBonus: number;
  roleMultiplier: Record<Role, number>;
}

export const DEFAULT_WEIGHTS: WeightConfig = {
  base: 1,
  tokenFactor: 1,
  tokenScale: 1000,
  tokenCap: 3,
  expertiseBonus: 1,
  builderBonus: 1,
  roleMultiplier: { lead: 2, core: 1.5, member: 1 },
};

export interface Voter {
  tokenBalance: number;
  expertise: string[];
  builder: boolean;
  role: Role;
}

export interface WeightBreakdown {
  kind: Kind;
  base: number;
  token: number;
  expertise: number;
  builder: number;
  roleMultiplier: number;
  role: Role;
  matched: string[];
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function tokenTerm(balance: number, cfg: WeightConfig = DEFAULT_WEIGHTS): number {
  if (!Number.isFinite(balance) || balance <= 0) return 0;
  return round2(Math.min(cfg.tokenCap, cfg.tokenFactor * Math.log10(1 + balance / cfg.tokenScale)));
}

export function voteWeight(voter: Voter, thread: { kind: Kind; system: string }, cfg: WeightConfig = DEFAULT_WEIGHTS): WeightBreakdown {
  if (thread.kind === 'funding') {
    const token = round2(Math.sqrt(Math.max(0, voter.tokenBalance) / cfg.tokenScale));
    return { kind: 'funding', base: 1, token, expertise: 0, builder: 0, roleMultiplier: 1, role: voter.role, matched: [], total: round2(1 + token) };
  }
  const matched = voter.expertise.filter((t) => t.toLowerCase() === thread.system.toLowerCase());
  const base = cfg.base;
  const token = tokenTerm(voter.tokenBalance, cfg);
  const expertise = matched.length ? cfg.expertiseBonus : 0;
  const builder = voter.builder ? cfg.builderBonus : 0;
  const mult = cfg.roleMultiplier[voter.role];
  return { kind: 'technical', base, token, expertise, builder, roleMultiplier: mult, role: voter.role, matched, total: round2((base + token + expertise + builder) * mult) };
}

export interface Tally { positionId: string; rawUp: number; rawDown: number; rawScore: number; weightedScore: number; voters: number }

export function tally(positionIds: string[], votes: { positionId: string; value: 1 | -1; weight: number }[]): Tally[] {
  return positionIds.map((id) => {
    const mine = votes.filter((v) => v.positionId === id);
    const rawUp = mine.filter((v) => v.value === 1).length;
    const rawDown = mine.length - rawUp;
    const weightedScore = round2(mine.reduce((s, v) => s + v.value * v.weight, 0));
    return { positionId: id, rawUp, rawDown, rawScore: rawUp - rawDown, weightedScore, voters: mine.length };
  });
}

/** True when weighting changed which position is on top: the experiment's headline number. */
export function weightingChangedWinner(t: Tally[]): boolean {
  if (t.length < 2) return false;
  const top = (key: 'rawScore' | 'weightedScore') => {
    const max = Math.max(...t.map((x) => x[key]));
    return t.filter((x) => x[key] === max).map((x) => x.positionId).sort().join('|');
  };
  return top('rawScore') !== top('weightedScore');
}
