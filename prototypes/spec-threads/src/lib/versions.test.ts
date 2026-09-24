import { describe, expect, it } from 'vitest';
import type { Project, Thread } from './types';
import { DEFAULT_WEIGHTS } from './weights';
import { FreezeError, buildingVersion, deferTargets, discussingVersion, freezeCheck, freezeVersions } from './versions';

const project: Project = {
  id: 'spearhead',
  name: 'Spearhead',
  weights: DEFAULT_WEIGHTS,
  systems: [],
  versions: [
    { id: 'pt3', name: 'PT3', state: 'planned', order: 3 },
    { id: 'pt1', name: 'PT1', state: 'building', order: 1 },
    { id: 'pt2', name: 'PT2', state: 'discussing', order: 2 },
    { id: 'pt4', name: 'PT4', state: 'planned', order: 4 },
  ],
};

const thread = (id: string, versionId: string, status: Thread['status'] = 'open', deferrals: Thread['deferrals'] = []): Thread => ({
  id,
  projectId: 'spearhead',
  versionId,
  title: id,
  body: '',
  tags: [],
  authorId: 'x',
  status,
  createdAt: '',
  deferrals,
});

describe('version lookups', () => {
  it('finds the building and discussing versions regardless of array order', () => {
    expect(buildingVersion(project)?.id).toBe('pt1');
    expect(discussingVersion(project)?.id).toBe('pt2');
  });
  it('defer targets are later and not frozen or built', () => {
    expect(deferTargets(project, 'pt2').map((v) => v.id)).toEqual(['pt3', 'pt4']);
    expect(deferTargets(project, 'pt4')).toEqual([]);
    expect(deferTargets(project, 'nope')).toEqual([]);
  });
});

describe('freezeCheck', () => {
  const threads = [
    thread('a', 'pt2'),
    thread('b', 'pt2', 'resolved'),
    thread('c', 'pt3', 'open', [{ fromVersionId: 'pt2', toVersionId: 'pt3', byMemberId: 'lead', at: '' }]),
    { ...thread('d', 'pt2'), projectId: 'other' },
  ];
  it('counts open, resolved, and deferred-away threads for this project only', () => {
    const c = freezeCheck(project, 'pt2', threads);
    expect(c.open.map((t) => t.id)).toEqual(['a']);
    expect(c.resolved.map((t) => t.id)).toEqual(['b']);
    expect(c.deferredAway.map((t) => t.id)).toEqual(['c']);
    expect(c.canFreeze).toBe(false);
  });
  it('can freeze once nothing is open, and never a version that is not in discussion', () => {
    expect(freezeCheck(project, 'pt2', threads.filter((t) => t.id !== 'a')).canFreeze).toBe(true);
    expect(freezeCheck(project, 'pt3', []).canFreeze).toBe(false);
    expect(() => freezeCheck(project, 'nope', [])).toThrow(FreezeError);
  });
});

describe('freezeVersions', () => {
  it('freezes the target and opens the next planned version for discussion', () => {
    const now = new Date('2026-11-15T00:00:00Z');
    const versions = freezeVersions({ project, versionId: 'pt2', byMemberId: 'lead', now });
    const by = (id: string) => versions.find((v) => v.id === id)!;
    expect(by('pt2')).toMatchObject({ state: 'frozen', frozenAt: now.toISOString(), frozenBy: 'lead' });
    expect(by('pt3').state).toBe('discussing');
    expect(by('pt4').state).toBe('planned');
    expect(by('pt1').state).toBe('building');
    expect(project.versions.find((v) => v.id === 'pt2')!.state).toBe('discussing'); // pure: input untouched
  });
  it('refuses a version that is not in discussion', () => {
    expect(() => freezeVersions({ project, versionId: 'pt1', byMemberId: 'lead' })).toThrow(/not in discussion/);
    expect(() => freezeVersions({ project, versionId: 'nope', byMemberId: 'lead' })).toThrow(FreezeError);
  });
});
