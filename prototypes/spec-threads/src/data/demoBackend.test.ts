import { beforeEach, describe, expect, it } from 'vitest';
import { analyzeNeed } from '../lib/analyze';
import { promote } from '../lib/promotion';
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

async function analysisFor(b: DemoBackend, needId: string) {
  const [bundle, members, roles, projects] = await Promise.all([
    b.getBundle(needId),
    b.listMembers(),
    b.listRoles(),
    b.listProjects(),
  ]);
  const project = projects.find((p) => p.id === bundle!.need.projectId)!;
  return { bundle: bundle!, members, analysis: analyzeNeed({ bundle: bundle!, members, roles, project }) };
}

describe('DemoBackend', () => {
  let b: DemoBackend;
  beforeEach(() => {
    b = new DemoBackend(memStorage());
  });

  it('seed shows the case the experiment is about: the crowd and the weighting disagree', async () => {
    const { analysis } = await analysisFor(b, 'n-power');
    const top = (k: 'rawRank' | 'weightedRank') => analysis.tallies.filter((t) => t[k] === 1).map((t) => t.specId);
    expect(top('rawRank')).toEqual(['s-max']);
    expect(top('weightedRank')).toEqual(['s-tiered']);
    expect(analysis.weightingChangedWinner).toBe(true);
    expect(analysis.leadFollowedWeighted).toBeNull();
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
    await first.castVote({ specId: 's-tiered', value: 1 });
    await first.castVote({ specId: 's-tiered', value: -1 });
    const reloaded = new DemoBackend(storage);
    const mine = (await reloaded.getBundle('n-power'))!.votes.filter((v) => v.memberId === 'm-sam' && v.specId === 's-tiered');
    expect(mine).toHaveLength(1);
    expect(mine[0].value).toBe(-1);
    await reloaded.castVote({ specId: 's-tiered', value: 0 });
    const after = (await reloaded.getBundle('n-power'))!.votes.filter((v) => v.memberId === 'm-sam' && v.specId === 's-tiered');
    expect(after).toHaveLength(0);
  });

  it('declaring builder intent raises your weight on that need only', async () => {
    await b.actAs('m-sam');
    const before = (await analysisFor(b, 'n-power')).analysis.weights.get('m-sam')!.total;
    await b.setBuilderIntent({ needId: 'n-power', on: true });
    const after = (await analysisFor(b, 'n-power')).analysis.weights.get('m-sam')!;
    const other = (await analysisFor(b, 'n-avionics')).analysis.weights.get('m-sam')!;
    expect(after.total).toBeCloseTo(before + 1, 5);
    expect(after.builder).toBe(1);
    expect(other.builder).toBe(0);
  });

  it('full flow: post a need, reply with a spec, vote, lead promotes, thread closes', async () => {
    await b.actAs('m-lena');
    const need = await b.createNeed({ projectId: 'quiver', title: 'Landing gear height', body: 'How tall?', tags: ['Airframe', 'airframe'] });
    expect(need.tags).toEqual(['airframe']);
    await b.actAs('m-jun');
    const spec = await b.createSpec({ needId: need.id, body: '180 mm' });
    await b.castVote({ specId: spec.id, value: 1 });

    await b.actAs('m-lena');
    const { bundle, members, analysis } = await analysisFor(b, need.id);
    const lead = members.find((m) => m.id === 'm-lena')!;
    const author = members.find((m) => m.id === 'm-jun')!;
    const promotion = promote({ need: bundle.need, spec, specAuthor: author, lead, leadRole: 'lead', tallies: analysis.tallies });
    await b.recordPromotion({ needId: need.id, promotion });

    const closed = (await analysisFor(b, need.id));
    expect(closed.bundle.need.status).toBe('bounty');
    expect(closed.analysis.leadFollowedWeighted).toBe(true);
    await expect(b.castVote({ specId: spec.id, value: -1 })).rejects.toThrow(/closed/);
    await expect(b.createSpec({ needId: need.id, body: 'late' })).rejects.toThrow(/closed/);
    await expect(b.recordPromotion({ needId: need.id, promotion })).rejects.toThrow(/already/);
  });

  it('rejects writes when signed out, and empty input', async () => {
    await b.signOut();
    await expect(b.castVote({ specId: 's-max', value: 1 })).rejects.toBeInstanceOf(NotSignedInError);
    await b.actAs('m-sam');
    await expect(b.createSpec({ needId: 'n-power', body: '   ' })).rejects.toThrow(/empty/);
    await expect(b.createNeed({ projectId: 'quiver', title: ' ', body: '', tags: [] })).rejects.toThrow(/title/);
    await expect(b.updateProfile({ tokenBalance: -1 })).rejects.toThrow(/zero or more/);
  });

  it('reset restores the seed', async () => {
    await b.actAs('m-sam');
    await b.createSpec({ needId: 'n-power', body: 'extra' });
    expect((await b.getBundle('n-power'))!.specs).toHaveLength(4);
    await b.reset();
    expect((await b.getBundle('n-power'))!.specs).toHaveLength(3);
  });

  it('returned objects are copies, so callers cannot mutate stored state', async () => {
    const bundle = (await b.getBundle('n-power'))!;
    bundle.need.title = 'mutated';
    bundle.votes.length = 0;
    const again = (await b.getBundle('n-power'))!;
    expect(again.need.title).not.toBe('mutated');
    expect(again.votes.length).toBeGreaterThan(0);
  });
});
