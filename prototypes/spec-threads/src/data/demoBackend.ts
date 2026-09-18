// Demo backend: everything lives in this browser's localStorage, seeded from seed.ts.
// No server, no accounts. A persona switcher stands in for sign-in so one person can
// play the lead, the expert, and the crowd to see how the weighting behaves.

import type { Comment, Member, Need, Spec } from '../lib/types';
import { NotSignedInError, type Backend, type NeedBundle } from './backend';
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

  private bundle(need: Need): NeedBundle {
    const specs = this.state.specs.filter((s) => s.needId === need.id);
    const specIds = new Set(specs.map((s) => s.id));
    return structuredClone({
      need,
      specs,
      votes: this.state.votes.filter((v) => specIds.has(v.specId)),
      intents: this.state.intents.filter((i) => i.needId === need.id),
      comments: this.state.comments.filter((c) => specIds.has(c.specId)),
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
  async listNeeds() {
    return structuredClone(this.state.needs).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async listBundles() {
    return this.state.needs.map((n) => this.bundle(n));
  }
  async getBundle(needId: string) {
    const need = this.state.needs.find((n) => n.id === needId);
    return need ? this.bundle(need) : null;
  }

  async createNeed(input: { projectId: string; title: string; body: string; tags: string[] }) {
    const me = this.me();
    if (!this.state.projects.some((p) => p.id === input.projectId)) throw new Error('No such project.');
    const title = input.title.trim();
    if (!title) throw new Error('A need requires a title.');
    const need: Need = {
      id: newId('n'),
      projectId: input.projectId,
      title,
      body: input.body.trim(),
      tags: [...new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))],
      authorId: me.id,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    this.state.needs.push(need);
    this.save();
    return structuredClone(need);
  }

  async createSpec(input: { needId: string; body: string }) {
    const me = this.me();
    const need = this.state.needs.find((n) => n.id === input.needId);
    if (!need) throw new Error('No such need.');
    if (need.status !== 'open') throw new Error('This need is closed to new specs.');
    const body = input.body.trim();
    if (!body) throw new Error('A spec cannot be empty.');
    const spec: Spec = { id: newId('s'), needId: need.id, authorId: me.id, body, createdAt: new Date().toISOString() };
    this.state.specs.push(spec);
    this.save();
    return structuredClone(spec);
  }

  async castVote(input: { specId: string; value: 1 | -1 | 0 }) {
    const me = this.me();
    const spec = this.state.specs.find((s) => s.id === input.specId);
    if (!spec) throw new Error('No such spec.');
    const need = this.state.needs.find((n) => n.id === spec.needId);
    if (need?.status !== 'open') throw new Error('Voting is closed on this need.');
    this.state.votes = this.state.votes.filter((v) => !(v.specId === input.specId && v.memberId === me.id));
    if (input.value !== 0) {
      this.state.votes.push({ specId: input.specId, memberId: me.id, value: input.value, castAt: new Date().toISOString() });
    }
    this.save();
  }

  async setBuilderIntent(input: { needId: string; on: boolean }) {
    const me = this.me();
    this.state.intents = this.state.intents.filter((i) => !(i.needId === input.needId && i.memberId === me.id));
    if (input.on) this.state.intents.push({ needId: input.needId, memberId: me.id });
    this.save();
  }

  async addComment(input: { specId: string; body: string }) {
    const me = this.me();
    if (!this.state.specs.some((s) => s.id === input.specId)) throw new Error('No such spec.');
    const body = input.body.trim();
    if (!body) throw new Error('A comment cannot be empty.');
    const comment: Comment = { id: newId('c'), specId: input.specId, authorId: me.id, body, createdAt: new Date().toISOString() };
    this.state.comments.push(comment);
    this.save();
    return structuredClone(comment);
  }

  async recordPromotion(input: { needId: string; promotion: NonNullable<Need['promotion']> }) {
    this.me();
    const need = this.state.needs.find((n) => n.id === input.needId);
    if (!need) throw new Error('No such need.');
    if (need.status !== 'open') throw new Error('This need already has a promoted spec.');
    need.promotion = structuredClone(input.promotion);
    need.status = 'bounty';
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
