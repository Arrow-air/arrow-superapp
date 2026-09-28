import { describe, expect, it } from 'vitest';
import { allocateRetro, proposerAward } from './retro';

const c = (positionId: string, authorId: string, score: number, system = 'avionics') => ({ positionId, threadId: 't-' + system, authorId, system, score });

describe('allocateRetro', () => {
  it('splits the pool by weighted net support and sums per author', () => {
    const a = allocateRetro({ amount: 1000 }, [c('p1', 'ann', 3), c('p2', 'bo', 1), c('p3', 'ann', 1)]);
    expect(a.lines.map((l) => [l.memberId, l.amount])).toEqual([['ann', 800], ['bo', 200]]);
    expect(a.unallocated).toBe(0);
  });

  it('ignores contributions with no positive support', () => {
    const a = allocateRetro({ amount: 100 }, [c('p1', 'ann', 2), c('p2', 'bo', 0), c('p3', 'cy', 0)]);
    expect(a.lines).toHaveLength(1);
    expect(a.lines[0].amount).toBe(100);
  });

  it('leaves the pool unallocated when nothing earned support', () => {
    const a = allocateRetro({ amount: 500 }, [c('p1', 'ann', 0)]);
    expect(a.lines).toEqual([]);
    expect(a.unallocated).toBe(500);
  });

  it('allocates whole tokens without losing any to rounding', () => {
    const a = allocateRetro({ amount: 100 }, [c('p1', 'ann', 1), c('p2', 'bo', 1), c('p3', 'cy', 1)]);
    expect(a.lines.reduce((s, l) => s + l.amount, 0)).toBe(100);
    expect(a.lines.every((l) => Number.isInteger(l.amount))).toBe(true);
  });

  it('keeps a system pre-split separate from the rest of the pool', () => {
    const a = allocateRetro({ amount: 1000, systemShares: { power: 0.5 } }, [c('p1', 'ann', 1, 'power'), c('p2', 'bo', 9, 'airframe')]);
    expect(Object.fromEntries(a.lines.map((l) => [l.memberId, l.amount]))).toEqual({ ann: 500, bo: 500 });
  });

  it('rolls an unused system share back into the general pool', () => {
    const a = allocateRetro({ amount: 1000, systemShares: { payload: 0.4 } }, [c('p1', 'ann', 1, 'airframe')]);
    expect(a.lines[0].amount).toBe(1000);
  });
});

describe('proposerAward', () => {
  it('is a floor of the share of the reward', () => {
    expect(proposerAward(4001, 0.25)).toBe(1000);
    expect(proposerAward(undefined, 0.25)).toBe(0);
  });
});
