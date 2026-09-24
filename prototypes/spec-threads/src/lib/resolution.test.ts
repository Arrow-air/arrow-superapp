import { describe, expect, it } from 'vitest';
import type { Comment, Position, PositionTally, Project, Thread } from './types';
import { DEFAULT_WEIGHTS } from './weights';
import {
  MIN_RATIONALE_LENGTH,
  ResolutionError,
  canResolve,
  choosePosition,
  deferThread,
  needsRationale,
  promoteToGrant,
  promoteToSpec,
  rejectThread,
} from './resolution';

const project: Project = {
  id: 'spearhead',
  name: 'Spearhead',
  weights: DEFAULT_WEIGHTS,
  systems: ['propulsion'],
  versions: [
    { id: 'pt1', name: 'PT1', state: 'building', order: 1 },
    { id: 'pt2', name: 'PT2', state: 'discussing', order: 2 },
    { id: 'pt3', name: 'PT3', state: 'planned', order: 3 },
  ],
};

const thread: Thread = {
  id: 'n1',
  projectId: 'spearhead',
  versionId: 'pt2',
  system: 'propulsion',
  title: 'Engine PCB',
  body: 'What does it carry?',
  tags: ['pcb'],
  authorId: 'lead',
  status: 'open',
  createdAt: '2026-09-18T00:00:00Z',
  deferrals: [],
};

const position = (id: string, body = `### Position ${id}\n\n- 12 V at 3 A\n- one CAN bus`): Position => ({
  id,
  threadId: 'n1',
  authorId: 'auth',
  body,
  createdAt: '2026-09-18T00:00:00Z',
});

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
const base = { thread, leadId: 'lead', leadRole: 'lead' as const, tallies, now };
const rationale = 'The top position needs a connector we cannot source in volume.';

describe('canResolve / needsRationale', () => {
  it('only leads resolve', () => {
    expect(canResolve('lead')).toBe(true);
    expect(canResolve('core')).toBe(false);
    expect(canResolve(undefined)).toBe(false);
  });
  it('no rationale for the weighted top, yes for anything else', () => {
    expect(needsRationale('top', tallies)).toBe(false);
    expect(needsRationale('second', tallies)).toBe(true);
    expect(needsRationale('unknown', tallies)).toBe(true);
  });
});

describe('choosePosition', () => {
  it('records both ranks and drops an unneeded rationale', () => {
    const c = choosePosition({ thread, position: position('top'), tallies, overrideRationale: 'irrelevant but long enough text' });
    expect(c).toEqual({ positionId: 'top', weightedRankAtResolution: 1, rawRankAtResolution: 2, overrideRationale: undefined });
  });
  it('refuses a non-top position without a real rationale', () => {
    expect(() => choosePosition({ thread, position: position('second'), tallies })).toThrow(ResolutionError);
    expect(() => choosePosition({ thread, position: position('second'), tallies, overrideRationale: 'because' })).toThrow(/at least/);
  });
  it('refuses a position from another thread', () => {
    expect(() => choosePosition({ thread, position: { ...position('top'), threadId: 'other' }, tallies })).toThrow(/belong/);
  });
});

describe('rejectThread', () => {
  it('requires a lead, an open thread, and a note', () => {
    expect(() => rejectThread({ ...base, leadRole: 'core', note: rationale })).toThrow(/Only the project lead/);
    expect(() => rejectThread({ ...base, thread: { ...thread, status: 'resolved' }, note: rationale })).toThrow(/already/);
    expect(() => rejectThread({ ...base, note: 'nope' })).toThrow(new RegExp(String(MIN_RATIONALE_LENGTH)));
    expect(rejectThread({ ...base, note: `  ${rationale}  ` })).toEqual({ kind: 'reject', note: rationale, byMemberId: 'lead', at: now.toISOString() });
  });
});

describe('promoteToSpec', () => {
  it('writes a decision to the register with the chosen position title', () => {
    const { resolution, decision } = promoteToSpec({ ...base, position: position('top'), decisionId: 'd1' });
    expect(resolution).toMatchObject({ kind: 'spec', decisionId: 'd1', positionId: 'top', weightedRankAtResolution: 1 });
    expect(decision).toMatchObject({
      id: 'd1',
      projectId: 'spearhead',
      versionId: 'pt2',
      threadId: 'n1',
      question: 'Engine PCB',
      chosen: 'Position top',
      rationale: undefined,
      status: 'decided',
    });
  });
  it('keeps the override rationale on the decision', () => {
    const { decision } = promoteToSpec({ ...base, position: position('second'), overrideRationale: rationale, decisionId: 'd2' });
    expect(decision.rationale).toBe(rationale);
    expect(decision.weightedRankAtDecision).toBe(2);
  });
});

describe('promoteToGrant', () => {
  const comments: Comment[] = [
    { id: 'c1', positionId: 'top', authorId: 'rosa', body: 'Add a kill input from the RC link, 5 V logic.', createdAt: '' },
    { id: 'c2', positionId: 'top', authorId: 'auth', body: 'Agreed.', createdAt: '' },
  ];
  it('drafts a grant from the thread with proposer, contributors, constraints, and the default share', () => {
    const { resolution, grant } = promoteToGrant({ ...base, position: position('top'), comments, grantId: 'g1' });
    expect(resolution).toMatchObject({ kind: 'grant', grantId: 'g1', positionId: 'top' });
    expect(grant.title).toBe('Engine PCB');
    expect(grant.proposerIds).toEqual(['auth']);
    expect(grant.contributorIds).toEqual(['rosa']);
    expect(grant.proposerShare).toBe(0.25);
    expect(grant.status).toBe('draft');
    expect(grant.constraints).toEqual(['12 V at 3 A', 'one CAN bus', 'Add a kill input from the RC link, 5 V logic.']);
    expect(grant.scope).toContain('## The need');
    expect(grant.scope).toContain('## The spec');
  });
  it('validates the proposer share', () => {
    expect(() => promoteToGrant({ ...base, position: position('top'), comments: [], grantId: 'g', proposerShare: 1.5 })).toThrow(/between 0 and 1/);
    expect(promoteToGrant({ ...base, position: position('top'), comments: [], grantId: 'g', proposerShare: 0.5 }).grant.proposerShare).toBe(0.5);
  });
});

describe('deferThread', () => {
  it('only to a later, unfrozen version', () => {
    expect(deferThread({ ...base, project, toVersionId: 'pt3', note: ' ' })).toEqual({
      fromVersionId: 'pt2',
      toVersionId: 'pt3',
      byMemberId: 'lead',
      at: now.toISOString(),
      note: undefined,
    });
    expect(() => deferThread({ ...base, project, toVersionId: 'pt1' })).toThrow(/later version/);
    expect(() => deferThread({ ...base, project, toVersionId: 'pt2' })).toThrow(/later version/);
    expect(() => deferThread({ ...base, project, toVersionId: 'nope' })).toThrow(/later version/);
    expect(() => deferThread({ ...base, project, leadRole: 'member', toVersionId: 'pt3' })).toThrow(/Only the project lead/);
  });
});
