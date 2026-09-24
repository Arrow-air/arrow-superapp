import { describe, expect, it } from 'vitest';
import { extractConstraints, grantMarkdown } from './grant';
import type { Grant, Member, Project } from './types';
import { DEFAULT_WEIGHTS } from './weights';

describe('extractConstraints', () => {
  it('keeps list items and lines with units or interfaces, cleaned and deduplicated', () => {
    const out = extractConstraints([
      '### Title line is skipped',
      '',
      '- **Tier 1:** regulated 12 V at 3 A',
      '- Keyed connector so tier 1 cannot be plugged into tier 2',
      'Prose about nothing measurable stays out.',
      'Mass should stay under 25 g for the whole board.',
      'Talk to the flight controller over DroneCAN.',
      '- tier 1: regulated 12 v at 3 a',
      '1. numbered items count too',
      '- short',
    ]);
    expect(out).toEqual([
      'Tier 1: regulated 12 V at 3 A',
      'Keyed connector so tier 1 cannot be plugged into tier 2',
      'Mass should stay under 25 g for the whole board.',
      'Talk to the flight controller over DroneCAN.',
      'numbered items count too',
    ]);
  });
  it('caps the list', () => {
    const many = Array.from({ length: 30 }, (_, i) => `- constraint number ${i} here`);
    expect(extractConstraints([many.join('\n')], 5)).toHaveLength(5);
  });
});

describe('grantMarkdown', () => {
  const members = new Map<string, Member>([
    ['auth', { id: 'auth', handle: 'jun', displayName: 'Jun', tokenBalance: 0, expertise: [] }],
    ['lead', { id: 'lead', handle: 'omar', displayName: 'Omar', tokenBalance: 0, expertise: [] }],
    ['rosa', { id: 'rosa', handle: 'rosa', displayName: 'Rosa', tokenBalance: 0, expertise: [] }],
  ]);
  const project: Project = { id: 'spearhead', name: 'Spearhead', weights: DEFAULT_WEIGHTS, systems: [], versions: [{ id: 'pt2', name: 'PT2', state: 'discussing', order: 2 }] };
  const grant: Grant = {
    id: 'g1',
    projectId: 'spearhead',
    versionId: 'pt2',
    threadId: 'n1',
    positionId: 'p1',
    title: 'Engine PCB',
    scope: '## The need\n\nAn engine board.',
    constraints: ['12 V at 3 A', 'one CAN bus'],
    proposerIds: ['auth'],
    contributorIds: ['rosa'],
    proposerShare: 0.25,
    overrideRationale: 'Connector supply.',
    weightedRankAtResolution: 2,
    rawRankAtResolution: 1,
    byMemberId: 'lead',
    createdAt: '',
    updatedAt: '',
    status: 'draft',
  };
  it('renders the grant with proposer award, constraints, attribution, and rationale', () => {
    const md = grantMarkdown({ grant, project, version: project.versions[0], members });
    expect(md).toContain('# Grant: Engine PCB');
    expect(md).toContain('**Project:** Spearhead · PT2');
    expect(md).toContain('**Proposed by:** @jun');
    expect(md).toContain('**Also contributed:** @rosa');
    expect(md).toContain('- 12 V at 3 A');
    expect(md).toContain('Proposer award: **25%** of the grant to @jun');
    expect(md).toContain('Why the lead chose this over the top-voted position');
    expect(md).toContain('Connector supply.');
  });
  it('omits sections that have nothing in them', () => {
    const md = grantMarkdown({ grant: { ...grant, constraints: [], contributorIds: [], overrideRationale: undefined }, project, members });
    expect(md).not.toContain('Interfaces and constraints');
    expect(md).not.toContain('Also contributed');
    expect(md).not.toContain('Why the lead chose');
  });
});
