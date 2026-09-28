import { installDeliverySamples } from './sampleDelivery';
import { currentDecisions, designDecisions, effectiveSections, progressOf, trackingOf, transitions, validEvidence } from '../lib/projectRecords';
import type { SpecificationSection, WorkTracking } from '../lib/types';
// Demo backend: everything lives in this browser's localStorage, seeded from seed.ts.
// No server, no accounts. A persona switcher stands in for sign-in so one person can
// play the lead, the expert, and the crowd to see how the weighting and the freeze behave.
//
// The resolution rules live in src/lib and run here, on the "server" side of the seam, so
// the UI only states intent ("turn this thread into a grant") and cannot skip a check.

import { briefContent, briefIssues, briefMarkdown, corpusKey, discussionSources, emptyBrief, grantBriefIssues, snapshotBrief } from '../lib/brief';
import type { BriefAction } from './backend';
import { validateWork } from '../lib/outcome';
import type { OutcomeDraft, OutcomeSnapshot, WorkInput } from '../lib/types';
import type { WorkingBrief } from '../lib/types';
import { analyzeThread, roleOf } from '../lib/analyze';
import { deferThread, promoteToGrant, promoteToSpec, rejectThread } from '../lib/resolution';
import type { Comment, Grant, Member, Position, Project, Thread } from '../lib/types';
import { discussingVersion, freezeCheck, freezeVersions, versionById } from '../lib/versions';
import { NotSignedInError, type Backend, type ResolveInput, type ThreadBundle } from './backend';
import { seedState, type DemoState } from './seed';
import { allocateRetro, scoredContributions, PROJECT_WIDE } from '../lib/retro';
import { DEFAULT_PROPOSER_SHARE } from '../lib/grant';
import type { Role } from '../lib/types';

const KEY = 'arrow-spec-threads-demo-v2';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function memoryStorage(): StorageLike {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

const firstLine = (text: string) => text.split('\n').map(l => l.replace(/^#{1,6}\s+|^[-*>]\s+|[*_`]/g, '').trim()).find(Boolean) ?? '';

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export class DemoBackend implements Backend {
  readonly kind = 'demo' as const;
  protected storage: StorageLike;
  protected state: DemoState;
  private sampleData: boolean;
  private key: string;
  private seed: () => DemoState;

  constructor(storage?: StorageLike, options: { sampleData?: boolean; key?: string; seed?: () => DemoState } = {}) {
    this.sampleData = options.sampleData ?? false;
    this.key = options.key ?? KEY;
    this.seed = options.seed ?? seedState;
    this.storage = storage ?? (typeof localStorage !== 'undefined' ? localStorage : memoryStorage());
    this.state = this.load();
  }

  protected load(): DemoState {
    let saved: DemoState | undefined;
    try {
      const raw = this.storage.getItem(this.key);
      if (raw) { saved = JSON.parse(raw) as DemoState; saved.briefs ??= []; }
    } catch {
      // Corrupt or unreadable storage: fall through to a fresh seed.
    }
    // A failed migration write must not be mistaken for corrupt existing data.
    return this.enrich(saved ?? this.seed());
  }

  private enrich(state: DemoState): DemoState {
    if (this.sampleData && installDeliverySamples(state)) this.storage.setItem(this.key, JSON.stringify(state));
    return state;
  }

  protected save() {
    this.storage.setItem(this.key, JSON.stringify(this.state));
  }

  protected me(): Member {
    // Re-read before every write: another tab may have changed the discussion or brief.
    this.state = this.load();
    const m = this.state.members.find((x) => x.id === this.state.actingAs);
    if (!m) throw new NotSignedInError();
    return m;
  }

  private project(id: string): Project {
    const p = this.state.projects.find((x) => x.id === id);
    if (!p) throw new Error('No such project.');
    return p;
  }

  private thread(id: string): Thread {
    const t = this.state.threads.find((x) => x.id === id);
    if (!t) throw new Error('No such thread.');
    return t;
  }

  private requireLead(projectId: string, me: Member) {
    if (roleOf(this.state.roles, projectId, me.id) !== 'lead') throw new Error('Only the project lead can do that.');
  }

  private bundle(thread: Thread): ThreadBundle {
    const positions = this.state.positions.filter((s) => s.threadId === thread.id);
    const positionIds = new Set(positions.map((s) => s.id));
    return structuredClone({
      thread,
      draft: this.state.drafts?.find(d => d.threadId === thread.id),
      brief: this.state.briefs.find(b => b.threadId === thread.id),
      positions,
      votes: this.state.votes.filter((v) => positionIds.has(v.positionId)),
      intents: this.state.intents.filter((i) => i.threadId === thread.id),
      comments: this.state.comments.filter((c) => positionIds.has(c.positionId)),
    });
  }

  async currentMember() {
    this.state = this.load();
    const m = this.state.members.find((x) => x.id === this.state.actingAs);
    return m ? structuredClone(m) : null;
  }

  async signIn() {
    this.state = this.load();
    this.state.actingAs = this.state.members[0]?.id ?? null;
    this.save();
  }

  async signOut() {
    this.state = this.load();
    this.state.actingAs = null;
    this.save();
  }

  async actAs(memberId: string) {
    this.state = this.load();
    if (!this.state.members.some((m) => m.id === memberId)) throw new Error('No such persona.');
    this.state.actingAs = memberId;
    this.save();
  }

  async listProjects() {
    return structuredClone(this.state.projects);
  }
  async listMembers() {
    return structuredClone(this.state.members);
  }
  async listRoles() {
    return structuredClone(this.state.roles);
  }
  async listThreads() {
    return structuredClone(this.state.threads).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async listBundles() {
    return this.state.threads.map((n) => this.bundle(n));
  }
  async getBundle(threadId: string) {
    const thread = this.state.threads.find((n) => n.id === threadId);
    return thread ? this.bundle(thread) : null;
  }
  async listDecisions() {
    return structuredClone(this.state.decisions).sort((a, b) => b.at.localeCompare(a.at));
  }
  async listGrants() {
    return structuredClone(this.state.grants).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getGrant(grantId: string) {
    const g = this.state.grants.find((x) => x.id === grantId);
    return g ? structuredClone(g) : null;
  }

  async createThread(input: { projectId: string; versionId?: string; system?: string; title: string; body: string; tags: string[] }) {
    const me = this.me();
    const project = this.project(input.projectId);
    const version = input.versionId ? versionById(project, input.versionId) : discussingVersion(project);
    if (!version) throw new Error('No such version.');
    if (version.state !== 'discussing' && version.state !== 'planned') {
      throw new Error(`${version.name} is ${version.state}. New threads go to the version in discussion.`);
    }
    const title = input.title.trim();
    if (!title) throw new Error('A thread requires a title.');
    const system = input.system?.trim().toLowerCase();
    if (system && !project.systems.includes(system)) throw new Error('No such system on this project.');
    const thread: Thread = {
      id: newId('n'),
      projectId: project.id,
      versionId: version.id,
      system: system || undefined,
      title,
      body: input.body.trim(),
      tags: [...new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))],
      authorId: me.id,
      status: 'open',
      createdAt: new Date().toISOString(),
      deferrals: [],
    };
    this.state.threads.push(thread);
    this.save();
    return structuredClone(thread);
  }

  async createPosition(input: { threadId: string; body: string }) {
    const me = this.me();
    const thread = this.thread(input.threadId);
    if (thread.status !== 'open') throw new Error('This thread is closed to new positions.');
    const body = input.body.trim();
    if (!body) throw new Error('A position cannot be empty.');
    const position: Position = { id: newId('s'), threadId: thread.id, authorId: me.id, body, createdAt: new Date().toISOString() };
    this.state.positions.push(position);
    this.save();
    return structuredClone(position);
  }

  async castVote(input: { positionId: string; value: 1 | -1 | 0 }) {
    const me = this.me();
    const position = this.state.positions.find((s) => s.id === input.positionId);
    if (!position) throw new Error('No such position.');
    const thread = this.state.threads.find((n) => n.id === position.threadId);
    if (thread?.status !== 'open') throw new Error('Voting is closed on this thread.');
    // Support is how the retro pool is split, so nobody can support their own contribution.
    if (position.authorId === me.id && input.value !== 0) throw new Error('You can’t support or oppose your own contribution.');
    this.state.votes = this.state.votes.filter((v) => !(v.positionId === input.positionId && v.memberId === me.id));
    if (input.value !== 0) {
      this.state.votes.push({ positionId: input.positionId, memberId: me.id, value: input.value, castAt: new Date().toISOString() });
    }
    this.save();
  }

  async setBuilderIntent(input: { threadId: string; on: boolean }) {
    const me = this.me();
    this.state.intents = this.state.intents.filter((i) => !(i.threadId === input.threadId && i.memberId === me.id));
    if (input.on) this.state.intents.push({ threadId: input.threadId, memberId: me.id });
    this.save();
  }

  async addComment(input: { positionId: string; body: string }) {
    const me = this.me();
    const position = this.state.positions.find((s) => s.id === input.positionId);
    if (!position) throw new Error('No such position.');
    if (this.thread(position.threadId).status !== 'open') throw new Error('This discussion is closed. Start a new thread for changes.');
    const body = input.body.trim();
    if (!body) throw new Error('A comment cannot be empty.');
    const comment: Comment = { id: newId('c'), positionId: input.positionId, authorId: me.id, body, createdAt: new Date().toISOString() };
    this.state.comments.push(comment);
    this.save();
    return structuredClone(comment);
  }

  async changeBrief(input: { threadId: string; expectedRevision: number; action: BriefAction }): Promise<WorkingBrief> {
    const me = this.me();
    const thread = this.thread(input.threadId);
    const project = this.project(thread.projectId);
    if (thread.status !== 'open' || versionById(project, thread.versionId)?.state === 'frozen') throw new Error('This design is closed. Start a new discussion to change it.');
    const original = this.state.briefs.find(b => b.threadId === thread.id) ?? emptyBrief(thread.id);
    if (input.expectedRevision !== original.revision) throw new Error('The brief changed. Refresh and review the latest revision.');
    const brief = structuredClone(original);
    const sources = discussionSources(this.bundle(thread));
    const action = input.action;
    const lead = roleOf(this.state.roles, project.id, me.id) === 'lead';
    if (action.kind !== 'item') this.requireLead(project.id, me);
    switch (action.kind) {
      case 'purpose': {
        if (!action.text.trim()) throw new Error('Write the intended outcome.');
        brief.purpose = action.text.trim();
        break;
      }
      case 'item': {
        if (!['requirement', 'deliverable', 'question', 'evidence', 'exclusion'].includes(action.itemKind)) throw new Error('Unknown brief item kind.');
        const text = action.text.trim();
        if (!text) throw new Error('Write a brief item.');
        const selected = [...new Set(action.sourceKeys)].map(key => {
          const source = sources.find(s => s.key === key);
          if (!source) throw new Error('Every source must belong to this discussion.');
          return structuredClone(source);
        });
        if (!selected.length) throw new Error('Link at least one discussion source. New proposals can link to the original question.');
        const existing = action.id ? brief.items.find(i => i.id === action.id) : undefined;
        if (action.id && !existing) throw new Error('No such brief item.');
        if (existing && !lead && (existing.authorId !== me.id || existing.status !== 'proposed')) throw new Error('Only the lead or the author of a pending proposal can edit it.');
        const item = {
          id: existing?.id ?? newId('bi'), kind: action.itemKind, text,
          verification: action.verification.trim(), sources: selected,
          authorId: existing?.authorId ?? me.id, updatedBy: me.id,
          status: 'proposed' as const, rationale: '',
        };
        if (existing) brief.items.splice(brief.items.indexOf(existing), 1, item);
        else brief.items.push(item);
        break;
      }
      case 'decide': {
        const item = brief.items.find(i => i.id === action.id);
        if (!item) throw new Error('No such brief item.');
        if (!['accepted', 'dismissed'].includes(action.status)) throw new Error('Unknown decision.');
        if ((action.status === 'dismissed' || item.kind === 'question' || item.kind === 'exclusion') && !action.rationale.trim()) throw new Error('Record the answer or the reason for leaving this out.');
        if (action.status === 'accepted' && item.kind === 'deliverable' && !item.verification.trim()) throw new Error('A deliverable needs an acceptance check.');
        item.status = action.status;
        item.rationale = action.rationale.trim();
        item.decidedBy = me.id;
        break;
      }
      case 'review': {
        const source = sources.find(s => s.key === action.sourceKey);
        if (!source) throw new Error('No such discussion source.');
        brief.reviewed = brief.reviewed.filter(r => r.source.key !== source.key);
        brief.reviewed.push({ source: structuredClone(source), byMemberId: me.id });
        break;
      }
      case 'approve': {
        const issues = briefIssues({ ...this.bundle(thread), brief });
        if (issues.length) throw new Error(issues.join(' '));
        break;
      }
      default: throw new Error('Unknown brief action.');
    }
    brief.revision++;
    brief.approval = action.kind === 'approve' ? {
      byMemberId: me.id, at: new Date().toISOString(), revision: brief.revision,
      versionId: thread.versionId, corpus: corpusKey(this.bundle(thread)),
    } : undefined;
    brief.history.push({ revision: brief.revision, byMemberId: me.id, at: new Date().toISOString(), action: action.kind, content: briefContent(brief) });
    this.state.briefs = this.state.briefs.filter(b => b.threadId !== thread.id);
    this.state.briefs.push(brief);
    this.save();
    return structuredClone(brief);
  }

  async saveOutcome(input: { threadId: string; expectedRevision: number; body: string; openQuestions: string }): Promise<OutcomeDraft> {
    const me = this.me(), thread = this.thread(input.threadId);
    const version = versionById(this.project(thread.projectId), thread.versionId);
    if (thread.status !== 'open' || !version || !['discussing', 'planned', 'building'].includes(version.state)) throw new Error('This discussion is closed to draft changes.');
    const existing = this.state.drafts?.find(d => d.threadId === thread.id);
    if ((existing?.revision ?? 0) !== input.expectedRevision) throw new Error('The draft changed. Reload to review the latest revision; your text has not been saved.');
    if (existing && existing.authorId !== me.id) this.requireLead(thread.projectId, me);
    if (!input.body.trim()) throw new Error('Write a draft outcome first.');
    const at = new Date().toISOString(), revision = (existing?.revision ?? 0) + 1;
    const content = { body: input.body.trim(), openQuestions: input.openQuestions.trim() };
    const draft: OutcomeDraft = { ...content, threadId: thread.id, authorId: existing?.authorId ?? me.id, updatedBy: me.id, updatedAt: at, revision,
      history: [...(existing?.history ?? []), { revision, byMemberId: me.id, at, content: structuredClone(content) }] };
    this.state.drafts = [...(this.state.drafts ?? []).filter(d => d.threadId !== thread.id), draft];
    this.save();
    return structuredClone(draft);
  }

  private workFromOutcome(thread: Thread, snapshot: OutcomeSnapshot, work: WorkInput, me: Member, decisionId?: string): Grant {
    validateWork(work);
    if (work.amount !== undefined && (!Number.isFinite(work.amount) || work.amount < 0)) throw new Error('Reward must be zero or more $ARROW.');
    if (snapshot.openQuestions.trim() && work.purpose !== 'research') throw new Error('Resolve open questions before commissioning implementation, or define research work to answer them.');
    const at = new Date().toISOString();
    const authors = [...new Set(snapshot.sources.map(s => s.authorId))];
    return {
      id: newId('g'), projectId: thread.projectId, versionId: snapshot.versionId, threadId: thread.id,
      positionId: '', title: work.title.trim(), scope: `${work.scope.trim()}\n\n## Acceptance criteria\n\n${work.acceptance.trim()}`,
      // The proposer award from the 2026-09-23 call: whoever raised the idea gets a slice of the work it becomes.
      constraints: [], proposerIds: [thread.authorId], proposerShare: DEFAULT_PROPOSER_SHARE,
      contributorIds: authors.filter(id => id !== thread.authorId),
      weightedRankAtResolution: 0, rawRankAtResolution: 0,
      byMemberId: me.id, createdAt: at, updatedAt: at, status: 'draft',
      tracking: { revision: 0, stage: 'draft', ownerId: '', dueDate: '', funding: 'unfunded', budget: '', ...(work.amount ? { amount: Math.floor(work.amount) } : {}), acceptance: work.acceptance.trim(), evidence: '', milestones: [], decisionIds: decisionId ? [decisionId] : [], history: [] },
      workKind: work.kind, workPurpose: work.purpose, decisionIds: decisionId ? [decisionId] : [], outcomeSnapshot: structuredClone(snapshot),
    };
  }

  async concludeThread(input: { threadId: string; expectedRevision: number; expectedCorpus: string; adopt: boolean; decision?: string; work?: WorkInput }) {
    const me = this.me(), thread = this.thread(input.threadId);
    this.requireLead(thread.projectId, me);
    const version = versionById(this.project(thread.projectId), thread.versionId);
    if (thread.status !== 'open' || !version || !['discussing', 'planned', 'building'].includes(version.state)) throw new Error('This discussion is already closed.');
    const bundle = this.bundle(thread), draft = bundle.draft;
    if (!draft || draft.revision !== input.expectedRevision) throw new Error('Save and review the latest draft first.');
    if (corpusKey(bundle) !== input.expectedCorpus) throw new Error('New discussion arrived. Read it before recording an outcome.');
    if (input.adopt && draft.openQuestions.trim()) throw new Error('Resolve the open questions in the draft before adopting a design change. Research can proceed without adoption.');
    const snapshot: OutcomeSnapshot = { body: draft.body, openQuestions: draft.openQuestions, revision: draft.revision, threadId: thread.id, versionId: thread.versionId,
      byMemberId: me.id, at: new Date().toISOString(), sources: discussionSources(bundle) };
    const decisionId = input.adopt ? newId('d') : undefined;
    // Validate all requested outputs before committing any of them.
    const grant = input.work ? this.workFromOutcome(thread, snapshot, input.work, me, decisionId) : undefined;
    // A decision is recorded as its answer, not its question: "Separate regulator per servo", not "How should…?".
    const answer = (input.decision?.trim() || firstLine(draft.body) || thread.title).slice(0, 240);
    if (decisionId) this.state.decisions.push({
      id: decisionId, projectId: thread.projectId, versionId: thread.versionId, threadId: thread.id, positionId: '',
      question: thread.title, chosen: answer, rationale: 'Adopted from the reviewed discussion outcome.',
      weightedRankAtDecision: 0, rawRankAtDecision: 0, byMemberId: me.id, at: snapshot.at, status: 'decided', outcomeSnapshot: structuredClone(snapshot),
    });
    if (grant) this.state.grants.push(grant);
    thread.resolution = { kind: 'conclude', byMemberId: me.id, at: snapshot.at, snapshot, decisionId, grantIds: grant ? [grant.id] : [] };
    thread.status = 'resolved';
    this.save();
    return structuredClone(thread);
  }

  async createWork(input: { threadId: string; work: WorkInput }) {
    const me = this.me(), thread = this.thread(input.threadId);
    this.requireLead(thread.projectId, me);
    const resolution = thread.resolution;
    if (!resolution || !['conclude','spec'].includes(resolution.kind)) throw new Error('Record the discussion outcome before commissioning follow-on work.');
    let snapshot: OutcomeSnapshot, decisionId: string | undefined;
    if (resolution.kind === 'conclude') { snapshot = resolution.snapshot; decisionId = resolution.decisionId; }
    else if (resolution.kind === 'spec') {
      const decision = this.state.decisions.find(d=>d.id===resolution.decisionId)!;
      const bundle = this.bundle(thread);
      snapshot = decision.outcomeSnapshot ?? { threadId:thread.id, versionId:thread.versionId, revision:0, byMemberId:resolution.byMemberId, at:resolution.at, openQuestions:'', sources:discussionSources(bundle), body:decision.briefSnapshot ? briefMarkdown(decision.briefSnapshot, thread.projectId) : bundle.positions.find(p=>p.id===decision.positionId)?.body ?? decision.chosen };
      decisionId = decision.id;
    } else throw new Error('Unsupported work source.');
    const grant = this.workFromOutcome(thread, snapshot, input.work, me, decisionId);
    this.state.grants.push(grant);
    if (resolution.kind === 'conclude') resolution.grantIds.push(grant.id);
    this.save();
    return structuredClone(grant);
  }

  async resolveThread(input: ResolveInput) {
    const me = this.me();
    const thread = this.thread(input.threadId);
    const project = this.project(thread.projectId);
    const leadRole = roleOf(this.state.roles, project.id, me.id);
    const bundle = this.bundle(thread);
    this.requireLead(project.id, me);
    if (input.kind === 'grant') {
      const issues = grantBriefIssues(bundle);
      if (issues.length) throw new Error(issues.join(' '));
    }
    if (input.kind === 'spec' && bundle.brief) snapshotBrief(bundle);
    const { tallies } = analyzeThread({ bundle, members: this.state.members, roles: this.state.roles, project });
    const findPosition = (id: string) => {
      const p = bundle.positions.find((s) => s.id === id);
      if (!p) throw new Error('No such position on this thread.');
      return p;
    };

    switch (input.kind) {
      case 'reject': {
        thread.resolution = rejectThread({ thread, leadId: me.id, leadRole, note: input.note });
        thread.status = 'resolved';
        break;
      }
      case 'spec': {
        const { resolution, decision } = promoteToSpec({
          thread,
          position: findPosition(input.positionId),
          leadId: me.id,
          leadRole,
          tallies,
          overrideRationale: input.overrideRationale,
          decisionId: newId('d'),
        });
        if (bundle.brief) {
          decision.briefSnapshot = snapshotBrief(bundle);
          decision.chosen = bundle.brief.purpose;
        }
        this.state.decisions.push(decision);
        thread.resolution = resolution;
        thread.status = 'resolved';
        break;
      }
      case 'grant': {
        const position = findPosition(input.positionId);
        const { resolution, grant } = promoteToGrant({
          thread,
          position,
          comments: bundle.comments.filter((c) => c.positionId === position.id),
          leadId: me.id,
          leadRole,
          tallies,
          overrideRationale: input.overrideRationale,
          proposerShare: input.proposerShare,
          grantId: newId('g'),
        });
        const snapshot = snapshotBrief(bundle);
        grant.briefSnapshot = snapshot;
        // Requirements have one editable home (grant.constraints), not a second copy in scope.
        grant.scope = briefMarkdown(snapshot, project.id, true);
        grant.constraints = snapshot.items.filter(i => i.kind === 'requirement' && i.status === 'accepted').map(i => i.text);
        const credit = snapshot.items.filter(i => i.status === 'accepted').flatMap(i => [i.authorId, i.updatedBy, ...i.sources.map(s => s.authorId)]);
        grant.contributorIds = [...new Set(credit)].filter(id => !grant.proposerIds.includes(id));
        this.state.grants.push(grant);
        thread.resolution = resolution;
        thread.status = 'resolved';
        break;
      }
      case 'defer': {
        const deferral = deferThread({ thread, project, leadId: me.id, leadRole, toVersionId: input.toVersionId, note: input.note });
        thread.deferrals.push(deferral);
        thread.versionId = deferral.toVersionId;
        break;
      }
    }
    this.save();
    return structuredClone(thread);
  }

  async updateGrant(input: { id: string; expectedRevision?: number } & Partial<Pick<Grant, 'title' | 'scope' | 'constraints' | 'proposerShare' | 'proposerIds'>>) {
    const me = this.me();
    const stored = this.state.grants.find((g) => g.id === input.id);
    if (!stored) throw new Error('No such grant.');
    const grant = structuredClone(stored);
    grant.tracking ??= trackingOf(grant);
    this.requireLead(grant.projectId, me);
    if (input.expectedRevision !== undefined && input.expectedRevision !== trackingOf(grant).revision) throw new Error('This work package changed. Reload before saving scope.');
    if (grant.status !== 'draft') throw new Error('This grant is published. Edit it where it was published.');
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) throw new Error('A grant requires a title.');
      grant.title = title;
    }
    if (input.scope !== undefined) grant.scope = input.scope.trim();
    if (input.constraints !== undefined) grant.constraints = input.constraints.map((c) => c.trim()).filter(Boolean);
    if (input.proposerShare !== undefined) {
      if (!Number.isFinite(input.proposerShare) || input.proposerShare < 0 || input.proposerShare > 1) throw new Error('Proposer share must be between 0 and 1.');
      grant.proposerShare = input.proposerShare;
    }
    if (input.proposerIds !== undefined) {
      const ids = [...new Set(input.proposerIds)];
      if (ids.some((id) => !this.state.members.some((m) => m.id === id))) throw new Error('Unknown proposer.');
      if (ids.length === 0) throw new Error('A grant from a thread keeps at least one proposer.');
      grant.proposerIds = ids;
    }
    grant.updatedAt = new Date().toISOString();
    if (grant.tracking) {
      const acceptance = grant.scope.split('## Acceptance criteria\n')[1]?.trim();
      if (acceptance !== undefined) grant.tracking.acceptance = acceptance;
      grant.tracking.revision += 1;
      grant.tracking.history.push({ at: grant.updatedAt, byMemberId: me.id, note: 'Updated draft scope or attribution.', content: progressOf(grant.tracking) });
    }
    this.state.grants = this.state.grants.map(g=>g.id===grant.id ? grant : g);
    this.save();
    return structuredClone(grant);
  }

  async publishGrant(grantId: string) {
    const grant = await this.getGrant(grantId);
    if (!grant) throw new Error('No such grant.');
    const old = trackingOf(grant);
    return this.updateWork({ id: grantId, expectedRevision: old.revision, content: { ...progressOf(old), stage: 'open' }, note: 'Opened for contributors.' });
  }

  async freezeVersion(input: { projectId: string; versionId: string }) {
    const me = this.me();
    const project = this.project(input.projectId);
    this.requireLead(project.id, me);
    const check = freezeCheck(project, input.versionId, this.state.threads);
    if (!check.canFreeze) {
      throw new Error(
        check.version.state !== 'discussing'
          ? `${check.version.name} is not in discussion.`
          : `${check.open.length} ${check.open.length === 1 ? 'thread is' : 'threads are'} still open on ${check.version.name}. Resolve or defer every one first.`,
      );
    }
    const baselineSections = effectiveSections(project, input.versionId, this.state.specifications ?? []);
    const currentIds = new Set(currentDecisions(project, input.versionId, this.state.decisions).map(d=>d.id));
    if (baselineSections.some(s=>s.decisionIds.some(id=>!currentIds.has(id)))) throw new Error('Reconcile specification sections with replaced decisions before freezing.');
    const inherited = effectiveSections(project, input.versionId, this.state.specifications ?? []).filter(s => s.versionId !== input.versionId);
    this.state.specifications = [...(this.state.specifications ?? []), ...inherited.map(s => ({ ...structuredClone(s), id: newId('spec'), versionId: input.versionId }))];
    const pool = check.version.retroPool;
    // The retro allocation is fixed at the moment of the freeze so later votes cannot change it.
    const allocation = pool ? { ...allocateRetro(pool, scoredContributions({ project, versionId: input.versionId, bundles: this.state.threads.map(t => this.bundle(t)), members: this.state.members, roles: this.state.roles })), at: new Date().toISOString(), byMemberId: me.id } : undefined;
    project.versions = freezeVersions({ project, versionId: input.versionId, byMemberId: me.id }).map(v => v.id === input.versionId && allocation ? { ...v, retroAllocation: allocation } : v);
    this.save();
    return structuredClone(project);
  }

  async listSpecifications() { return structuredClone(this.state.specifications ?? []); }

  async saveSpecification(input: Parameters<Backend['saveSpecification']>[0]) {
    const me = this.me(), project = this.project(input.projectId);
    this.requireLead(project.id, me);
    const version = versionById(project, input.versionId);
    if (!version || !['discussing', 'planned'].includes(version.state)) throw new Error('This design baseline is locked. Start a follow-up discussion for the next version.');
    if (![...project.systems, 'project-wide'].includes(input.system)) throw new Error('Unknown subsystem.');
    const old = this.state.specifications?.find(s => s.projectId === project.id && s.versionId === version.id && s.system === input.system);
    if ((old?.revision ?? 0) !== input.expectedRevision) throw new Error('The specification changed. Reload before saving.');
    if (!input.body.trim() || !input.note.trim()) throw new Error('Write the specification and a revision note.');
    const current = currentDecisions(project, version.id, this.state.decisions);
    const ids = [...new Set(input.decisionIds)];
    if (!ids.length || ids.some(id => !current.some(d => d.id === id))) throw new Error('Link current adopted decisions from this design baseline.');
    const content = { body: input.body.trim(), decisionIds: ids }, at = new Date().toISOString();
    const next: SpecificationSection = { id: old?.id ?? newId('spec'), projectId: project.id, versionId: version.id, system: input.system, revision: (old?.revision ?? 0) + 1, updatedBy: me.id, updatedAt: at, ...content,
      history: [...(old?.history ?? []), { revision: (old?.revision ?? 0) + 1, at, byMemberId: me.id, note: input.note.trim(), content: structuredClone(content) }] };
    this.state.specifications = [...(this.state.specifications ?? []).filter(s => s.id !== next.id), next];
    this.save(); return structuredClone(next);
  }

  async supersedeDecisions(input: Parameters<Backend['supersedeDecisions']>[0]) {
    const me = this.me(), decision = this.state.decisions.find(d => d.id === input.decisionId);
    if (!decision) throw new Error('No such decision.');
    this.requireLead(decision.projectId, me);
    const project = this.project(decision.projectId), version = versionById(project, decision.versionId)!;
    if (!['discussing', 'planned'].includes(version.state)) throw new Error('This design baseline is locked.');
    if (decision.supersedesIds?.length) throw new Error('Replacement history is already recorded. Adopt a new decision to change it.');
    const current = currentDecisions(project, version.id, this.state.decisions);
    const ids = [...new Set(input.supersedesIds)];
    if (!current.some(d => d.id === decision.id) || !ids.length || !input.note.trim()) throw new Error('Choose current decisions and explain their replacement.');
    if (ids.some(id => id === decision.id || !current.some(d => d.id === id))) throw new Error('Only other current decisions in this baseline may be replaced.');
    // Never rewrite old documents or old baselines. The new decision owns this relation.
    decision.supersedesIds = ids; decision.supersessionNote = input.note.trim();
    this.save(); return structuredClone(decision);
  }

  async updateWork(input: Parameters<Backend['updateWork']>[0]) {
    const me = this.me(), grant = this.state.grants.find(g => g.id === input.id);
    if (!grant) throw new Error('No such work package.');
    const old = trackingOf(grant), next = JSON.parse(JSON.stringify(input.content)) as typeof input.content;
    if (old.revision !== input.expectedRevision) throw new Error('This work package changed. Reload before saving.');
    const lead = roleOf(this.state.roles, grant.projectId, me.id) === 'lead';
    if (!lead && old.ownerId !== me.id) throw new Error('Only the lead or assigned owner can update this work.');
    if (!input.note.trim()) throw new Error('Add an update note.');
    if (!Object.prototype.hasOwnProperty.call(transitions, next.stage) || !['unfunded', 'proposed', 'funded', 'paid'].includes(next.funding)) throw new Error('Choose a valid work and funding status.');
    if (next.stage !== old.stage && !transitions[old.stage].includes(next.stage)) throw new Error('That work status transition is not allowed.');
    if (!lead) {
      const stable = (x: typeof next) => ({ ownerId: x.ownerId, dueDate: x.dueDate, funding: x.funding, budget: x.budget, amount: x.amount ?? 0, acceptance: x.acceptance, decisionIds: x.decisionIds, milestones: x.milestones.map(m => ({ id: m.id, title: m.title, acceptance: m.acceptance, completed: m.completed })) });
      if (JSON.stringify(stable(next)) !== JSON.stringify(stable(progressOf(old))) || (next.stage !== old.stage && !['in_progress', 'in_review'].includes(next.stage))) throw new Error('Only the lead changes scope, assignments, funding, or accepts completion.');
    }
    if (next.ownerId && !this.state.members.some(m => m.id === next.ownerId)) throw new Error('Unknown work owner.');
    if (next.amount !== undefined && (!Number.isFinite(next.amount) || next.amount < 0)) throw new Error('Reward must be zero or more $ARROW.');
    if (next.amount !== undefined) next.amount = Math.floor(next.amount);
    if (next.dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(next.dueDate) || Number.isNaN(Date.parse(next.dueDate)))) throw new Error('Use a valid due date.');
    if (next.stage !== 'draft' && next.stage !== 'cancelled' && (!grant.scope.trim() || !next.acceptance.trim())) throw new Error('Define scope and acceptance criteria before opening work.');
    if (['in_progress', 'in_review', 'completed'].includes(next.stage) && !next.ownerId) throw new Error('Assign an owner before starting work.');
    if (['in_review', 'completed'].includes(next.stage) && !validEvidence(next.evidence)) throw new Error('Attach result evidence before review or completion.');
    if (new Set(next.milestones.map(m => m.id)).size !== next.milestones.length || next.milestones.some(m => !m.id || !m.title.trim() || !m.acceptance.trim() || (m.completed && !validEvidence(m.evidence)))) throw new Error('Milestones need unique IDs, titles, acceptance criteria, and evidence for completion.');
    if (next.stage === 'completed' && next.milestones.some(m => !m.completed)) throw new Error('Accept every milestone before completing the work.');
    const versions = designDecisions(this.project(grant.projectId), grant.versionId, this.state.decisions);
    next.decisionIds = [...new Set(next.decisionIds)];
    if (next.decisionIds.some(id => !versions.some(d => d.id === id))) throw new Error('Link decisions from this work package’s design baseline.');
    if (old.stage === 'completed' || old.stage === 'cancelled') {
      const immutable = (x: typeof next) => { const { funding, budget, amount, ...rest } = x; return rest; };
      if (JSON.stringify(immutable(next)) !== JSON.stringify(immutable(progressOf(old)))) throw new Error('Closed work keeps its accepted record. Create follow-on work for changes.');
    }
    const at = new Date().toISOString();
    const tracking: WorkTracking = { ...next, revision: old.revision + 1, history: [...old.history, { at, byMemberId: me.id, note: input.note.trim(), content: structuredClone(next) }] };
    if (grant.tracking?.acceptance !== next.acceptance) grant.scope = grant.scope.split('## Acceptance criteria\n')[0].trimEnd() + '\n\n## Acceptance criteria\n\n' + next.acceptance.trim();
    grant.tracking = tracking; grant.decisionIds = [...next.decisionIds]; grant.status = next.stage === 'draft' ? 'draft' : 'published'; grant.updatedAt = at;
    this.save(); return structuredClone(grant);
  }

  async startFollowUp(input: Parameters<Backend['startFollowUp']>[0]) {
    this.me();
    const d = input.decisionId ? this.state.decisions.find(d => d.id === input.decisionId) : undefined;
    const g = input.grantId ? this.state.grants.find(g => g.id === input.grantId) : undefined;
    if ((!d && !g) || (input.decisionId && !d) || (input.grantId && !g) || (d && g && d.projectId !== g.projectId)) throw new Error('Choose a valid source decision or work package.');
    if (!input.body.trim()) throw new Error('Describe the finding or question.');
    const source = d ?? g!, project = this.project(source.projectId);
    const sourceOrder = versionById(project, source.versionId)!.order;
    const version = project.versions.filter(v => v.order >= sourceOrder && ['discussing', 'planned'].includes(v.state)).sort((a,b) => a.order - b.order)[0];
    if (!version) throw new Error('No upcoming version is open for a follow-up.');
    const original = this.thread(source.threadId);
    const thread = await this.createThread({ projectId: project.id, versionId: version.id, title: input.title, body: input.body, tags: original.tags, system: original.system });
    const saved = this.thread(thread.id); saved.sourceDecisionId = d?.id; saved.sourceGrantId = g?.id;
    this.save(); return structuredClone(saved);
  }

  /** Lead only. Confirm who gets a work package's proposer award, e.g. after checking the call notes. */
  async assignProposers(input: { id: string; proposerIds: string[] }) {
    const me = this.me(), grant = this.state.grants.find(g => g.id === input.id);
    if (!grant) throw new Error('No such work package.');
    this.requireLead(grant.projectId, me);
    const ids = [...new Set(input.proposerIds)];
    if (!ids.length || ids.some(id => !this.state.members.some(m => m.id === id))) throw new Error('Choose one or more members.');
    grant.proposerIds = ids;
    grant.proposerConfirmedBy = me.id;
    grant.proposerConfirmedAt = new Date().toISOString();
    grant.updatedAt = grant.proposerConfirmedAt;
    this.save();
    return structuredClone(grant);
  }

  /** Lead only. Set someone's project role and the expertise the lead has confirmed. */
  async setMemberStanding(input: { projectId: string; memberId: string; role?: Role; verifiedExpertise?: string[] }) {
    const me = this.me(), project = this.project(input.projectId);
    this.requireLead(project.id, me);
    const member = this.state.members.find(m => m.id === input.memberId);
    if (!member) throw new Error('No such member.');
    if (input.role !== undefined) {
      if (!['lead', 'core', 'member'].includes(input.role)) throw new Error('Choose a valid role.');
      const leads = this.state.roles.filter(r => r.projectId === project.id && r.role === 'lead');
      if (input.role !== 'lead' && leads.length === 1 && leads[0].memberId === member.id) throw new Error('A project keeps at least one lead. Make someone else lead first.');
      const role = this.state.roles.find(r => r.projectId === project.id && r.memberId === member.id);
      if (role) role.role = input.role; else this.state.roles.push({ projectId: project.id, memberId: member.id, role: input.role });
    }
    if (input.verifiedExpertise !== undefined) member.verifiedExpertise = [...new Set(input.verifiedExpertise.map(t => t.trim().toLowerCase()).filter(Boolean))].slice(0, 30);
    this.save();
    return structuredClone(member);
  }

  /** Lead only. The freeze target date and the retro pool for a version that is still open. */
  async setVersionPlan(input: { projectId: string; versionId: string; freezeTarget?: string; retroPool?: { amount: number; systemShares?: Record<string, number> } | null }) {
    const me = this.me(), project = this.project(input.projectId);
    this.requireLead(project.id, me);
    const version = versionById(project, input.versionId);
    if (!version || !['discussing', 'planned'].includes(version.state)) throw new Error('Only a version that is still open can be planned.');
    if (input.freezeTarget !== undefined) {
      if (input.freezeTarget && (!/^\d{4}-\d{2}-\d{2}$/.test(input.freezeTarget) || Number.isNaN(Date.parse(input.freezeTarget)))) throw new Error('Use a valid freeze date.');
      version.freezeTarget = input.freezeTarget || undefined;
    }
    if (input.retroPool === null) delete version.retroPool;
    else if (input.retroPool) {
      const { amount, systemShares = {} } = input.retroPool;
      if (!Number.isFinite(amount) || amount < 0) throw new Error('The retro pool must be zero or more $ARROW.');
      const shares = Object.fromEntries(Object.entries(systemShares).filter(([, v]) => v > 0));
      if (Object.keys(shares).some(k => ![...project.systems, PROJECT_WIDE].includes(k))) throw new Error('Unknown system in the pool split.');
      if (Object.values(shares).some(v => !Number.isFinite(v) || v < 0) || Object.values(shares).reduce((a, b) => a + b, 0) > 1.0001) throw new Error('System shares must add up to 100% or less.');
      version.retroPool = { amount: Math.floor(amount), ...(Object.keys(shares).length ? { systemShares: shares } : {}), setBy: me.id, setAt: new Date().toISOString() };
    }
    this.save();
    return structuredClone(project);
  }

  async updateProfile(input: Partial<Pick<Member, 'tokenBalance' | 'expertise' | 'location' | 'bio'>>) {
    const me = this.me();
    if (input.tokenBalance !== undefined) {
      if (!Number.isFinite(input.tokenBalance) || input.tokenBalance < 0) throw new Error('Token balance must be zero or more.');
      me.tokenBalance = Math.floor(input.tokenBalance);
    }
    if (input.expertise) me.expertise = [...new Set(input.expertise.map((t) => t.trim().toLowerCase()).filter(Boolean))];
    if (input.location !== undefined) me.location = input.location.trim();
    if (input.bio !== undefined) me.bio = input.bio.trim();
    this.save();
    return structuredClone(me);
  }

  async reset() {
    this.storage.removeItem(this.key);
    this.state = this.enrich(this.seed());
    this.save();
  }
}
