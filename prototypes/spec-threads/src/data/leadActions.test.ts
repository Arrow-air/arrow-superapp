import { beforeEach, describe, expect, it } from 'vitest';
import { DemoBackend } from './demoBackend';
import { corpusKey } from '../lib/brief';
import { analyzeThread } from '../lib/analyze';
import { SHARED_WEIGHTS } from '../lib/weights';

function storage() { const map = new Map<string, string>(); return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); } }; }

describe('lead actions for the shared workspace', () => {
  let b: DemoBackend;
  beforeEach(async () => { b = new DemoBackend(storage()); await b.actAs('m-omar'); });

  it('only the lead sets roles and verified expertise, and a project keeps a lead', async () => {
    await b.actAs('m-jun');
    await expect(b.setMemberStanding({ projectId: 'spearhead', memberId: 'm-jun', role: 'lead' })).rejects.toThrow(/Only the project lead/);
    await b.actAs('m-omar');
    const jun = await b.setMemberStanding({ projectId: 'spearhead', memberId: 'm-jun', role: 'core', verifiedExpertise: [' Power ', 'power', 'avionics'] });
    expect(jun.verifiedExpertise).toEqual(['power', 'avionics']);
    expect((await b.listRoles()).find((r) => r.projectId === 'spearhead' && r.memberId === 'm-jun')?.role).toBe('core');
    await expect(b.setMemberStanding({ projectId: 'spearhead', memberId: 'm-omar', role: 'member' })).rejects.toThrow(/at least one lead/);
  });

  it('with shared weights, self-described expertise does not count but verified expertise and the thread system do', async () => {
    const project = (await b.listProjects()).find((p) => p.id === 'spearhead')!;
    const shared = { ...project, weights: SHARED_WEIGHTS };
    const bundle = (await b.getBundle('n-engine'))!;
    bundle.thread.system = 'power';
    const weightOf = async () => analyzeThread({ bundle, members: await b.listMembers(), roles: await b.listRoles(), project: shared }).weights.get('m-jun')!;
    const members = await b.listMembers();
    members.find((m) => m.id === 'm-jun')!.verifiedExpertise = [];
    expect((analyzeThread({ bundle, members, roles: await b.listRoles(), project: shared }).weights.get('m-jun')!).expertise).toBe(0);
    await b.setMemberStanding({ projectId: 'spearhead', memberId: 'm-jun', verifiedExpertise: ['power'] });
    const w = await weightOf();
    expect(w.expertise).toBe(1);
    expect(w.token).toBe(0);
  });

  it('plans a freeze date and retro pool, and records the allocation when the version freezes', async () => {
    await expect(b.setVersionPlan({ projectId: 'spearhead', versionId: 'sh-pt2', retroPool: { amount: 100, systemShares: { power: 0.7, avionics: 0.5 } } })).rejects.toThrow(/100%/);
    await expect(b.setVersionPlan({ projectId: 'spearhead', versionId: 'sh-pt1', freezeTarget: '2026-11-15' })).rejects.toThrow(/still open/);
    const planned = await b.setVersionPlan({ projectId: 'spearhead', versionId: 'sh-pt2', freezeTarget: '2026-11-15', retroPool: { amount: 10000 } });
    const pt2 = planned.versions.find((v) => v.id === 'sh-pt2')!;
    expect(pt2.freezeTarget).toBe('2026-11-15');
    expect(pt2.retroPool).toMatchObject({ amount: 10000, setBy: 'm-omar' });
    for (const t of await b.listThreads()) if (t.projectId === 'spearhead' && t.versionId === 'sh-pt2' && t.status === 'open') await b.resolveThread({ threadId: t.id, kind: 'defer', toVersionId: 'sh-pt3' });
    const frozen = (await b.freezeVersion({ projectId: 'spearhead', versionId: 'sh-pt2' })).versions.find((v) => v.id === 'sh-pt2')!;
    expect(frozen.retroAllocation).toMatchObject({ amount: 10000, byMemberId: 'm-omar' });
    const a = frozen.retroAllocation!;
    expect(a.lines.reduce((s, l) => s + l.amount, 0) + a.unallocated).toBe(10000);
  });

  it('records an adopted decision as its answer, and gives the proposer a slice of the work', async () => {
    await b.saveOutcome({ threadId: 'n-engine', expectedRevision: 0, body: '# Separate kill path on the engine PCB\n\nDetails follow.', openQuestions: '' });
    const bundle = (await b.getBundle('n-engine'))!;
    await b.concludeThread({ threadId: 'n-engine', expectedRevision: 1, expectedCorpus: corpusKey(bundle), adopt: true, work: { kind: 'bounty', purpose: 'implementation', title: 'Engine PCB', scope: 'Schematic.', acceptance: 'Bench demo.', amount: 4000 } });
    const decision = (await b.listDecisions()).find((d) => d.threadId === 'n-engine')!;
    expect(decision.chosen).toBe('Separate kill path on the engine PCB');
    expect(decision.question).toBe(bundle.thread.title);
    const grant = (await b.listGrants()).find((g) => g.threadId === 'n-engine')!;
    expect(grant.proposerShare).toBe(0.25);
    expect(grant.tracking?.amount).toBe(4000);
  });

  it('uses the lead-written decision line when one is given', async () => {
    await b.saveOutcome({ threadId: 'n-engine', expectedRevision: 0, body: 'Long synthesis.', openQuestions: '' });
    const bundle = (await b.getBundle('n-engine'))!;
    await b.concludeThread({ threadId: 'n-engine', expectedRevision: 1, expectedCorpus: corpusKey(bundle), adopt: true, decision: 'Two CAN buses, independent kill' });
    expect((await b.listDecisions()).find((d) => d.threadId === 'n-engine')!.chosen).toBe('Two CAN buses, independent kill');
  });

  it('nobody can support their own contribution', async () => {
    await b.actAs('m-jun');
    const p = await b.createPosition({ threadId: 'n-engine', body: 'My own idea.' });
    await expect(b.castVote({ positionId: p.id, value: 1 })).rejects.toThrow(/your own contribution/);
    await b.actAs('m-omar');
    await expect(b.castVote({ positionId: p.id, value: 1 })).resolves.toBeUndefined();
  });
});
