// The one seam between the UI and wherever data lives.
// Two implementations: demo (browser storage, seeded, zero setup) and supabase.

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

export interface ThreadBundle {
  thread: Thread;
  positions: Position[];
  votes: Vote[];
  intents: BuilderIntent[];
  comments: Comment[];
}

export interface Backend {
  readonly kind: 'demo' | 'supabase';

  /** The signed-in member, or null. */
  currentMember(): Promise<Member | null>;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  /** Demo only: switch which seeded persona you are acting as. */
  actAs?(memberId: string): Promise<void>;

  listProjects(): Promise<Project[]>;
  listMembers(): Promise<Member[]>;
  listRoles(): Promise<ProjectRole[]>;
  listThreads(): Promise<Thread[]>;
  /** Every thread with its positions, votes, intents, and comments. Used by the readout page. */
  listBundles(): Promise<ThreadBundle[]>;
  getBundle(threadId: string): Promise<ThreadBundle | null>;

  createThread(input: { projectId: string; title: string; body: string; tags: string[] }): Promise<Thread>;
  createPosition(input: { threadId: string; body: string }): Promise<Position>;
  /** value 0 clears the caller's vote. */
  castVote(input: { positionId: string; value: 1 | -1 | 0 }): Promise<void>;
  setBuilderIntent(input: { threadId: string; on: boolean }): Promise<void>;
  addComment(input: { positionId: string; body: string }): Promise<Comment>;
  recordPromotion(input: { threadId: string; promotion: Promotion }): Promise<void>;
  updateProfile(input: Partial<Pick<Member, 'tokenBalance' | 'expertise' | 'location' | 'bio'>>): Promise<Member>;

  /** Demo only: wipe local changes and restore the seed. */
  reset?(): Promise<void>;
}

export class NotSignedInError extends Error {
  constructor() {
    super('Sign in first.');
  }
}
