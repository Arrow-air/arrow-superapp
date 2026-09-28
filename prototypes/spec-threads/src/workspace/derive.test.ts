import { describe, expect, it } from 'vitest';
import { callSuggestions, namedOnCalls, openQuestions, specFor } from './derive';
import type { ProjectData } from './derive';
import type { SourcedRecord } from '../lib/sourcedProject';
import { SHARED_WEIGHTS } from '../lib/weights';

const record = (id: string, versions: string[], extra: Partial<SourcedRecord> = {}): SourcedRecord => ({ id, kind: 'question', title: id, summary: '', body: '', systems: ['power'], versions, status: 'open', statusNote: '', date: '2026-09-25', sourceIds: [], relatedIds: [], ...extra });
function data(states: [string, 'building' | 'discussing' | 'frozen' | 'planned'][], records: SourcedRecord[]): ProjectData {
  return {
    project: { id: 'spearhead', name: 'Spearhead', weights: SHARED_WEIGHTS, systems: ['power'], versions: states.map(([id, state], i) => ({ id, name: id, state, order: i + 1 })) },
    evidence: { name: 'Spearhead', asOf: '2026-09-26', summary: '', versions: [], systems: [{ id: 'power', name: 'Power' }], sources: [], records, coverage: [] },
    bundles: [], decisions: [], grants: [], sections: [], members: [], roles: [],
  };
}

describe('the app is the only way into the spec', () => {
  it('lists only discussions in the app as open questions', () => {
    const d = data([['PT1', 'building'], ['PT2', 'discussing']], [record('a', ['PT2'])]);
    expect(openQuestions(d, 'PT2')).toEqual([]);
  });
  it('offers undiscussed call questions and agreements as suggestions, never as spec or open items', () => {
    const d = data([['PT1', 'building'], ['PT2', 'discussing']], [record('a', ['PT2']), record('b', ['PT1']), record('c', ['PT2'], { kind: 'design', status: 'agreed' }), record('d', ['PT2'], { kind: 'design', status: 'documented' })]);
    expect(callSuggestions(d).map((q) => q.key).sort()).toEqual(['record:a', 'record:b', 'record:c']);
    const power = specFor(d, d.project.versions[1]).find((s) => s.system === 'power')!;
    expect(power.decisions).toEqual([]);
    expect(power.open).toEqual([]);
  });
  it('drops suggestions for versions that are frozen instead of carrying them forward', () => {
    const d = data([['PT1', 'building'], ['PT2', 'frozen'], ['PT3', 'discussing']], [record('a', ['PT2'])]);
    expect(callSuggestions(d)).toEqual([]);
    expect(openQuestions(d, 'PT3')).toEqual([]);
  });
  it('keeps inherited decisions apart from the version’s own', () => {
    const d = data([['PT2', 'frozen'], ['PT3', 'discussing']], []);
    d.decisions = [{ id: 'd1', projectId: 'spearhead', versionId: 'PT2', threadId: 't', positionId: '', question: 'Q', chosen: 'A', weightedRankAtDecision: 0, rawRankAtDecision: 0, byMemberId: 'm', at: '2026-09-27', status: 'decided' }];
    const power = specFor(d, d.project.versions[1]).find((s) => s.system === 'project-wide')!;
    expect(power.decisions).toEqual([]);
    expect(power.inherited.map((x) => x.id)).toEqual(['d1']);
  });
});

describe('namedOnCalls', () => {
  it('pulls names from reported owners, skipping members and filler words', () => {
    const d = data([['PT2', 'discussing']], [record('a', ['PT2'], { owner: 'Alperen; agreed with Erick and Zeynep' }), record('b', ['PT2'], { owner: 'Thomas (pilot); Alperen' })]);
    d.members = [{ id: 'm', handle: 'thomas', displayName: 'Thomas', tokenBalance: 0, expertise: [] }];
    expect(namedOnCalls(d)).toEqual([{ name: 'Alperen', records: 2 }, { name: 'Erick', records: 1 }, { name: 'Zeynep', records: 1 }]);
  });
});
