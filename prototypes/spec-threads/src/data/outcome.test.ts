import { beforeEach, describe, expect, it } from 'vitest';
import { DemoBackend } from './demoBackend';
import { corpusKey } from '../lib/brief';
import { startingOutcome } from '../lib/outcome';
import { analyzeThread } from '../lib/analyze';
import type { WorkInput } from '../lib/types';
const work: WorkInput = { kind: 'bounty', purpose: 'implementation', title: 'PCB design', scope: 'Produce a schematic and interface definition.', acceptance: 'Demonstrate independent shutdown and telemetry on a bench.' };
function storage() { const map = new Map<string, string>(); return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); } }; }
describe('conversation → draft → independent outcomes', () => {
  let b: DemoBackend;
  beforeEach(() => { b = new DemoBackend(storage()); });
  async function draft(openQuestions = '', id = 'n-engine') { return b.saveOutcome({ threadId: id, expectedRevision: (await b.getBundle(id))?.draft?.revision ?? 0, body: 'Use DroneCAN telemetry and an independent hardware kill path. Sources: Jun and Rosa.', openQuestions }); }
  async function conclude(adopt = false, w?: WorkInput, id = 'n-engine') { const bundle = (await b.getBundle(id))!; return b.concludeThread({ threadId: id, expectedRevision: bundle.draft!.revision, expectedCorpus: corpusKey(bundle), adopt, work: w }); }
  it('preserves cross-approach starting material without item approvals', async () => {
    const content = startingOutcome((await b.getBundle('n-engine'))!);
    expect(content.body).toContain('DroneCAN'); expect(content.body).toContain('hardware engine-kill');
    expect(content.body).toContain('source=position%3As-kill'); expect(content.openQuestions).toContain('voltage');
  });
  it('retains exclusions and answers when converting an older brief', async () => {
    const bundle = (await b.getBundle('n-engine'))!;
    bundle.brief!.items[0].status = 'dismissed'; bundle.brief!.items[0].rationale = 'Superseded by another interface.';
    const question = bundle.brief!.items.find(i => i.kind === 'question')!;
    question.status = 'accepted'; question.rationale = 'Bench scope only; qualify the aircraft separately.';
    const content = startingOutcome(bundle);
    expect(content.body).toContain('Considered but not included'); expect(content.body).toContain('Superseded by another interface.');
    expect(content.body).toContain('Resolved questions'); expect(content.openQuestions).toBe('');
  });
  it('contributors can author one draft, others discuss it, and only the lead concludes', async () => {
    await b.actAs('m-ade'); await draft();
    await expect(conclude()).rejects.toThrow('Only the project lead');
    await b.actAs('m-jun'); await expect(draft()).rejects.toThrow('Only the project lead');
    await b.createPosition({ threadId: 'n-engine', body: 'Feedback on draft r1: preserve the independent path.' });
    await b.actAs('m-omar'); await draft(); await conclude();
    expect((await b.getBundle('n-engine'))!.draft!.history).toHaveLength(2);
  });
  it('records an answer without creating either a specification or work', async () => {
    await draft(); await conclude();
    expect((await b.listDecisions()).filter(d => d.threadId === 'n-engine')).toHaveLength(0);
    expect(await b.listGrants()).toHaveLength(0);
    expect((await b.getBundle('n-engine'))!.thread.status).toBe('resolved');
  });
  it('adopts design without forcing a grant or choosing a winning contribution', async () => {
    await draft(); await conclude(true);
    expect((await b.listDecisions()).find(d => d.threadId === 'n-engine')!.outcomeSnapshot!.body).toContain('Jun and Rosa');
    expect(await b.listGrants()).toHaveLength(0);
    const bundle = (await b.getBundle('n-engine'))!;
    expect(analyzeThread({ bundle, members: await b.listMembers(), roles: await b.listRoles(), project: (await b.listProjects())[0] }).leadFollowedWeighted).toBeNull();
  });
  it('creates work without implying design adoption', async () => {
    await draft(); await conclude(false, work);
    const g = (await b.listGrants())[0]; expect(g.workKind).toBe('bounty'); expect(g.decisionIds).toEqual([]);
    expect((await b.listDecisions()).filter(d => d.threadId === 'n-engine')).toHaveLength(0);
  });
  it('adopts a design and creates linked work in the same review', async () => {
    await draft(); await conclude(true, work);
    const d = (await b.listDecisions()).find(d => d.threadId === 'n-engine')!;
    const g = (await b.listGrants())[0]; expect(g.decisionIds).toEqual([d.id]);
    expect(g.outcomeSnapshot).toEqual(d.outcomeSnapshot); expect(g.scope).toContain(work.acceptance);
  });
  it('permits research with unanswered questions but does not adopt an uncertain design', async () => {
    await draft('Measure the actual voltage envelope.');
    await expect(conclude(true)).rejects.toThrow('Resolve the open questions');
    await expect(conclude(false, work)).rejects.toThrow('Resolve open questions');
    await conclude(false, { ...work, purpose: 'research', title: 'Measure supply transients' });
    expect((await b.listGrants())[0].outcomeSnapshot!.openQuestions).toContain('voltage');
    expect((await b.listDecisions()).filter(d => d.threadId === 'n-engine')).toHaveLength(0);
  });
  it('creates neither output when work validation fails', async () => {
    await draft(); await expect(conclude(true, { ...work, acceptance: '' })).rejects.toThrow('acceptance');
    expect((await b.getBundle('n-engine'))!.thread.status).toBe('open');
    expect((await b.listDecisions()).filter(d => d.threadId === 'n-engine')).toHaveLength(0);
  });
  it('rejects a stale document revision and stale discussion at review', async () => {
    const d = await draft(); const bundle = (await b.getBundle('n-engine'))!;
    await b.addComment({ positionId: 's-kill', body: 'New concern: controller loss.' });
    await expect(b.concludeThread({ threadId: 'n-engine', expectedRevision: d.revision, expectedCorpus: corpusKey(bundle), adopt: true })).rejects.toThrow('New discussion');
    await draft(); await expect(b.saveOutcome({ threadId: 'n-engine', expectedRevision: d.revision, body: 'stale', openQuestions: '' })).rejects.toThrow('draft changed');
  });
  it('re-reads storage so a second tab cannot overwrite newer draft text', async () => {
    const shared = storage(); b = new DemoBackend(shared); const other = new DemoBackend(shared);
    await draft(); await expect(other.saveOutcome({ threadId: 'n-engine', expectedRevision: 0, body: 'stale other tab', openQuestions: '' })).rejects.toThrow('draft changed');
  });
  it('supports later and multiple work packages without modifying the adopted document', async () => {
    await draft(); await conclude(true); const original = (await b.getBundle('n-engine'))!.thread.resolution;
    const g = await b.createWork({ threadId: 'n-engine', work });
    await b.createWork({ threadId: 'n-engine', work: { ...work, kind: 'grant', title: 'Firmware integration' } });
    await b.updateGrant({ id: g.id, scope: 'Edited work scope' });
    const r = (await b.getBundle('n-engine'))!.thread.resolution;
    if (r?.kind !== 'conclude' || original?.kind !== 'conclude') throw new Error('wrong resolution');
    expect(r.grantIds).toHaveLength(2); expect(r.snapshot).toEqual(original.snapshot);
    expect((await b.getGrant(g.id))!.outcomeSnapshot).toEqual(original.snapshot);
    await expect(draft()).rejects.toThrow('closed');
    await expect(conclude()).rejects.toThrow('closed');
  });
  it('keeps a deferred draft with its discussion and freezes concluded threads normally', async () => {
    await draft(); await b.resolveThread({ threadId: 'n-engine', kind: 'defer', toVersionId: 'sh-pt3' });
    expect((await b.getBundle('n-engine'))!.draft!.body).toContain('DroneCAN');
    for (const t of await b.listThreads()) if (t.projectId === 'spearhead' && t.versionId === 'sh-pt2' && t.status === 'open') { await draft('', t.id); await conclude(false, undefined, t.id); }
    await b.freezeVersion({ projectId: 'spearhead', versionId: 'sh-pt2' });
    expect((await b.listProjects()).find(p => p.id === 'spearhead')!.versions.find(v => v.id === 'sh-pt3')!.state).toBe('discussing');
    await conclude(true); const r = (await b.getBundle('n-engine'))!.thread.resolution;
    expect(r?.kind === 'conclude' && r.snapshot.versionId).toBe('sh-pt3');
  });
  it('supports an outcome even with no competing approaches', async () => {
    const t = await b.createThread({ projectId: 'spearhead', title: 'Can we retain the current connector?', body: 'Confirmed no change needed.', tags: [] });
    await draft('', t.id); await conclude(false, undefined, t.id);
    expect((await b.getBundle(t.id))!.thread.status).toBe('resolved');
  });
  it('loads older saved state without drafts and without losing discussion', async () => {
    const shared = storage(); b = new DemoBackend(shared);
    await b.createPosition({ threadId: 'n-engine', body: 'Keep this existing contribution.' });
    b = new DemoBackend(shared); expect((await b.getBundle('n-engine'))!.positions.some(p => p.body.includes('Keep this'))).toBe(true);
    await draft(); expect((await b.getBundle('n-engine'))!.draft!.revision).toBe(1);
  });
});
