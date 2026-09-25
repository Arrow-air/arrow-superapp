import type { ThreadBundle } from '../data/backend';
import type { OutcomeContent, OutcomeSnapshot, WorkInput } from './types';
import { sourceUrl } from './brief';

/** Preserve legacy material as a document, without implying it was approved. */
export function startingOutcome(bundle: ThreadBundle): OutcomeContent {
  if (bundle.draft) return { body: bundle.draft.body, openQuestions: bundle.draft.openQuestions };
  const b = bundle.brief;
  if (!b) return { body: '', openQuestions: '' };
  const lines = [b.purpose, ''];
  for (const [kind, label] of [['requirement', 'Proposed design'], ['deliverable', 'Possible follow-on work'], ['evidence', 'Supporting reports'], ['question', 'Resolved questions'], ['exclusion', 'Boundaries and alternatives']]) {
    const items = b.items.filter(i => i.kind === kind && i.status !== 'dismissed' && (kind !== 'question' || i.status === 'accepted'));
    if (!items.length) continue;
    lines.push(`## ${label}`, '');
    for (const i of items) lines.push(`- ${i.text}${i.rationale ? ` — ${i.rationale}` : ''}${i.verification ? ` Acceptance check: ${i.verification}` : ''} (${i.sources.map(s => `[source: ${s.authorId.replace(/^m-/, '')}](${sourceUrl(bundle.thread.projectId, bundle.thread.id, s, bundle.thread.versionId)})`).join(', ')})`);
    lines.push('');
  }
  const dismissed = b.items.filter(i => i.status === 'dismissed');
  if (dismissed.length) lines.push('## Considered but not included', '', ...dismissed.map(i => `- ${i.text} — ${i.rationale}`), '');
  return { body: lines.join('\n').trim(), openQuestions: b.items.filter(i => i.kind === 'question' && i.status === 'proposed').map(i => i.status === 'accepted' ? `${i.text} — ${i.rationale}` : i.text).join('\n') };
}
export function validateWork(work: WorkInput) {
  if (!['grant', 'bounty'].includes(work.kind) || !['implementation', 'research'].includes(work.purpose)) throw new Error('Choose a work type and purpose.');
  if (!work.title.trim() || !work.scope.trim() || !work.acceptance.trim()) throw new Error('Work needs a title, scope, and acceptance criteria.');
}
export function outcomeMarkdown(snapshot: OutcomeSnapshot, projectId: string) {
  return `${snapshot.body}${snapshot.openQuestions ? `\n\n## Still unresolved\n\n${snapshot.openQuestions}` : ''}\n\n## Discussion at review\n\n${snapshot.sources.map(s => `- [${s.kind} by ${s.authorId.replace(/^m-/, '')}](${sourceUrl(projectId, snapshot.threadId, s, snapshot.versionId)})`).join('\n')}`;
}
