import { beforeEach, describe, expect, it } from 'vitest';
import { DemoBackend } from './demoBackend';
import { approveEngineBrief, briefAction } from './briefTestSupport';
import { briefApproved, discussionSources, unreviewedSources } from '../lib/brief';
import { grantMarkdown } from '../lib/grant';
import { seedState } from './seed';

describe('source-linked brief to specification and grant', () => {
  let b: DemoBackend;
  beforeEach(() => { b = new DemoBackend(); });
  const grant = () => b.resolveThread({ threadId: 'n-engine', kind: 'grant', positionId: 's-ecu' });
  it('never treats seeded proposals or a top ballot as an approved grant scope', async () => {
    await expect(grant()).rejects.toThrow(/Resolve 5/);
    expect(await b.listGrants()).toHaveLength(0);
    expect((await b.getBundle('n-engine'))!.thread.status).toBe('open');
  });
  it('members can propose from another approach but cannot accept, approve, or review sources', async () => {
    await b.actAs('m-ade');
    await briefAction(b, { kind: 'item', itemKind: 'requirement', text: 'Keep the kill path independent.', verification: '', sourceKeys: ['position:s-kill'] });
    expect((await b.getBundle('n-engine'))!.brief!.items.at(-1)).toMatchObject({ authorId: 'm-ade', status: 'proposed' });
    for (const action of [{ kind: 'approve' }, { kind: 'review', sourceKey: 'position:s-kill' }, { kind: 'decide', id: 'bi-kill', status: 'accepted', rationale: '' }] as const) {
      await expect(briefAction(b, action)).rejects.toThrow(/Only the project lead/);
    }
  });
  it('rejects unknown, foreign, empty sources and empty wording without saving a partial mutation', async () => {
    const before = (await b.getBundle('n-engine'))!.brief;
    for (const sourceKeys of [[], ['position:s-can'], ['position:nope']]) {
      await expect(briefAction(b, { kind: 'item', itemKind: 'requirement', text: 'Valid wording', verification: '', sourceKeys })).rejects.toThrow(/source/i);
    }
    await expect(briefAction(b, { kind: 'item', itemKind: 'requirement', text: ' ', verification: '', sourceKeys: ['position:s-kill'] })).rejects.toThrow(/Write/);
    expect((await b.getBundle('n-engine'))!.brief).toEqual(before);
  });
  it('requires an answer or exclusion rationale, and acceptance checks on deliverables', async () => {
    await expect(briefAction(b, { kind: 'decide', id: 'bi-voltage', status: 'accepted', rationale: '' })).rejects.toThrow(/answer/);
    await expect(briefAction(b, { kind: 'decide', id: 'bi-can', status: 'dismissed', rationale: '' })).rejects.toThrow(/reason/);
    await briefAction(b, { kind: 'item', id: 'bi-bench', itemKind: 'deliverable', text: 'Design a board.', verification: '', sourceKeys: ['thread:n-engine'] });
    await expect(briefAction(b, { kind: 'decide', id: 'bi-bench', status: 'accepted', rationale: '' })).rejects.toThrow(/acceptance check/);
  });
  it('requires consideration of every alternative and reply before approval', async () => {
    for (const i of (await b.getBundle('n-engine'))!.brief!.items) await briefAction(b, { kind: 'decide', id: i.id, status: 'accepted', rationale: 'Illustrative reviewer answer.' });
    await expect(briefAction(b, { kind: 'approve' })).rejects.toThrow(/Review 7 discussion sources/);
  });
  it('new discussion stales approval without erasing accepted requirements; votes do not', async () => {
    await approveEngineBrief(b);
    await b.castVote({ positionId: 's-ots', value: -1 });
    expect(briefApproved((await b.getBundle('n-engine'))!)).toBe(true);
    await b.addComment({ positionId: 's-ots', body: 'A new competing ECU now exposes temperature on CAN.' });
    expect(briefApproved((await b.getBundle('n-engine'))!)).toBe(false);
    expect(unreviewedSources((await b.getBundle('n-engine'))!)).toHaveLength(1);
    await expect(grant()).rejects.toThrow(/Review 1 discussion source/);
    const source = unreviewedSources((await b.getBundle('n-engine'))!)[0];
    await briefAction(b, { kind: 'review', sourceKey: source.key });
    await briefAction(b, { kind: 'approve' });
    expect(briefApproved((await b.getBundle('n-engine'))!)).toBe(true);
  });
  it('editing an accepted requirement makes it proposed again and preserves its earlier revision', async () => {
    await approveEngineBrief(b);
    await briefAction(b, { kind: 'item', id: 'bi-kill', itemKind: 'requirement', text: 'Revised kill path.', verification: '', sourceKeys: ['position:s-kill'] });
    const bundle = (await b.getBundle('n-engine'))!;
    expect(bundle.brief!.items.find(i => i.id === 'bi-kill')!.status).toBe('proposed');
    expect(briefApproved(bundle)).toBe(false);
    expect(bundle.brief!.history.at(-2)!.content.items.find(i => i.id === 'bi-kill')!.text).toContain('hardware engine-kill');
  });
  it('preserves cross-approach requirements, attribution, answered questions and immutable provenance in grants', async () => {
    await approveEngineBrief(b);
    await grant();
    const g = (await b.listGrants())[0];
    expect(g.constraints.join(' ')).toContain('hardware engine-kill');
    expect(g.constraints.join(' ')).toContain('DroneCAN');
    expect(g.constraints.join(' ')).not.toContain('25 g');
    expect(g.scope).toContain('Deliverables and acceptance checks');
    expect(g.scope).toContain('Resolved questions');
    expect(g.scope).toContain('position%3As-kill');
    expect(g.contributorIds).toContain('m-rosa');
    const snap = structuredClone(g.briefSnapshot);
    await b.updateGrant({ id: g.id, scope: 'Edited after approval.', constraints: ['changed'] });
    expect((await b.getGrant(g.id))!.briefSnapshot).toEqual(snap);
    await expect(b.addComment({ positionId: 's-ecu', body: 'late change' })).rejects.toThrow(/closed/);
    await expect(briefAction(b, { kind: 'purpose', text: 'late change' })).rejects.toThrow(/closed/);
  });
  it('carries exclusion reasons into scope but never into accepted requirements', async () => {
    await approveEngineBrief(b);
    await briefAction(b, { kind: 'decide', id: 'bi-kill', status: 'dismissed', rationale: 'Excluded solely for this test fixture.' });
    await briefAction(b, { kind: 'approve' });
    await grant();
    const g = (await b.listGrants())[0];
    expect(g.constraints.join(' ')).not.toContain('hardware engine-kill');
    expect(g.scope).toContain('Excluded solely for this test fixture.');
  });
  it('grants still need deliverables even when a requirement-only brief is approved', async () => {
    await approveEngineBrief(b);
    await briefAction(b, { kind: 'decide', id: 'bi-bench', status: 'dismissed', rationale: 'Requirements only; no implementation scope yet.' });
    await briefAction(b, { kind: 'approve' });
    await expect(grant()).rejects.toThrow(/deliverable/);
    await b.resolveThread({ threadId: 'n-engine', kind: 'spec', positionId: 's-ecu' });
    expect((await b.listDecisions())[0].briefSnapshot?.items).toBeDefined();
  });
  it('deferral retains the brief but requires approval for the new target version', async () => {
    await approveEngineBrief(b);
    await b.resolveThread({ threadId: 'n-engine', kind: 'defer', toVersionId: 'sh-pt3' });
    expect(briefApproved((await b.getBundle('n-engine'))!)).toBe(false);
    await expect(grant()).rejects.toThrow(/approve/);
  });
  it('detects stale form revisions and prevents a contributor editing someone else’s proposal', async () => {
    await expect(b.changeBrief({ threadId: 'n-engine', expectedRevision: 0, action: { kind: 'purpose', text: 'overwrite' } })).rejects.toThrow(/brief changed/);
    await b.actAs('m-ade');
    await expect(briefAction(b, { kind: 'item', id: 'bi-kill', itemKind: 'requirement', text: 'overwrite', verification: '', sourceKeys: ['position:s-kill'] })).rejects.toThrow(/Only the lead/);
  });
  it('migrates existing browser data without resetting or inserting approved briefs', async () => {
    const old = seedState();
    delete (old as Partial<typeof old>).briefs;
    let saved = JSON.stringify(old);
    const storage = { getItem: () => saved, setItem: (_k: string, v: string) => { saved = v; }, removeItem: () => {} };
    b = new DemoBackend(storage);
    expect((await b.getBundle('n-engine'))!.brief).toBeUndefined();
    await briefAction(b, { kind: 'purpose', text: 'An actual new scope.' });
    b = new DemoBackend(storage);
    expect((await b.getBundle('n-engine'))!.brief!.purpose).toBe('An actual new scope.');
    expect((await b.listDecisions()).length).toBe(1);
  });
  it('does not approve or promote a stale brief from another tab', async () => {
    let saved: string | null = null;
    const storage = { getItem: () => saved, setItem: (_k: string, v: string) => { saved = v; }, removeItem: () => { saved = null; } };
    b = new DemoBackend(storage);
    await approveEngineBrief(b);
    const other = new DemoBackend(storage);
    const rev = (await b.getBundle('n-engine'))!.brief!.revision;
    await briefAction(other, { kind: 'purpose', text: 'A changed outcome from another tab.' });
    await expect(b.changeBrief({ threadId: 'n-engine', expectedRevision: rev, action: { kind: 'approve' } })).rejects.toThrow(/brief changed/);
    await briefAction(other, { kind: 'approve' });
    await other.addComment({ positionId: 's-ots', body: 'A newly discovered constraint.' });
    await expect(grant()).rejects.toThrow(/Review 1 discussion source/);
  });
  it('exports real deliverables, never a fill-in placeholder for brief-backed grants', async () => {
    await approveEngineBrief(b); await grant();
    const g = (await b.listGrants())[0];
    const md = grantMarkdown({ grant: g, project: (await b.listProjects())[0], members: new Map((await b.listMembers()).map(m => [m.id, m])) });
    expect(md).toContain('Acceptance check:');
    expect(md).not.toContain('Fill in from the spec');
    expect(md.match(/Provide a hardware engine-kill input/g)).toHaveLength(1);
    expect(discussionSources((await b.getBundle('n-engine'))!)).toHaveLength(7);
  });
});
