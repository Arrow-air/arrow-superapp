import { beforeEach, describe, expect, it } from 'vitest';
import { analyzeThread } from '../lib/analyze';
import { NotSignedInError } from './backend';
import { DemoBackend } from './demoBackend';

function memStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

async function analysisFor(b: DemoBackend, threadId: string) {
  const [bundle, members, roles, projects] = await Promise.all([
    b.getBundle(threadId),
    b.listMembers(),
    b.listRoles(),
    b.listProjects(),
  ]);
  const project = projects.find((p) => p.id === bundle!.thread.projectId)!;
  return { bundle: bundle!, members, project, analysis: analyzeThread({ bundle: bundle!, members, roles, project }) };
}

const versionState = async (b: DemoBackend, projectId: string, versionId: string) =>
  (await b.listProjects()).find((p) => p.id === projectId)!.versions.find((v) => v.id === versionId)!.state;

describe('DemoBackend', () => {
  let b: DemoBackend;
  beforeEach(() => {
    b = new DemoBackend(memStorage());
  });

  it('seed shows the case the experiment is about: the crowd and the weighting disagree', async () => {
    const { analysis } = await analysisFor(b, 'n-power');
    const top = (k: 'rawRank' | 'weightedRank') => analysis.tallies.filter((t) => t[k] === 1).map((t) => t.positionId);
    expect(top('rawRank')).toEqual(['s-max']);
    expect(top('weightedRank')).toEqual(['s-tiered']);
    expect(analysis.weightingChangedWinner).toBe(true);
    expect(analysis.leadFollowedWeighted).toBeNull();
  });

  it('seed: Spearhead builds PT1 and discusses PT2, with one thread already in the register', async () => {
    const spearhead = (await b.listProjects()).find((p) => p.id === 'spearhead')!;
    expect(spearhead.versions.map((v) => [v.name, v.state])).toEqual([['PT1', 'building'], ['PT2', 'discussing'], ['PT3', 'planned']]);
    const pt2 = (await b.listThreads()).filter((t) => t.projectId === 'spearhead' && t.versionId === 'sh-pt2');
    expect(pt2.filter((t) => t.status === 'open')).toHaveLength(3);
    expect(pt2.filter((t) => t.status === 'resolved')).toHaveLength(1);
    expect(await b.listDecisions()).toHaveLength(1);
    expect(await b.listGrants()).toHaveLength(0);
    expect((await analysisFor(b, 'n-wingspan')).analysis.leadFollowedWeighted).toBe(true);
  });

  it('a whale counts for more than a newcomer, but less than the lead or the expert', async () => {
    const { analysis } = await analysisFor(b, 'n-power');
    const w = (id: string) => analysis.weights.get(id)!.total;
    expect(w('m-whale')).toBeGreaterThan(w('m-ade'));
    expect(w('m-lena')).toBeGreaterThan(w('m-whale'));
    expect(w('m-jun')).toBeGreaterThan(w('m-whale'));
  });

  it('role is per project: the Quiver lead is an ordinary member on Spearhead', async () => {
    const { analysis } = await analysisFor(b, 'n-avionics');
    expect(analysis.weights.get('m-lena')!.role).toBe('member');
    expect(analysis.weights.get('m-omar')!.role).toBe('lead');
  });

  it('votes replace, clear, and persist across reloads', async () => {
    const storage = memStorage();
    const first = new DemoBackend(storage);
    await first.actAs('m-sam');
    await first.castVote({ positionId: 's-tiered', value: 1 });
    await first.castVote({ positionId: 's-tiered', value: -1 });
    const reloaded = new DemoBackend(storage);
    const mine = (await reloaded.getBundle('n-power'))!.votes.filter((v) => v.memberId === 'm-sam' && v.positionId === 's-tiered');
    expect(mine).toHaveLength(1);
    expect(mine[0].value).toBe(-1);
    await reloaded.castVote({ positionId: 's-tiered', value: 0 });
    const after = (await reloaded.getBundle('n-power'))!.votes.filter((v) => v.memberId === 'm-sam' && v.positionId === 's-tiered');
    expect(after).toHaveLength(0);
  });

  it('declaring builder intent raises your weight on that thread only', async () => {
    await b.actAs('m-sam');
    const before = (await analysisFor(b, 'n-power')).analysis.weights.get('m-sam')!.total;
    await b.setBuilderIntent({ threadId: 'n-power', on: true });
    const after = (await analysisFor(b, 'n-power')).analysis.weights.get('m-sam')!;
    const other = (await analysisFor(b, 'n-avionics')).analysis.weights.get('m-sam')!;
    expect(after.total).toBeCloseTo(before + 1, 5);
    expect(after.builder).toBe(1);
    expect(other.builder).toBe(0);
  });

  it('new threads default to the version in discussion and can carry a system', async () => {
    await b.actAs('m-ade');
    const t = await b.createThread({ projectId: 'spearhead', title: 'Landing gear', body: '', tags: ['Airframe', 'airframe'], system: 'Airframe' });
    expect(t.versionId).toBe('sh-pt2');
    expect(t.system).toBe('airframe');
    expect(t.tags).toEqual(['airframe']);
    expect(t.deferrals).toEqual([]);
    await expect(b.createThread({ projectId: 'spearhead', versionId: 'sh-pt1', title: 'Late', body: '', tags: [] })).rejects.toThrow(/in discussion/);
    await expect(b.createThread({ projectId: 'spearhead', title: 'x', body: '', tags: [], system: 'kitchen' })).rejects.toThrow(/system/);
  });

  it('only the lead resolves, and every open thread must be resolved or deferred before a freeze', async () => {
    await b.actAs('m-jun');
    await expect(b.resolveThread({ threadId: 'n-engine', kind: 'reject', note: 'A perfectly good reason written out.' })).rejects.toThrow(/Only the project lead/);
    await expect(b.freezeVersion({ projectId: 'spearhead', versionId: 'sh-pt2' })).rejects.toThrow(/Only the project lead/);

    await b.actAs('m-omar');
    await expect(b.freezeVersion({ projectId: 'spearhead', versionId: 'sh-pt2' })).rejects.toThrow(/3 threads are still open/);

    // 1. Engine PCB -> grant, from the weighted top position: no rationale needed.
    const engine = await b.resolveThread({ threadId: 'n-engine', kind: 'grant', positionId: 's-ecu' });
    expect(engine.status).toBe('resolved');
    expect(engine.resolution).toMatchObject({ kind: 'grant', positionId: 's-ecu', weightedRankAtResolution: 1 });
    const grants = await b.listGrants();
    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatchObject({ threadId: 'n-engine', proposerIds: ['m-jun'], proposerShare: 0.25, status: 'draft' });
    expect(grants[0].contributorIds.sort()).toEqual(['m-omar', 'm-rosa']);
    expect(grants[0].constraints.some((c) => /12 kHz/.test(c))).toBe(true);
    await expect(b.castVote({ positionId: 's-ecu', value: 1 })).rejects.toThrow(/closed/);
    await expect(b.createPosition({ threadId: 'n-engine', body: 'late' })).rejects.toThrow(/closed/);
    await expect(b.resolveThread({ threadId: 'n-engine', kind: 'reject', note: 'A perfectly good reason written out.' })).rejects.toThrow(/already/);

    // 2. Avionics carrier -> spec, into the register.
    const avionics = await b.resolveThread({ threadId: 'n-avionics', kind: 'spec', positionId: 's-can' });
    expect(avionics.resolution?.kind).toBe('spec');
    const decisions = await b.listDecisions();
    expect(decisions).toHaveLength(2);
    expect(decisions[0]).toMatchObject({ threadId: 'n-avionics', chosen: 'Hint: run two CAN buses', versionId: 'sh-pt2' });

    // 3. Payload bay -> defer to PT3. Stays open, moves version, keeps history.
    await expect(b.freezeVersion({ projectId: 'spearhead', versionId: 'sh-pt2' })).rejects.toThrow(/1 thread is still open/);
    await expect(b.resolveThread({ threadId: 'n-payload', kind: 'defer', toVersionId: 'sh-pt1' })).rejects.toThrow(/later version/);
    const payload = await b.resolveThread({ threadId: 'n-payload', kind: 'defer', toVersionId: 'sh-pt3', note: 'Not enough discussion yet.' });
    expect(payload.status).toBe('open');
    expect(payload.versionId).toBe('sh-pt3');
    expect(payload.deferrals).toEqual([expect.objectContaining({ fromVersionId: 'sh-pt2', toVersionId: 'sh-pt3', byMemberId: 'm-omar', note: 'Not enough discussion yet.' })]);

    // 4. Freeze PT2. PT3 opens for discussion.
    const project = await b.freezeVersion({ projectId: 'spearhead', versionId: 'sh-pt2' });
    expect(project.versions.map((v) => v.state)).toEqual(['building', 'frozen', 'discussing']);
    await expect(b.freezeVersion({ projectId: 'spearhead', versionId: 'sh-pt2' })).rejects.toThrow(/not in discussion/);
    // New threads now go to PT3.
    expect((await b.createThread({ projectId: 'spearhead', title: 'PT3 idea', body: '', tags: [] })).versionId).toBe('sh-pt3');
  });

  it('rejecting needs a note; overriding the weighted top needs a rationale', async () => {
    await b.actAs('m-lena');
    await expect(b.resolveThread({ threadId: 'n-power', kind: 'reject', note: 'no' })).rejects.toThrow(/at least 20/);
    await expect(b.resolveThread({ threadId: 'n-power', kind: 'spec', positionId: 's-max' })).rejects.toThrow(/not the top weighted/);
    const t = await b.resolveThread({ threadId: 'n-power', kind: 'spec', positionId: 's-max', overrideRationale: 'Heavy spray rigs will dominate orders next year, so headroom wins.' });
    expect(t.resolution).toMatchObject({ kind: 'spec', weightedRankAtResolution: 2, rawRankAtResolution: 1 });
    expect((await analysisFor(b, 'n-power')).analysis.leadFollowedWeighted).toBe(false);
    expect((await b.listDecisions())[0].rationale).toContain('Heavy spray rigs');
  });

  it('grant drafts are editable by the lead until published', async () => {
    await b.actAs('m-omar');
    await b.resolveThread({ threadId: 'n-engine', kind: 'grant', positionId: 's-ecu', proposerShare: 0.3 });
    const g = (await b.listGrants())[0];
    expect(g.proposerShare).toBe(0.3);
    await b.actAs('m-jun');
    await expect(b.updateGrant({ id: g.id, title: 'Mine now' })).rejects.toThrow(/Only the project lead/);
    await b.actAs('m-omar');
    const edited = await b.updateGrant({ id: g.id, title: '  Engine interface board  ', constraints: ['12 V', ' ', 'CAN'], proposerShare: 0.2 });
    expect(edited).toMatchObject({ title: 'Engine interface board', constraints: ['12 V', 'CAN'], proposerShare: 0.2 });
    await expect(b.updateGrant({ id: g.id, proposerIds: [] })).rejects.toThrow(/at least one proposer/);
    await expect(b.updateGrant({ id: g.id, proposerShare: 2 })).rejects.toThrow(/between 0 and 1/);
    expect((await b.publishGrant(g.id)).status).toBe('published');
    await expect(b.updateGrant({ id: g.id, title: 'too late' })).rejects.toThrow(/published/);
  });

  it('rejects writes when signed out, and empty input', async () => {
    await b.signOut();
    await expect(b.castVote({ positionId: 's-max', value: 1 })).rejects.toBeInstanceOf(NotSignedInError);
    await expect(b.resolveThread({ threadId: 'n-engine', kind: 'reject', note: 'A perfectly good reason written out.' })).rejects.toBeInstanceOf(NotSignedInError);
    await b.actAs('m-sam');
    await expect(b.createPosition({ threadId: 'n-power', body: '   ' })).rejects.toThrow(/empty/);
    await expect(b.createThread({ projectId: 'quiver', title: ' ', body: '', tags: [] })).rejects.toThrow(/title/);
    await expect(b.updateProfile({ tokenBalance: -1 })).rejects.toThrow(/zero or more/);
  });

  it('reset restores the seed', async () => {
    await b.actAs('m-sam');
    await b.createPosition({ threadId: 'n-power', body: 'extra' });
    expect((await b.getBundle('n-power'))!.positions).toHaveLength(4);
    await b.reset();
    expect((await b.getBundle('n-power'))!.positions).toHaveLength(3);
    expect(await versionState(b, 'spearhead', 'sh-pt2')).toBe('discussing');
  });

  it('returned objects are copies, so callers cannot mutate stored state', async () => {
    const bundle = (await b.getBundle('n-power'))!;
    bundle.thread.title = 'mutated';
    bundle.votes.length = 0;
    const again = (await b.getBundle('n-power'))!;
    expect(again.thread.title).not.toBe('mutated');
    expect(again.votes.length).toBeGreaterThan(0);
    const projects = await b.listProjects();
    projects[0].versions.length = 0;
    expect((await b.listProjects())[0].versions.length).toBeGreaterThan(0);
  });
});
