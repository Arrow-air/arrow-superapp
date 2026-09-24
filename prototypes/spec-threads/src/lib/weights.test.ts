import { describe, expect, it } from 'vitest';
import type { Member, Thread, Position, Vote } from './types';
import {
  DEFAULT_WEIGHTS,
  matchedTags,
  tallyPositions,
  tokenTerm,
  voteWeight,
  weightingChangedWinner,
} from './weights';

const member = (over: Partial<Member> = {}): Member => ({
  id: 'm1',
  handle: 'm1',
  displayName: 'M One',
  tokenBalance: 0,
  expertise: [],
  ...over,
});

const thread = (over: Partial<Thread> = {}): Thread => ({
  id: 'n1',
  projectId: 'quiver',
  title: 't',
  body: 'b',
  tags: ['pcb', 'power'],
  authorId: 'm1',
  status: 'open',
  createdAt: '2026-09-18T00:00:00Z',
  ...over,
});

const position = (id: string): Position => ({
  id,
  threadId: 'n1',
  authorId: 'a',
  body: 'x',
  createdAt: '2026-09-18T00:00:00Z',
});

const vote = (positionId: string, memberId: string, value: 1 | -1): Vote => ({
  positionId,
  memberId,
  value,
  castAt: '2026-09-18T00:00:00Z',
});

describe('tokenTerm', () => {
  it('is zero for no tokens, negative, or junk', () => {
    expect(tokenTerm(0, DEFAULT_WEIGHTS)).toBe(0);
    expect(tokenTerm(-5, DEFAULT_WEIGHTS)).toBe(0);
    expect(tokenTerm(Number.NaN, DEFAULT_WEIGHTS)).toBe(0);
  });

  it('grows logarithmically so whales do not dominate', () => {
    const small = tokenTerm(9_000, DEFAULT_WEIGHTS); // log10(10) = 1
    const big = tokenTerm(999_000, DEFAULT_WEIGHTS); // log10(1000) = 3
    expect(small).toBe(1);
    expect(big).toBe(3);
    // 111x the tokens buys 3x the term
    expect(big / small).toBe(3);
  });

  it('is capped', () => {
    expect(tokenTerm(1e12, DEFAULT_WEIGHTS)).toBe(DEFAULT_WEIGHTS.tokenCap);
  });
});

describe('matchedTags', () => {
  it('matches case and whitespace insensitively', () => {
    expect(matchedTags(member({ expertise: [' PCB ', 'firmware'] }), thread())).toEqual(['pcb']);
  });
  it('returns nothing when there is no overlap', () => {
    expect(matchedTags(member({ expertise: ['design'] }), thread())).toEqual([]);
  });
});

describe('voteWeight', () => {
  it('a plain member with nothing gets the base weight', () => {
    const w = voteWeight({ member: member(), thread: thread(), role: 'member', isBuilder: false, cfg: DEFAULT_WEIGHTS });
    expect(w.total).toBe(1);
  });

  it('stacks token, expertise, and builder terms, then applies the role multiplier', () => {
    const w = voteWeight({
      member: member({ tokenBalance: 9_000, expertise: ['pcb'] }),
      thread: thread(),
      role: 'lead',
      isBuilder: true,
      cfg: DEFAULT_WEIGHTS,
    });
    expect(w).toMatchObject({ base: 1, token: 1, expertise: 1, builder: 1, roleMultiplier: 2, total: 8 });
  });

  it('expertise bonus is flat, not per matched tag', () => {
    const w = voteWeight({
      member: member({ expertise: ['pcb', 'power'] }),
      thread: thread(),
      role: 'member',
      isBuilder: false,
      cfg: DEFAULT_WEIGHTS,
    });
    expect(w.expertise).toBe(1);
    expect(w.matchedTags).toEqual(['pcb', 'power']);
  });
});

describe('tallyPositions', () => {
  it('computes raw and weighted scores and ranks', () => {
    const weights: Record<string, number> = { expert: 6, a: 1, b: 1, c: 1 };
    const tallies = tallyPositions({
      positions: [position('popular'), position('expert-pick')],
      votes: [
        vote('popular', 'a', 1),
        vote('popular', 'b', 1),
        vote('popular', 'c', 1),
        vote('expert-pick', 'expert', 1),
        vote('popular', 'expert', -1),
      ],
      weightFor: (id) => weights[id],
    });
    const popular = tallies.find((t) => t.positionId === 'popular')!;
    const expertPick = tallies.find((t) => t.positionId === 'expert-pick')!;
    expect(popular.rawScore).toBe(2);
    expect(popular.weightedScore).toBe(-3);
    expect(expertPick.rawScore).toBe(1);
    expect(expertPick.weightedScore).toBe(6);
    expect(popular.rawRank).toBe(1);
    expect(expertPick.weightedRank).toBe(1);
    expect(weightingChangedWinner(tallies)).toBe(true);
  });

  it('ties share a rank and the next rank skips', () => {
    const tallies = tallyPositions({
      positions: [position('x'), position('y'), position('z')],
      votes: [vote('x', 'a', 1), vote('y', 'b', 1)],
      weightFor: () => 1,
    });
    const rank = (id: string) => tallies.find((t) => t.positionId === id)!.rawRank;
    expect(rank('x')).toBe(1);
    expect(rank('y')).toBe(1);
    expect(rank('z')).toBe(3);
  });

  it('reports no change when weighting agrees with the crowd', () => {
    const tallies = tallyPositions({
      positions: [position('x'), position('y')],
      votes: [vote('x', 'a', 1), vote('x', 'b', 1)],
      weightFor: () => 2,
    });
    expect(weightingChangedWinner(tallies)).toBe(false);
  });

  it('handles positions with no votes', () => {
    const tallies = tallyPositions({ positions: [position('x')], votes: [], weightFor: () => 1 });
    expect(tallies[0]).toMatchObject({ rawScore: 0, weightedScore: 0, voters: 0, rawRank: 1 });
    expect(weightingChangedWinner(tallies)).toBe(false);
  });
});
