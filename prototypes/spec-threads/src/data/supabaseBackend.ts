// Supabase backend. Mirrors supabase/migrations/20260918000000_spec_threads.sql.
//
// STATUS: written against the schema but NOT yet exercised against a live database.
// The demo backend is the one that has been run. Treat this as a first draft to be
// tested once the migration is applied somewhere safe.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  BuilderIntent,
  Comment,
  Member,
  Thread,
  Project,
  ProjectRole,
  Promotion,
  Position,
  Vote,
} from '../lib/types';
import { NotSignedInError, type Backend, type ThreadBundle } from './backend';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const toMember = (r: Row): Member => ({
  id: r.id,
  handle: r.handle,
  displayName: r.display_name,
  avatarUrl: r.avatar_url ?? undefined,
  tokenBalance: Number(r.token_balance ?? 0),
  expertise: r.expertise ?? [],
  location: r.location ?? undefined,
  bio: r.bio ?? undefined,
});

const toPromotion = (r: Row): Promotion => ({
  positionId: r.spec_id,
  byMemberId: r.by_member_id,
  at: r.at,
  weightedRankAtPromotion: r.weighted_rank_at_promotion,
  rawRankAtPromotion: r.raw_rank_at_promotion,
  overrideRationale: r.override_rationale ?? undefined,
  bountyMarkdown: r.bounty_markdown,
});

const toThread = (r: Row, promotion?: Row): Thread => ({
  id: r.id,
  projectId: r.project_id,
  title: r.title,
  body: r.body,
  tags: r.tags ?? [],
  authorId: r.author_id,
  status: r.status,
  createdAt: r.created_at,
  promotion: promotion ? toPromotion(promotion) : undefined,
});

const toPosition = (r: Row): Position => ({ id: r.id, threadId: r.need_id, authorId: r.author_id, body: r.body, createdAt: r.created_at });
const toVote = (r: Row): Vote => ({ positionId: r.spec_id, memberId: r.member_id, value: r.value, castAt: r.cast_at });
const toIntent = (r: Row): BuilderIntent => ({ threadId: r.need_id, memberId: r.member_id });
const toComment = (r: Row): Comment => ({ id: r.id, positionId: r.spec_id, authorId: r.author_id, body: r.body, createdAt: r.created_at });

// The client is untyped (no generated schema types yet), so results come back as any.
function unwrap(res: { data: unknown; error: { message: string } | null }): any {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export class SupabaseBackend implements Backend {
  readonly kind = 'supabase' as const;
  private db: SupabaseClient;

  constructor(url: string, key: string) {
    this.db = createClient(url, key);
  }

  private async uid(): Promise<string> {
    const { data } = await this.db.auth.getUser();
    if (!data.user) throw new NotSignedInError();
    return data.user.id;
  }

  async currentMember(): Promise<Member | null> {
    const { data } = await this.db.auth.getUser();
    const user = data.user;
    if (!user) return null;
    const existing = await this.db.from('st_members').select('*').eq('id', user.id).maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data) return toMember(existing.data);
    // First sign-in: create the member row from the GitHub identity.
    const meta = user.user_metadata ?? {};
    const handle: string = meta.user_name ?? meta.preferred_username ?? user.email?.split('@')[0] ?? user.id.slice(0, 8);
    const created = await this.db
      .from('st_members')
      .insert({ id: user.id, handle, display_name: meta.full_name ?? meta.name ?? handle, avatar_url: meta.avatar_url ?? null })
      .select('*')
      .single();
    return toMember(unwrap(created));
  }

  async signIn() {
    const { error } = await this.db.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw new Error(error.message);
  }

  async signOut() {
    const { error } = await this.db.auth.signOut();
    if (error) throw new Error(error.message);
  }

  async listProjects(): Promise<Project[]> {
    const rows = unwrap(await this.db.from('st_projects').select('*').order('name'));
    return (rows as Row[]).map((r) => ({ id: r.id, name: r.name, weights: r.weights }));
  }

  async listMembers(): Promise<Member[]> {
    return (unwrap(await this.db.from('st_members').select('*')) as Row[]).map(toMember);
  }

  async listRoles(): Promise<ProjectRole[]> {
    const rows = unwrap(await this.db.from('st_project_roles').select('*')) as Row[];
    return rows.map((r) => ({ projectId: r.project_id, memberId: r.member_id, role: r.role }));
  }

  async listThreads(): Promise<Thread[]> {
    const threads = unwrap(await this.db.from('st_needs').select('*').order('created_at', { ascending: false })) as Row[];
    const promos = unwrap(await this.db.from('st_promotions').select('*')) as Row[];
    const byThread = new Map(promos.map((p) => [p.need_id, p]));
    return threads.map((n) => toThread(n, byThread.get(n.id)));
  }

  private async bundlesFor(threads: Thread[]): Promise<ThreadBundle[]> {
    if (threads.length === 0) return [];
    const threadIds = threads.map((n) => n.id);
    const positions = (unwrap(await this.db.from('st_specs').select('*').in('need_id', threadIds).order('created_at')) as Row[]).map(toPosition);
    const positionIds = positions.map((s) => s.id);
    const intents = (unwrap(await this.db.from('st_builder_intents').select('*').in('need_id', threadIds)) as Row[]).map(toIntent);
    let votes: Vote[] = [];
    let comments: Comment[] = [];
    if (positionIds.length > 0) {
      votes = (unwrap(await this.db.from('st_votes').select('*').in('spec_id', positionIds)) as Row[]).map(toVote);
      comments = (unwrap(await this.db.from('st_comments').select('*').in('spec_id', positionIds).order('created_at')) as Row[]).map(toComment);
    }
    return threads.map((thread) => {
      const myPositions = positions.filter((s) => s.threadId === thread.id);
      const ids = new Set(myPositions.map((s) => s.id));
      return {
        thread,
        positions: myPositions,
        votes: votes.filter((v) => ids.has(v.positionId)),
        intents: intents.filter((i) => i.threadId === thread.id),
        comments: comments.filter((c) => ids.has(c.positionId)),
      };
    });
  }

  async listBundles() {
    return this.bundlesFor(await this.listThreads());
  }

  async getBundle(threadId: string) {
    const thread = (await this.listThreads()).find((n) => n.id === threadId);
    if (!thread) return null;
    return (await this.bundlesFor([thread]))[0];
  }

  async createThread(input: { projectId: string; title: string; body: string; tags: string[] }) {
    const author_id = await this.uid();
    const tags = [...new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
    const row = unwrap(
      await this.db
        .from('st_needs')
        .insert({ project_id: input.projectId, title: input.title.trim(), body: input.body.trim(), tags, author_id })
        .select('*')
        .single(),
    );
    return toThread(row as Row);
  }

  async createPosition(input: { threadId: string; body: string }) {
    const author_id = await this.uid();
    const row = unwrap(
      await this.db.from('st_specs').insert({ need_id: input.threadId, body: input.body.trim(), author_id }).select('*').single(),
    );
    return toPosition(row as Row);
  }

  async castVote(input: { positionId: string; value: 1 | -1 | 0 }) {
    const member_id = await this.uid();
    if (input.value === 0) {
      unwrap(await this.db.from('st_votes').delete().eq('spec_id', input.positionId).eq('member_id', member_id));
      return;
    }
    unwrap(
      await this.db
        .from('st_votes')
        .upsert({ spec_id: input.positionId, member_id, value: input.value, cast_at: new Date().toISOString() }, { onConflict: 'spec_id,member_id' }),
    );
  }

  async setBuilderIntent(input: { threadId: string; on: boolean }) {
    const member_id = await this.uid();
    if (input.on) {
      unwrap(await this.db.from('st_builder_intents').upsert({ need_id: input.threadId, member_id }, { onConflict: 'need_id,member_id' }));
    } else {
      unwrap(await this.db.from('st_builder_intents').delete().eq('need_id', input.threadId).eq('member_id', member_id));
    }
  }

  async addComment(input: { positionId: string; body: string }) {
    const author_id = await this.uid();
    const row = unwrap(
      await this.db.from('st_comments').insert({ spec_id: input.positionId, body: input.body.trim(), author_id }).select('*').single(),
    );
    return toComment(row as Row);
  }

  async recordPromotion(input: { threadId: string; promotion: Promotion }) {
    const by_member_id = await this.uid();
    const p = input.promotion;
    // The insert trigger closes the thread; RLS checks the caller is the project lead.
    unwrap(
      await this.db.from('st_promotions').insert({
        need_id: input.threadId,
        spec_id: p.positionId,
        by_member_id,
        at: p.at,
        weighted_rank_at_promotion: p.weightedRankAtPromotion,
        raw_rank_at_promotion: p.rawRankAtPromotion,
        override_rationale: p.overrideRationale ?? null,
        bounty_markdown: p.bountyMarkdown,
      }),
    );
  }

  async updateProfile(input: Partial<Pick<Member, 'tokenBalance' | 'expertise' | 'location' | 'bio'>>) {
    const id = await this.uid();
    const patch: Row = {};
    if (input.tokenBalance !== undefined) patch.token_balance = Math.max(0, Math.floor(input.tokenBalance));
    if (input.expertise) patch.expertise = [...new Set(input.expertise.map((t) => t.trim().toLowerCase()).filter(Boolean))];
    if (input.location !== undefined) patch.location = input.location.trim();
    if (input.bio !== undefined) patch.bio = input.bio.trim();
    const row = unwrap(await this.db.from('st_members').update(patch).eq('id', id).select('*').single());
    return toMember(row as Row);
  }
}
