import type { Decision, Grant, Member, Project, SpecificationSection } from './types';
import type { ThreadBundle } from '../data/backend';
import { currentDecisions, effectiveSections, trackingOf } from './projectRecords';

export const isActiveWork = (g: Grant) => !['completed', 'cancelled'].includes(trackingOf(g).stage);
export function nextWorkStep(g: Grant, members: Member[], leadName = 'Project lead') {
  const t = trackingOf(g);
  const owner = members.find(m => m.id === t.ownerId)?.displayName.split(' (')[0] ?? 'Owner';
  switch (t.stage) {
    case 'draft': return `${leadName} to finish the scope and open the work`;
    case 'open': return t.ownerId ? `${owner} to start work` : 'Find a contributor · agree assignment with the lead';
    case 'in_progress': return `${owner} to deliver evidence for review`;
    case 'in_review': return `${leadName} to review the submitted results`;
    case 'completed': return t.funding === 'paid' ? 'Results accepted · payment recorded' : 'Results accepted · payment not recorded';
    case 'cancelled': return 'Closed without completion';
  }
}
export function projectBriefing(project: Project, versionId: string, bundles: ThreadBundle[], decisions: Decision[], grants: Grant[], sections: SpecificationSection[]) {
  const current = currentDecisions(project, versionId, decisions);
  const effective = effectiveSections(project, versionId, sections);
  const work = grants.filter(g => g.projectId === project.id && g.versionId === versionId);
  const threads = bundles.filter(b => b.thread.projectId === project.id && b.thread.versionId === versionId);
  const missing = current.filter(d => !effective.some(s => s.decisionIds.includes(d.id)));
  const stale = effective.filter(s => s.decisionIds.some(id => !current.some(d => d.id === id)));
  const systemOf = (d: Decision) => bundles.find(b => b.thread.id === d.threadId)?.thread.system ?? 'project-wide';
  const systems = [...new Set([...project.systems, ...threads.map(b => b.thread.system ?? 'project-wide'), ...current.map(systemOf)])].map(system => {
    const design = current.filter(d => systemOf(d) === system);
    // Include work that serves this subsystem through a linked decision, even if its source discussion lives elsewhere.
    const relatedWork = work.filter(g => bundles.find(b => b.thread.id === g.threadId)?.thread.system === system || (g.decisionIds ?? []).some(id => design.some(d => d.id === id)) || (system === 'project-wide' && !bundles.find(b => b.thread.id === g.threadId)?.thread.system));
    const conversations = threads.filter(b => (b.thread.system ?? 'project-wide') === system);
    return { system, design, work: relatedWork, conversations, section: effective.find(s => s.system === system), pending: missing.filter(d => systemOf(d) === system), stale: stale.some(s => s.system === system) };
  });
  return { current, effective, work, threads, missing, stale, systems };
}
