// Demo backend: everything lives in this browser's localStorage, seeded from seed.ts.
// No server, no accounts. A persona switcher stands in for sign-in so one person can
// play the lead, the expert, and the crowd to see how the weighting and the freeze behave.
//
// The resolution rules live in src/lib and run here, on the "server" side of the seam, so
// the UI only states intent ("turn this thread into a grant") and cannot skip a check.

import { briefContent, briefIssues, briefMarkdown, corpusKey, discussionSources, emptyBrief, grantBriefIssues, snapshotBrief } from '../lib/brief';
import type { BriefAction } from './backend';
import type { WorkingBrief } from '../lib/types';
import { analyzeThread, roleOf } from '../lib/analyze';
import { deferThread, promoteToGrant, promoteToSpec, rejectThread } from '../lib/resolution';
import type { Comment, Grant, Member, Position, Project, Thread } from '../lib/types';
import { discussingVersion, freezeCheck, freezeVersions, versionById } from '../lib/versions';
import { NotSignedInError, type Backend, type ResolveInput, type ThreadBundle } from './backend';
import { seedState, type DemoState } from './seed';

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

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export class DemoBackend implements Backend {
  readonly kind = 'demo' as const;
  private storage: StorageLike;
  private state: DemoState;

  constructor(storage?: StorageLike) {
    this.storage = storage ?? (typeof localStorage !== 'undefined' ? localStorage : memoryStorage());
    this.state = this.load();
  }

  private load(): DemoState {
    try {
      const raw = this.storage.getItem(KEY);
      if (raw) { const saved = JSON.parse(raw) as DemoState; saved.briefs ??= []; return saved; }
    } catch {
      // Corrupt or unreadable storage: fall through to a fresh seed.
    }
    return seedState();
  }

  private save() {
    this.storage.setItem(KEY, JSON.stringify(this.state));
  }

  private me(): Member {
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

  async updateGrant(input: { id: string } & Partial<Pick<Grant, 'title' | 'scope' | 'constraints' | 'proposerShare' | 'proposerIds'>>) {
    const me = this.me();
    const grant = this.state.grants.find((g) => g.id === input.id);
    if (!grant) throw new Error('No such grant.');
    this.requireLead(grant.projectId, me);
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
    this.save();
    return structuredClone(grant);
  }

  async publishGrant(grantId: string) {
    const me = this.me();
    const grant = this.state.grants.find((g) => g.id === grantId);
    if (!grant) throw new Error('No such grant.');
    this.requireLead(grant.projectId, me);
    grant.status = 'published';
    grant.updatedAt = new Date().toISOString();
    this.save();
    return structuredClone(grant);
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
    project.versions = freezeVersions({ project, versionId: input.versionId, byMemberId: me.id });
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
    this.storage.removeItem(KEY);
    this.state = seedState();
    this.save();
  }
}
