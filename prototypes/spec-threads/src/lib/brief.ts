import type { ThreadBundle } from '../data/backend';
import type { BriefContent, BriefSnapshot, BriefSource, WorkingBrief } from './types';

export function discussionSources(bundle: ThreadBundle): BriefSource[] {
  return [
    { key: `thread:${bundle.thread.id}`, kind: 'thread', id: bundle.thread.id, authorId: bundle.thread.authorId, body: bundle.thread.body } as BriefSource,
    ...bundle.positions.flatMap(p => [
      { key: `position:${p.id}`, kind: 'position', id: p.id, positionId: p.id, authorId: p.authorId, body: p.body } as BriefSource,
      ...bundle.comments.filter(c => c.positionId === p.id).map(c => ({ key: `comment:${c.id}`, kind: 'comment', id: c.id, positionId: p.id, authorId: c.authorId, body: c.body } as BriefSource)),
    ]),
  ];
}
export function emptyBrief(threadId: string): WorkingBrief {
  return { threadId, revision: 0, purpose: '', items: [], reviewed: [], history: [] };
}
export function briefContent(brief: WorkingBrief): BriefContent {
  return structuredClone({ purpose: brief.purpose, items: brief.items, reviewed: brief.reviewed });
}
/** Exact serialization deliberately avoids hash collisions for this small local prototype. */
export function corpusKey(bundle: ThreadBundle): string {
  return JSON.stringify(discussionSources(bundle));
}
export function unreviewedSources(bundle: ThreadBundle): BriefSource[] {
  return discussionSources(bundle).filter(s => !bundle.brief?.reviewed.some(r => r.source.key === s.key && r.source.body === s.body));
}
export function briefIssues(bundle: ThreadBundle): string[] {
  const b = bundle.brief;
  if (!b) return ['Start a working brief in the discussion.'];
  const issues: string[] = [];
  if (!b.purpose.trim()) issues.push('Write the intended outcome.');
  if (!b.items.some(i => i.kind === 'requirement' && i.status === 'accepted')) issues.push('Accept at least one requirement.');
  const proposed = b.items.filter(i => i.status === 'proposed');
  if (proposed.length) issues.push(`Resolve ${proposed.length} proposed ${proposed.length === 1 ? 'item' : 'items'} or open questions.`);
  const unread = unreviewedSources(bundle).length;
  if (unread) issues.push(`Review ${unread} discussion ${unread === 1 ? 'source' : 'sources'}, including alternative approaches.`);
  return issues;
}
export function briefApproved(bundle: ThreadBundle): boolean {
  const b = bundle.brief, a = b?.approval;
  return !!b && !!a && a.revision === b.revision && a.versionId === bundle.thread.versionId && a.corpus === corpusKey(bundle) && !briefIssues(bundle).length;
}
export function grantBriefIssues(bundle: ThreadBundle): string[] {
  const issues = briefIssues(bundle);
  if (!bundle.brief?.items.some(i => i.kind === 'deliverable' && i.status === 'accepted' && i.verification.trim())) issues.push('Accept a deliverable with an acceptance check.');
  if (!briefApproved(bundle)) issues.push('The lead must approve the current brief.');
  return issues;
}
export function snapshotBrief(bundle: ThreadBundle): BriefSnapshot {
  if (!briefApproved(bundle)) throw new Error('Review and approve the current working brief first.');
  return { threadId: bundle.thread.id, ...briefContent(bundle.brief!), approval: structuredClone(bundle.brief!.approval!) };
}
export function sourceUrl(projectId: string, threadId: string, source: BriefSource, versionId?: string): string {
  const q = new URLSearchParams({ view: 'shape', thread: threadId, source: source.key });
  if (versionId) q.set('version', versionId);
  return `#/p/${encodeURIComponent(projectId)}?${q}`;
}
/** Only accepted material enters scope. Rejected ideas and answered questions keep their rationale. */
export function briefMarkdown(snapshot: BriefSnapshot, projectId: string, omitRequirements = false): string {
  const lines = ['## Intended outcome', '', snapshot.purpose, '', `Based on lead-reviewed working brief r${snapshot.approval.revision}.`, ''];
  const sections = [
    ['requirement', 'Accepted requirements'], ['deliverable', 'Deliverables and acceptance checks'],
    ['exclusion', 'Out of scope'], ['evidence', 'Supporting reports — not independently verified'],
    ['question', 'Resolved questions'],
  ];
  for (const [kind, label] of sections) {
    if (kind === 'requirement' && omitRequirements) continue;
    const items = snapshot.items.filter(i => i.kind === kind && i.status === 'accepted');
    if (!items.length) continue;
    lines.push(`## ${label}`, '');
    for (const i of items) {
      lines.push(`- ${i.text}`);
      if (i.verification) lines.push(`  - Acceptance check: ${i.verification}`);
      if (i.rationale) lines.push(`  - Lead rationale: ${i.rationale}`);
      lines.push(`  - Sources: ${i.sources.map(s => `[${s.kind} by ${s.authorId}](${sourceUrl(projectId, snapshot.threadId, s, snapshot.approval.versionId)})`).join(', ')}`);
    }
    lines.push('');
  }
  const dismissed = snapshot.items.filter(i => i.status === 'dismissed');
  if (dismissed.length) lines.push('## Considered but not included', '', ...dismissed.map(i => `- ${i.text} — ${i.rationale}`), '');
  return lines.join('\n');
}
