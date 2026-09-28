// The example workspace that specs.arrowair.com serves by default: fictional people and activity,
// run by the same domain rules in the visitor's browser. Changes stay in that browser; "Reset"
// restores the example. Pick a person under "Explore as" to act as a lead or a contributor.
import example from './exampleState.json';
import { DemoBackend } from './demoBackend';
import type { DemoState } from './seed';
import type { WorkInput } from '../lib/types';
import { holdCallProposerAwards, sourceThread } from '../lib/evidenceThreads';
import { progressOf, trackingOf } from '../lib/projectRecords';
import { spearhead } from './spearheadReal';

const ISO = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?$/;
/**
 * Moves every date in the example forward so its last activity is always recent and the freeze is
 * always ahead, however long after the example was written someone opens it.
 */
function shiftToToday(state: DemoState, anchor: string): DemoState {
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(anchor + 'T12:00:00Z')) / 86_400_000));
  if (!days) return structuredClone(state);
  const shift = (value: unknown): unknown => {
    if (typeof value === 'string' && ISO.test(value)) {
      const moved = new Date(Date.parse(value.length === 10 ? value + 'T12:00:00Z' : value) + days * 86_400_000).toISOString();
      return value.length === 10 ? moved.slice(0, 10) : moved;
    }
    if (Array.isArray(value)) return value.map(shift);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shift(v)]));
    return value;
  };
  return shift(state) as DemoState;
}

export const exampleSeed = () => shiftToToday(example.state as unknown as DemoState, example.anchor);

export class ExampleBackend extends DemoBackend {
  constructor() {
    super(undefined, { key: 'arrow-example-workspace-v1', seed: exampleSeed });
  }

  async startFromEvidence(input: { recordId: string; title?: string; body: string }) {
    const me = this.me();
    const thread = sourceThread(this.state, input.recordId, me.id, input.body, input.title, spearhead);
    this.save();
    return structuredClone(thread);
  }

  async claimWork(input: { id: string; note: string }) {
    const me = this.me();
    const g = this.state.grants.find((x) => x.id === input.id);
    if (!g) throw new Error('Work not found.');
    const t = trackingOf(g);
    if (t.stage !== 'open' || t.ownerId) throw new Error('This work is not available to claim.');
    const at = new Date().toISOString();
    g.tracking = { ...t, ownerId: me.id, stage: 'in_progress', revision: t.revision + 1, history: [...t.history, { at, byMemberId: me.id, note: 'Assignment accepted: ' + input.note, content: { ...progressOf(t), ownerId: me.id, stage: 'in_progress' } }] };
    this.save();
    return structuredClone(g);
  }

  async concludeThread(input: { threadId: string; expectedRevision: number; expectedCorpus: string; adopt: boolean; decision?: string; work?: WorkInput }) {
    const thread = await super.concludeThread(input);
    this.creditCalls();
    return thread;
  }

  async createWork(input: { threadId: string; work: WorkInput }) {
    const grant = await super.createWork(input);
    this.creditCalls();
    return this.state.grants.find((g) => g.id === grant.id) ?? grant;
  }

  private creditCalls() {
    this.state = this.load();
    holdCallProposerAwards(this.state, spearhead);
    this.save();
  }
}
