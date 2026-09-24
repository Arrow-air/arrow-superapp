// Vote weighting and tallying. Pure functions, no I/O, so the rules are testable
// and anyone can read exactly how a vote's weight was computed.
//
// weight = (base + token + expertise + builder) * roleMultiplier
//
// The call on 2026-09-17 named four things that should make a voice count for more:
// token holdings, project role, domain expertise, and intent to actually build it.
// Each is one term below. See ideas/weighted-voting.md.

import type {
  Member,
  Thread,
  Role,
  Position,
  PositionTally,
  Vote,
  WeightBreakdown,
  WeightConfig,
} from './types';

export const DEFAULT_WEIGHTS: WeightConfig = {
  base: 1,
  tokenFactor: 1,
  tokenScale: 1000,
  tokenCap: 3,
  expertiseBonus: 1,
  builderBonus: 1,
  roleMultiplier: { lead: 2, core: 1.5, member: 1 },
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function tokenTerm(balance: number, cfg: WeightConfig): number {
  if (!Number.isFinite(balance) || balance <= 0) return 0;
  const raw = cfg.tokenFactor * Math.log10(1 + balance / cfg.tokenScale);
  return round2(Math.min(cfg.tokenCap, raw));
}

export function matchedTags(member: Member, thread: Thread): string[] {
  const have = new Set(member.expertise.map((t) => t.trim().toLowerCase()));
  return thread.tags.map((t) => t.trim().toLowerCase()).filter((t) => have.has(t));
}

export function voteWeight(args: {
  member: Member;
  thread: Thread;
  role: Role;
  isBuilder: boolean;
  cfg: WeightConfig;
}): WeightBreakdown {
  const { member, thread, role, isBuilder, cfg } = args;
  const matched = matchedTags(member, thread);
  const base = cfg.base;
  const token = tokenTerm(member.tokenBalance, cfg);
  const expertise = matched.length > 0 ? cfg.expertiseBonus : 0;
  const builder = isBuilder ? cfg.builderBonus : 0;
  const mult = cfg.roleMultiplier[role];
  return {
    base,
    token,
    expertise,
    builder,
    roleMultiplier: mult,
    role,
    total: round2((base + token + expertise + builder) * mult),
    matchedTags: matched,
  };
}

/** Dense-free competition ranking: ties share a rank, next rank skips (1, 1, 3). */
function rankBy<T>(items: T[], score: (t: T) => number): Map<T, number> {
  const sorted = [...items].sort((a, b) => score(b) - score(a));
  const ranks = new Map<T, number>();
  sorted.forEach((item, i) => {
    if (i > 0 && score(item) === score(sorted[i - 1])) {
      ranks.set(item, ranks.get(sorted[i - 1])!);
    } else {
      ranks.set(item, i + 1);
    }
  });
  return ranks;
}

export function tallyPositions(args: {
  positions: Position[];
  votes: Vote[];
  weightFor: (memberId: string) => number;
}): PositionTally[] {
  const { positions, votes, weightFor } = args;
  const partial = positions.map((position) => {
    const mine = votes.filter((v) => v.positionId === position.id);
    let rawUp = 0;
    let rawDown = 0;
    let weightedUp = 0;
    let weightedDown = 0;
    for (const v of mine) {
      const w = weightFor(v.memberId);
      if (v.value === 1) {
        rawUp += 1;
        weightedUp += w;
      } else {
        rawDown += 1;
        weightedDown += w;
      }
    }
    return {
      positionId: position.id,
      rawUp,
      rawDown,
      rawScore: rawUp - rawDown,
      weightedUp: round2(weightedUp),
      weightedDown: round2(weightedDown),
      weightedScore: round2(weightedUp - weightedDown),
      voters: mine.length,
    };
  });
  const rawRanks = rankBy(partial, (t) => t.rawScore);
  const weightedRanks = rankBy(partial, (t) => t.weightedScore);
  return partial.map((t) => ({
    ...t,
    rawRank: rawRanks.get(t)!,
    weightedRank: weightedRanks.get(t)!,
  }));
}

/** True when weighting changed which position is on top. This is the experiment's headline number. */
export function weightingChangedWinner(tallies: PositionTally[]): boolean {
  if (tallies.length < 2) return false;
  const rawTop = tallies.filter((t) => t.rawRank === 1).map((t) => t.positionId).sort();
  const weightedTop = tallies.filter((t) => t.weightedRank === 1).map((t) => t.positionId).sort();
  return rawTop.join('|') !== weightedTop.join('|');
}
