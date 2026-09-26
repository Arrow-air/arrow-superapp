import { describe, expect, it } from 'vitest';
import { spearhead } from './spearheadReal';
import { recordsFor } from '../lib/sourcedProject';
import { DemoBackend } from './demoBackend';
import { seedState } from './seed';

describe('real Spearhead snapshot', () => {
  it('has unique records and resolvable evidence and context links', () => {
    const ids = new Set(spearhead.records.map(r => r.id));
    expect(ids.size).toBe(spearhead.records.length);
    for (const r of spearhead.records) {
      expect(r.sourceIds.length, r.id).toBeGreaterThan(0);
      expect(r.statusNote.length, r.id).toBeGreaterThan(20);
      for (const source of r.sourceIds) expect(spearhead.sources.some(s => s.id === source), `${r.id}: ${source}`).toBe(true);
      for (const related of r.relatedIds) expect(ids.has(related), `${r.id}: ${related}`).toBe(true);
      for (const system of r.systems) expect(spearhead.systems.some(s => s.id === system)).toBe(true);
      for (const version of r.versions) expect(spearhead.versions.some(v => v.id === version)).toBe(true);
      expect(r.date <= spearhead.asOf, r.id).toBe(true);
    }
    for (const source of spearhead.sources) expect(new URL(source.url).protocol).toBe('https:');
  });
  it('does not turn the latest propulsion discussion into approved design', () => {
    expect(spearhead.records.find(r => r.id === 'electric-first')).toMatchObject({kind:'question', status:'proposal'});
    expect(spearhead.records.find(r => r.id === 'dual-battery')).toMatchObject({kind:'design', status:'agreed'});
    expect(spearhead.records.find(r => r.id === 'charging-bms')).toMatchObject({kind:'question', status:'open'});
    expect(spearhead.records.find(r => r.id === 'flight-report')?.body).toContain('does not claim a successful hover-to-cruise transition');
    expect(spearhead.records.find(r => r.id === 'gps-check')?.body).toContain('communication returned');
  });
  it('separates prototype evidence and makes uncovered payload work empty', () => {
    expect(recordsFor(spearhead, 'PT1').some(r => r.id === 'tail-pcb')).toBe(false);
    expect(recordsFor(spearhead, 'PT2').some(r => r.id === 'transition-preparation')).toBe(false);
    expect(recordsFor(spearhead, '', 'payload').some(r => r.kind === 'work')).toBe(false);
    expect(spearhead.systems.every(s => !s.focusId || spearhead.records.some(r => r.id === s.focusId))).toBe(true);
  });
  it('reading in non-sample mode leaves saved sandbox data byte-for-byte intact', async () => {
    const saved=seedState();saved.threads[0]!.body='Thomas’s previous edit';
    const value=JSON.stringify(saved), writes:string[]=[];
    const backend=new DemoBackend({getItem:()=>value,setItem:(k)=>{writes.push(k);},removeItem:(k)=>{writes.push(k);}},{sampleData:false});
    await backend.currentMember();await backend.listThreads();
    expect(writes).toEqual([]);
    expect((await backend.listThreads()).find(t => t.id === saved.threads[0]!.id)!.body).toBe('Thomas’s previous edit');
  });
});
