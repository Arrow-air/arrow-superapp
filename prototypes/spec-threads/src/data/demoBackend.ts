// Demo backend: everything lives in this browser's localStorage, seeded from seed.ts.
// No server, no accounts. A persona switcher stands in for sign-in so one person can
// play the lead, the expert, and the crowd to see how the weighting behaves.

import type { Comment, Member, Thread, Position } from '../lib/types';
import { NotSignedInError, type Backend, type ThreadBundle } from './backend';
import { seedState, type DemoState } from './seed';

const KEY = 'arrow-spec-threads-demo-v1';

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
      if (raw) return JSON.parse(raw) as DemoState;
    } catch {
      // Corrupt or unreadable storage: fall through to a fresh seed.
    }
    return seedState();
  }

  private save() {
    this.storage.setItem(KEY, JSON.stringify(this.state));
  }

  private me(): Member {
    const m = this.state.members.find((x) => x.id === this.state.actingAs);
    if (!m) throw new NotSignedInError();
    return m;
  }

  private bundle(thread: Thread): ThreadBundle {
    const positions = this.state.positions.filter((s) => s.threadId === thread.id);
    const positionIds = new Set(positions.map((s) => s.id));
    return structuredClone({
      thread,
      positions,
      votes: this.state.votes.filter((v) => positionIds.has(v.positionId)),
      intents: this.state.intents.filter((i) => i.threadId === thread.id),
      comments: this.state.comments.filter((c) => positionIds.has(c.positionId)),
    });
  }

  async currentMember() {
    const m = this.state.members.find((x) => x.id === this.state.actingAs);
    return m ? structuredClone(m) : null;
  }

  async signIn() {
    this.state.actingAs = this.state.members[0]?.id ?? null;
    this.save();
  }

  async signOut() {
    this.state.actingAs = null;
    this.save();
  }

  async actAs(memberId: string) {
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

  async createThread(input: { projectId: string; title: string; body: string; tags: string[] }) {
    const me = this.me();
    if (!this.state.projects.some((p) => p.id === input.projectId)) throw new Error('No such project.');
    const title = input.title.trim();
    if (!title) throw new Error('A thread requires a title.');
    const thread: Thread = {
      id: newId('n'),
      projectId: input.projectId,
      title,
      body: input.body.trim(),
      tags: [...new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))],
      authorId: me.id,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    this.state.threads.push(thread);
    this.save();
    return structuredClone(thread);
  }

  async createPosition(input: { threadId: string; body: string }) {
    const me = this.me();
    const thread = this.state.threads.find((n) => n.id === input.threadId);
    if (!thread) throw new Error('No such thread.');
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
    if (!this.state.positions.some((s) => s.id === input.positionId)) throw new Error('No such position.');
    const body = input.body.trim();
    if (!body) throw new Error('A comment cannot be empty.');
    const comment: Comment = { id: newId('c'), positionId: input.positionId, authorId: me.id, body, createdAt: new Date().toISOString() };
    this.state.comments.push(comment);
    this.save();
    return structuredClone(comment);
  }

  async recordPromotion(input: { threadId: string; promotion: NonNullable<Thread['promotion']> }) {
    this.me();
    const thread = this.state.threads.find((n) => n.id === input.threadId);
    if (!thread) throw new Error('No such thread.');
    if (thread.status !== 'open') throw new Error('This thread already has a promoted position.');
    thread.promotion = structuredClone(input.promotion);
    thread.status = 'bounty';
    this.save();
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
