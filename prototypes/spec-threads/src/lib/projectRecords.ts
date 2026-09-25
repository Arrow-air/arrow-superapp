import type { Decision, Grant, Project, SpecificationSection, WorkProgress, WorkStage, WorkTracking } from './types';
export const workStages: Record<WorkStage, string> = { draft: 'Draft', open: 'Open', in_progress: 'In progress', in_review: 'In review', completed: 'Completed', cancelled: 'Cancelled' };
export const transitions: Record<WorkStage, WorkStage[]> = { draft: ['open', 'cancelled'], open: ['in_progress', 'cancelled'], in_progress: ['in_review', 'cancelled'], in_review: ['in_progress', 'completed', 'cancelled'], completed: [], cancelled: [] };
export function trackingOf(g: Grant): WorkTracking {
  return JSON.parse(JSON.stringify(g.tracking ?? { revision: 0, stage: g.status === 'published' ? 'open' : 'draft', ownerId: '', dueDate: '', funding: 'unfunded', budget: '', acceptance: g.scope.split('## Acceptance criteria\n')[1]?.trim() ?? g.briefSnapshot?.items.filter(i=>i.kind === 'deliverable' && i.status === 'accepted').map(i=>i.verification).filter(Boolean).join('\n') ?? '', evidence: '', milestones: [], decisionIds: g.decisionIds ?? [], history: [] }));
}
export function progressOf(t: WorkTracking): WorkProgress { const { revision, history, ...content } = t; return content; }
/** Earlier baselines are inherited only once frozen/building, never from another live draft. */
export function applicableVersions(project: Project, versionId: string) {
  const target = project.versions.find(v => v.id === versionId);
  return new Set(project.versions.filter(v => v.id === versionId || (target && v.order < target.order && ['frozen', 'building'].includes(v.state))).map(v => v.id));
}
export function designDecisions(project: Project, versionId: string, decisions: Decision[]) {
  const versions = applicableVersions(project, versionId);
  return decisions.filter(d => d.projectId === project.id && versions.has(d.versionId));
}
export function currentDecisions(project: Project, versionId: string, decisions: Decision[]) {
  const applicable = designDecisions(project, versionId, decisions);
  const superseded = new Set(applicable.flatMap(d => d.supersedesIds ?? []));
  return applicable.filter(d => d.status === 'decided' && !superseded.has(d.id));
}
export function effectiveSections(project: Project, versionId: string, sections: SpecificationSection[]) {
  const versions = applicableVersions(project, versionId);
  const order = (id: string) => project.versions.find(v => v.id === id)?.order ?? 0;
  const map = new Map<string, SpecificationSection>();
  sections.filter(s => s.projectId === project.id && versions.has(s.versionId)).sort((a, b) => order(a.versionId) - order(b.versionId)).forEach(s => map.set(s.system, s));
  return [...map.values()];
}
export function validEvidence(text: string) { return text.trim().length > 0; }
