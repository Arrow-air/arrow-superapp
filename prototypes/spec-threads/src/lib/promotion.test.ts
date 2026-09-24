import { describe, expect, it } from 'vitest';
import type { Member, Thread, Position, PositionTally } from './types';
import { PromotionError, canPromote, needsRationale, promote } from './promotion';

const lead: Member = { id: 'lead', handle: 'lead', displayName: 'Lead', tokenBalance: 0, expertise: [] };
const author: Member = { id: 'auth', handle: 'auth', displayName: 'Author', tokenBalance: 0, expertise: [] };

const thread: Thread = {
  id: 'n1',
  projectId: 'quiver',
  title: 'Attachment power budget',
  body: 'How much power?',
  tags: ['power'],
  authorId: 'lead',
  status: 'open',
  createdAt: '2026-09-18T00:00:00Z',
};

const position = (id: string): Position => ({ id, threadId: 'n1', authorId: 'auth', body: `position ${id}`, createdAt: '2026-09-18T00:00:00Z' });

const tally = (positionId: string, weightedRank: number, rawRank: number): PositionTally => ({
  positionId,
  rawUp: 0,
  rawDown: 0,
  rawScore: 0,
  weightedUp: 0,
  weightedDown: 0,
  weightedScore: 0,
  voters: 0,
  rawRank,
  weightedRank,
});

const tallies = [tally('top', 1, 2), tally('second', 2, 1)];
const now = new Date('2026-09-18T12:00:00Z');

describe('canPromote', () => {
  it('only leads', () => {
    expect(canPromote('lead')).toBe(true);
    expect(canPromote('core')).toBe(false);
    expect(canPromote('member')).toBe(false);
    expect(canPromote(undefined)).toBe(false);
  });
});

describe('needsRationale', () => {
  it('not for the weighted top position, yes for anything else', () => {
    expect(needsRationale('top', tallies)).toBe(false);
    expect(needsRationale('second', tallies)).toBe(true);
    expect(needsRationale('unknown', tallies)).toBe(true);
  });
});

describe('promote', () => {
  it('promotes the top position without a rationale and records both ranks', () => {
    const p = promote({ thread, position: position('top'), positionAuthor: author, lead, leadRole: 'lead', tallies, now });
    expect(p).toMatchObject({
      positionId: 'top',
      byMemberId: 'lead',
      weightedRankAtPromotion: 1,
      rawRankAtPromotion: 2,
      overrideRationale: undefined,
      at: '2026-09-18T12:00:00.000Z',
    });
    expect(p.bountyMarkdown).toContain('# Bounty: Attachment power budget');
    expect(p.bountyMarkdown).toContain('@auth');
    expect(p.bountyMarkdown).not.toContain('Why the lead chose');
  });

  it('refuses a non-top position without a real rationale', () => {
    const args = { thread, position: position('second'), positionAuthor: author, lead, leadRole: 'lead' as const, tallies, now };
    expect(() => promote(args)).toThrow(PromotionError);
    expect(() => promote({ ...args, overrideRationale: 'because' })).toThrow(/at least/);
  });

  it('accepts a non-top position with a rationale and puts it in the bounty', () => {
    const p = promote({
      thread,
      position: position('second'),
      positionAuthor: author,
      lead,
      leadRole: 'lead',
      tallies,
      overrideRationale: 'The top position needs a connector we cannot source in volume.',
      now,
    });
    expect(p.weightedRankAtPromotion).toBe(2);
    expect(p.overrideRationale).toContain('connector');
    expect(p.bountyMarkdown).toContain('Why the lead chose');
  });

  it('drops a rationale that was not needed', () => {
    const p = promote({
      thread,
      position: position('top'),
      positionAuthor: author,
      lead,
      leadRole: 'lead',
      tallies,
      overrideRationale: 'Some text that is long enough but irrelevant.',
      now,
    });
    expect(p.overrideRationale).toBeUndefined();
  });

  it('refuses non-leads, closed threads, and foreign positions', () => {
    const base = { thread, position: position('top'), positionAuthor: author, lead, tallies, now };
    expect(() => promote({ ...base, leadRole: 'core' })).toThrow(/Only the project lead/);
    expect(() => promote({ ...base, leadRole: 'lead', thread: { ...thread, status: 'bounty' } })).toThrow(/already/);
    expect(() => promote({ ...base, leadRole: 'lead', position: { ...position('top'), threadId: 'other' } })).toThrow(/belong/);
  });
});
