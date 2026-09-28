import type { EvidenceStatus, ProjectSource, SourcedProject, SourcedRecord } from '../lib/sourcedProject';
import type { Role } from '../lib/types';
import type { WorkStage } from '../lib/types';

export const recordStatus: Record<EvidenceStatus, string> = {
  documented: 'Documented', analysis: 'Analysis', agreed: 'Agreed on a call', reported: 'Reported',
  in_progress: 'In progress', planned: 'Planned', proposal: 'Proposed', open: 'Open question',
  completed: 'Done', historical: 'Earlier',
};
export const sourceKind: Record<ProjectSource['kind'], string> = {
  meeting: 'Call transcript', repository: 'Repository', wiki: 'Call notes', discord: 'Discord',
};
export const roleLabel: Record<Role, string> = { lead: 'Project lead', core: 'Core', member: 'Contributor' };
export const stageLabel: Record<WorkStage, string> = {
  draft: 'Draft', open: 'Open to claim', in_progress: 'In progress', in_review: 'Waiting for review', completed: 'Accepted', cancelled: 'Cancelled',
};

export const shortDate = (iso: string) => {
  const d = iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
};
export const dateTime = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Where an imported record came from, in a few words: "Sep 25 call", "Repository, Jul 21". */
export function origin(evidence: SourcedProject, r: SourcedRecord) {
  const sources = evidence.sources.filter((s) => r.sourceIds.includes(s.id));
  const call = sources.find((s) => s.kind === 'meeting' || s.kind === 'wiki');
  if (call) return `${shortDate(r.date)} call`;
  if (sources.some((s) => s.kind === 'repository')) return `Repository · ${shortDate(r.date)}`;
  if (sources.some((s) => s.kind === 'discord')) return `Discord · ${shortDate(r.date)}`;
  return shortDate(r.date);
}
