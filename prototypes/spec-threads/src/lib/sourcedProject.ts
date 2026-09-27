/** Imported facts are not application approvals, grants, votes, or impersonated messages. */
export interface ProjectSource {
  id: string;
  title: string;
  url: string;
  date: string;
  kind: 'meeting' | 'repository' | 'wiki' | 'discord';
  note?: string;
}
export type SourcedKind = 'design' | 'work' | 'question' | 'result';
export type EvidenceStatus = 'documented' | 'analysis' | 'agreed' | 'reported' | 'in_progress' | 'planned' | 'proposal' | 'open' | 'completed' | 'historical';
export interface SourcedRecord {
  eventDate?:string;
  lastVerifiedAt?:string;
  id: string;
  kind: SourcedKind;
  title: string;
  summary: string;
  body: string;
  systems: string[];
  versions: string[];
  status: EvidenceStatus;
  statusNote: string;
  date: string;
  /** Reported contributor, not a synthetic assignment or project permission. */
  owner?: string;
  next?: string;
  attention?: boolean;
  sourceIds: string[];
  relatedIds: string[];
}
export interface SourcedProject {
  name: string;
  asOf: string;
  summary: string;
  versions: { id: string; name: string; summary: string }[];
  systems: { id: string; name: string; focusId?: string }[];
  sources: ProjectSource[];
  records: SourcedRecord[];
  coverage: string[];
}
export const evidenceLabels: Record<EvidenceStatus, string> = {
  documented: 'Documented design', analysis: 'Documented analysis', agreed: 'Agreed on call', reported: 'Reported direction', in_progress: 'Reported in progress',
  planned: 'Planned work', proposal: 'Proposal', open: 'Open question',
  completed: 'Reported complete', historical: 'Historical reference',
};
export const kindLabels: Record<SourcedKind, string> = { design: 'Design', work: 'Work', question: 'Discussion', result: 'Result' };
export const sourceLabels: Record<ProjectSource['kind'], string> = {
  meeting: 'Original transcript', repository: 'Repository document', wiki: 'Call summary · Vector', discord: 'Discord message',
};
export function recordsFor(project: SourcedProject, version = '', system = '') {
  return project.records.filter(r => (!version || r.versions.includes(version)) && (!system || r.systems.includes(system)));
}
/** Freshness is relative to this frozen snapshot, not the reader's wall clock. */
export function isStaleEvidence(date: string, asOf: string): boolean {
  return (Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000 > 30;
}
