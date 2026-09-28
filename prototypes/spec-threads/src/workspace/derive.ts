// One view of a project that joins what the team does in the app with what was said on calls
// and written in the repository. Pure functions over loaded data, so every screen agrees.

import type { ThreadBundle } from '../data/backend';
import { analyzeThread, roleOf } from '../lib/analyze';
import { currentDecisions, effectiveSections, trackingOf } from '../lib/projectRecords';
import { proposerAward, versionRetro, PROJECT_WIDE } from '../lib/retro';
import type { SourcedProject, SourcedRecord } from '../lib/sourcedProject';
import type { Decision, Grant, Member, Project, ProjectRole, Role, SpecificationSection, Thread, Version } from '../lib/types';

export interface ProjectData {
  project: Project;
  evidence: SourcedProject;
  bundles: ThreadBundle[];
  decisions: Decision[];
  grants: Grant[];
  sections: SpecificationSection[];
  members: Member[];
  roles: ProjectRole[];
}

export const systemName = (evidence: SourcedProject, id?: string) =>
  !id || id === PROJECT_WIDE ? 'Project-wide' : evidence.systems.find((s) => s.id === id)?.name ?? id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ');

export function discussingVersion(project: Project): Version | undefined {
  return [...project.versions].sort((a, b) => a.order - b.order).find((v) => v.state === 'discussing');
}
export function buildingVersion(project: Project): Version | undefined {
  return [...project.versions].sort((a, b) => a.order - b.order).find((v) => v.state === 'building');
}

export function lastActivity(b: ThreadBundle): string {
  const times = [b.thread.createdAt, ...b.positions.map((p) => p.editedAt ?? p.createdAt), ...b.comments.map((c) => c.createdAt), b.draft?.updatedAt, b.thread.resolution?.at, ...b.votes.map((v) => v.castAt)];
  return times.filter((t): t is string => !!t).sort().at(-1) ?? b.thread.createdAt;
}

/** What happened to an imported question or record once the team picked it up. */
export interface RecordLink {
  bundle: ThreadBundle;
  state: 'discussing' | 'answered' | 'not-pursued';
  decision?: Decision;
}
export function recordLinks(d: Pick<ProjectData, 'bundles' | 'decisions'>): Map<string, RecordLink> {
  const out = new Map<string, RecordLink>();
  const ordered = [...d.bundles].filter((b) => b.thread.sourceRecordId).sort((a, b) => a.thread.createdAt.localeCompare(b.thread.createdAt));
  for (const bundle of ordered) {
    const t = bundle.thread;
    const res = t.resolution;
    const decisionId = res?.kind === 'conclude' ? res.decisionId : res?.kind === 'spec' ? res.decisionId : undefined;
    const link: RecordLink = {
      bundle,
      state: t.status === 'open' ? 'discussing' : res?.kind === 'reject' ? 'not-pursued' : 'answered',
      decision: decisionId ? d.decisions.find((x) => x.id === decisionId) : undefined,
    };
    // An open discussion wins over an older closed one; otherwise the latest wins.
    const existing = out.get(t.sourceRecordId!);
    if (!existing || existing.state !== 'discussing' || link.state === 'discussing') out.set(t.sourceRecordId!, link);
  }
  return out;
}

export function tallyLeader(d: Pick<ProjectData, 'project' | 'members' | 'roles'>, bundle: ThreadBundle) {
  if (!bundle.positions.length) return undefined;
  const { tallies } = analyzeThread({ bundle, members: d.members, roles: d.roles, project: d.project });
  const top = [...tallies].sort((a, b) => b.weightedScore - a.weightedScore)[0];
  return top && top.voters ? { positionId: top.positionId, score: top.weightedScore, voters: new Set(bundle.votes.map((v) => v.memberId)).size } : undefined;
}

export interface QuestionItem {
  key: string;
  kind: 'thread' | 'record';
  title: string;
  system: string;
  versionId: string;
  date: string;
  summary: string;
  bundle?: ThreadBundle;
  record?: SourcedRecord;
}

const recordIsQuestion = (r: SourcedRecord) => r.kind === 'question' && !['completed', 'historical'].includes(r.status);

/** Open questions for a version: live team discussions, then call/doc questions nobody has picked up. */
export function openQuestions(d: ProjectData, versionId: string): QuestionItem[] {
  const links = recordLinks(d);
  const threads = d.bundles
    .filter((b) => b.thread.status === 'open' && b.thread.versionId === versionId)
    .sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)))
    .map((b) => ({ key: 'thread:' + b.thread.id, kind: 'thread' as const, title: b.thread.title, system: b.thread.system || PROJECT_WIDE, versionId, date: lastActivity(b), summary: '', bundle: b }));
  void links;
  return threads;
}

/**
 * Things said on calls or written in the repository that nobody has brought into the app yet.
 * They are suggestions only: not part of the spec, the open questions, or any freeze until someone
 * starts a discussion from one.
 */
export function callSuggestions(d: ProjectData): QuestionItem[] {
  const links = recordLinks(d);
  const live = new Set(d.project.versions.filter((v) => v.state === 'building' || v.state === 'discussing').map((v) => v.id));
  const suggestible = (r: SourcedRecord) =>
    (recordIsQuestion(r) || (r.kind === 'design' && ['agreed', 'proposal', 'reported'].includes(r.status))) && r.versions.some((v) => live.has(v)) && !links.has(r.id);
  return d.evidence.records
    .filter(suggestible)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((r) => ({ key: 'record:' + r.id, kind: 'record' as const, title: r.title, system: r.systems[0] || PROJECT_WIDE, versionId: r.versions.find((v) => live.has(v))!, date: r.date, summary: r.summary, record: r }));
}

export const decisionSystem = (d: Pick<ProjectData, 'bundles'>, decision: Decision) =>
  d.bundles.find((b) => b.thread.id === decision.threadId)?.thread.system || PROJECT_WIDE;

/** Decisions and conclusions the team recorded for a version, newest first. */
export function recentOutcomes(d: ProjectData, versionId: string) {
  return d.bundles
    .filter((b) => b.thread.status === 'resolved' && b.thread.versionId === versionId && b.thread.resolution?.kind !== 'reject')
    .map((b) => {
      const r = b.thread.resolution!;
      const decisionId = r.kind === 'conclude' || r.kind === 'spec' ? r.decisionId : undefined;
      const decision = decisionId ? d.decisions.find((x) => x.id === decisionId) : undefined;
      const summary = decision ? decisionTitle(decision) : r.kind === 'conclude' ? firstLine(r.snapshot.body) : b.thread.title;
      return { bundle: b, decision, summary, at: r.at, adopted: !!decision };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** A decision reads as its answer. Older records stored the question; fall back to the summary's first line. */
export const decisionTitle = (d: Decision) => (d.chosen && d.chosen !== d.question ? d.chosen : firstLine(d.outcomeSnapshot?.body ?? '') || d.chosen);

export const firstLine = (text: string) => text.split('\n').map((l) => l.replace(/^#{1,6}\s+|^[-*>]\s+|[*_`]/g, '').trim()).find(Boolean) ?? '';

export interface SpecSystem {
  system: string;
  name: string;
  decisions: Decision[];
  /** Decisions from an earlier frozen version that still apply. */
  inherited: Decision[];
  section?: SpecificationSection;
  /** Discussions in the app that are still open for this version and system. */
  open: QuestionItem[];
}

/** The spec is only what leads settled in the app, plus the section text they wrote from it. */
export function specFor(d: ProjectData, version: Version): SpecSystem[] {
  const current = currentDecisions(d.project, version.id, d.decisions);
  const sections = effectiveSections(d.project, version.id, d.sections);
  const open = version.state === 'frozen' ? [] : openQuestions(d, version.id);
  const systems = [...d.project.systems, PROJECT_WIDE];
  return systems.map((system) => {
    return {
      system,
      name: systemName(d.evidence, system),
      decisions: current.filter((x) => x.versionId === version.id && decisionSystem(d, x) === system).sort((a, b) => b.at.localeCompare(a.at)),
      inherited: current.filter((x) => x.versionId !== version.id && decisionSystem(d, x) === system).sort((a, b) => b.at.localeCompare(a.at)),
      section: sections.find((s) => s.system === system),
      open: open.filter((q) => q.system === system),
    };
  });
}

/** What an imported record is now, once team activity is taken into account. */
export function recordState(d: Pick<ProjectData, 'bundles' | 'decisions'>, r: SourcedRecord, links = recordLinks(d)): { key: string; label: string } {
  const link = links.get(r.id);
  if (link?.state === 'answered') return { key: 'answered', label: link.decision ? 'Decided' : 'Answered' };
  if (link?.state === 'discussing') return { key: 'discussing', label: 'Being discussed' };
  if (link?.state === 'not-pursued') return { key: 'declined', label: 'Declined' };
  return { key: r.status, label: '' };
}

/**
 * People named on calls who have no account yet: "Alperen; agreed with Erick and Zeynep" → Alperen, Erick, Zeynep.
 * Useful for seeing who to invite; not an identity claim.
 */
export function namedOnCalls(d: Pick<ProjectData, 'evidence' | 'members'>) {
  const stop = new Set(['Agreed', 'With', 'And', 'The', 'Team', 'Pilot', 'Build', 'Review', 'Not', 'Recorded', 'Vector', 'Arrow', 'Spearhead', 'Proposed', 'Reported', 'Lead', 'Call']);
  const members = new Set(d.members.map((m) => m.displayName.split(/[ (]/)[0].toLowerCase()));
  const counts = new Map<string, number>();
  for (const r of d.evidence.records) {
    const names = new Set((r.owner ?? '').match(/\b[A-Z][a-z]{2,}\b/g) ?? []);
    for (const n of names) if (!stop.has(n) && !members.has(n.toLowerCase())) counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, records]) => ({ name, records }));
}

export interface ReportedWork { record: SourcedRecord; link?: RecordLink }
export function reportedWork(d: ProjectData, statuses = ['in_progress', 'planned']): ReportedWork[] {
  const links = recordLinks(d);
  return d.evidence.records
    .filter((r) => r.kind === 'work' && statuses.includes(r.status))
    .sort((a, b) => (a.status === b.status ? b.date.localeCompare(a.date) : a.status === 'in_progress' ? -1 : 1))
    .map((record) => ({ record, link: links.get(record.id) }));
}

export const activeStages = ['open', 'in_progress', 'in_review'];

export interface PersonSummary {
  member: Member;
  role: Role;
  started: number;
  contributions: number;
  replies: number;
  support: number;
  adopted: number;
  workActive: number;
  workAccepted: number;
  earnedFromWork: number;
  proposerAwards: number;
  retro: number;
  retroRecorded: number;
}

export function people(d: ProjectData, retroVersionId?: string): PersonSummary[] {
  const retro = retroVersionId ? versionRetro({ project: d.project, versionId: retroVersionId, bundles: d.bundles, members: d.members, roles: d.roles }) : null;
  const inProject = d.members.filter((m) => d.roles.some((r) => r.projectId === d.project.id && r.memberId === m.id));
  return inProject.map((member) => {
    let support = 0;
    for (const b of d.bundles) {
      const mine = b.positions.filter((p) => p.authorId === member.id);
      if (!mine.length) continue;
      const { tallies } = analyzeThread({ bundle: b, members: d.members, roles: d.roles, project: d.project });
      for (const p of mine) support += Math.max(0, tallies.find((t) => t.positionId === p.id)?.weightedScore ?? 0);
    }
    const owned = d.grants.filter((g) => trackingOf(g).ownerId === member.id);
    const accepted = owned.filter((g) => trackingOf(g).stage === 'completed');
    return {
      member,
      role: roleOf(d.roles, d.project.id, member.id),
      started: d.bundles.filter((b) => b.thread.authorId === member.id).length,
      contributions: d.bundles.reduce((n, b) => n + b.positions.filter((p) => p.authorId === member.id).length, 0),
      replies: d.bundles.reduce((n, b) => n + b.comments.filter((c) => c.authorId === member.id).length, 0),
      support: Math.round(support * 100) / 100,
      adopted: d.decisions.filter((x) => x.status === 'decided' && d.bundles.find((b) => b.thread.id === x.threadId)?.thread.authorId === member.id).length,
      workActive: owned.filter((g) => activeStages.includes(trackingOf(g).stage)).length,
      workAccepted: accepted.length,
      earnedFromWork: accepted.reduce((n, g) => n + (trackingOf(g).amount ?? 0) - proposerAward(trackingOf(g).amount, g.proposerShare), 0),
      proposerAwards: d.grants.filter((g) => g.proposerIds.includes(member.id)).reduce((n, g) => n + Math.floor(proposerAward(trackingOf(g).amount, g.proposerShare) / Math.max(1, g.proposerIds.length)), 0),
      retro: retro?.lines.find((l) => l.memberId === member.id)?.amount ?? 0,
      retroRecorded: d.project.versions.reduce((n, v) => n + (v.retroAllocation?.lines.find((l) => l.memberId === member.id)?.amount ?? 0), 0),
    };
  });
}

export function threadVersionName(project: Project, t: Thread) {
  return project.versions.find((v) => v.id === t.versionId)?.name ?? t.versionId;
}

export function daysUntil(date: string, now = new Date()) {
  return Math.ceil((Date.parse(date + 'T23:59:59') - now.getTime()) / 86_400_000);
}

/** Where a work package's idea came from, and whether the proposer award is still waiting for a lead. */
export function ideaSource(g: Grant, evidence: SourcedProject) {
  const record = g.proposerRecordId ? evidence.records.find((r) => r.id === g.proposerRecordId) : undefined;
  return { record, held: g.proposerIds.length === 0, legacy: g.proposerRecordId ? undefined : g.proposerNote };
}

export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export const arrow = (n: number) => `${Math.round(n).toLocaleString('en-US')} ARROW`;
