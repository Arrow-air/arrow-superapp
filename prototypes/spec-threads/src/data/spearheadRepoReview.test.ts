import { describe, expect, it } from 'vitest';
import { spearhead } from './spearheadReal';
import { repoReview } from './spearheadRepoReview';

describe('Spearhead repository follow-through', () => {
  it('preserves all 16 packet items with resolvable context and source links', () => {
    expect([...repoReview.items.map(item => item.packetIndex)].sort((a,b) => a-b)).toEqual(Array.from({length:16},(_,i)=>i));
    expect(new Set(repoReview.items.map(item => item.id)).size).toBe(16);
    for (const item of repoReview.items) {
      for (const id of item.relatedIds) expect(spearhead.records.some(r => r.id === id), id).toBe(true);
      expect(new URL(item.sourceUrl).protocol).toBe('https:');
      if (item.repoUrl) expect(new URL(item.repoUrl).hostname).toBe('github.com');
    }
  });
  it('does not turn documentation differences into violations or full closure', () => {
    expect(repoReview.items.filter(i=>i.category==='reconcile')).toHaveLength(5);
    expect(repoReview.items.find(i=>i.packetIndex===3)?.detail).toContain('does not erase PT1');
    expect(repoReview.items.find(i=>i.packetIndex===4)?.detail).toContain('does not establish a kill-switch violation');
    expect(repoReview.items.find(i=>i.packetIndex===14)?.detail).toContain('D3 is only partially closed');
    expect(repoReview.items.find(i=>i.packetIndex===15)?.detail).toContain('cannot establish');
  });
  it('does not classify Vector wiki summaries as repository decision records', () => {
    for (const source of spearhead.sources.filter(s=>s.url.includes('/wiki/'))) expect(source.kind).toBe('wiki');
    for (const record of spearhead.records.filter(r=>['documented','analysis'].includes(r.status))) {
      expect(record.sourceIds.some(id=>spearhead.sources.some(s=>s.id===id&&s.kind==='repository')),record.id).toBe(true);
    }
    expect(spearhead.records.find(r=>r.id==='dual-battery')?.status).toBe('agreed');
    expect(spearhead.records.find(r=>r.id==='electric-first')?.status).toBe('proposal');
  });
});
