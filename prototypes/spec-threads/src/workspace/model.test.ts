import { describe, expect, it } from 'vitest';
import { anchorKey, anchorLabel, parseAnchorKey, threadsAbout } from './model';
import { DemoBackend } from '../data/demoBackend';
import type { Thread } from '../lib/types';

const bulkheads = 'fuselage:1+fuselage_body:1+bulkheads:1';
const thread = (id: string, anchor?: Thread['anchor']): Thread => ({ id, projectId: 'p', versionId: 'v', title: id, body: '', tags: [], authorId: 'a', status: 'open', createdAt: '2026-09-27', deferrals: [], anchor });

describe('model anchors', () => {
  it('labels parts the way the model names them', () => {
    expect(anchorLabel({ group: 'fuselage', component: bulkheads, part: 'sta2' })).toBe('Fuselage › Bulkheads › sta2');
    expect(anchorLabel({ group: 'main_wing', component: 'root' })).toBe('Main wing');
    expect(anchorLabel({ group: 'inferred_starboard_outer_wing', part: 'Body97_mirrored_inferred' })).toBe('Starboard outer wing (mirrored) › Body97 (mirrored)');
  });
  it('round-trips anchor keys', () => {
    const a = { group: 'fuselage', component: bulkheads, part: 'sta2' };
    expect(parseAnchorKey(anchorKey(a))).toEqual(a);
    expect(parseAnchorKey('tail//')).toEqual({ group: 'tail', component: undefined, part: undefined });
  });
  it('a part shows discussions about itself, its component, and its subsystem, but not its siblings', () => {
    const m = 'spearhead-v2@x';
    const threads = [
      thread('part', { model: m, group: 'fuselage', component: bulkheads, part: 'sta2', label: '' }),
      thread('sibling', { model: m, group: 'fuselage', component: bulkheads, part: 'sta3', label: '' }),
      thread('component', { model: m, group: 'fuselage', component: bulkheads, label: '' }),
      thread('group', { model: m, group: 'fuselage', label: '' }),
      thread('other', { model: m, group: 'tail', label: '' }),
      thread('none'),
    ];
    expect(threadsAbout(threads, { group: 'fuselage', component: bulkheads, part: 'sta2' }).map((t) => t.id)).toEqual(['part', 'component', 'group']);
  });
  it('stores a validated anchor on a new discussion', async () => {
    const map = new Map<string, string>();
    const b = new DemoBackend({ getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) });
    await b.actAs('m-jun');
    const t = await b.createThread({ projectId: 'spearhead', title: 'Hole in sta2', body: 'x', tags: [], anchor: { model: 'spearhead-v2@x', group: 'fuselage', component: bulkheads, part: 'sta2', label: 'Fuselage › Bulkheads › sta2' } });
    expect(t.anchor).toMatchObject({ group: 'fuselage', part: 'sta2' });
    await expect(b.createThread({ projectId: 'spearhead', title: 'Bad', body: 'x', tags: [], anchor: { model: '', group: 'fuselage', label: 'x' } })).rejects.toThrow(/model anchor/);
  });
});
