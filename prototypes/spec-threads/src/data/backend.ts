// The one seam between the UI and wherever data lives.
// Two implementations: demo (browser storage, seeded, zero setup) and supabase (v1 shape only, see its header).

import type {
  BuilderIntent,
  Comment,
  Decision,
  Grant,
  Member,
  Position,
  Project,
  ProjectRole,
  Thread,
  Vote,
} from '../lib/types';

export interface ThreadBundle {
  thread: Thread;
  positions: Position[];
  votes: Vote[];
  intents: BuilderIntent[];
  comments: Comment[];
}

/** What the lead asks for. The backend validates it (role, ranks, rationale) and writes the records. */
export type ResolveInput =
  | { threadId: string; kind: 'reject'; note: string }
  | { threadId: string; kind: 'spec'; positionId: string; overrideRationale?: string }
  | { threadId: string; kind: 'grant'; positionId: string; overrideRationale?: string; proposerShare?: number }
  | { threadId: string; kind: 'defer'; toVersionId: string; note?: string };

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
  /** Every thread with its positions, votes, intents, and comments. Used by list pages and the readout. */
  listBundles(): Promise<ThreadBundle[]>;
  getBundle(threadId: string): Promise<ThreadBundle | null>;
  listDecisions(): Promise<Decision[]>;
  listGrants(): Promise<Grant[]>;
  getGrant(grantId: string): Promise<Grant | null>;

  /** versionId defaults to the project's version in discussion. */
  createThread(input: { projectId: string; versionId?: string; system?: string; title: string; body: string; tags: string[] }): Promise<Thread>;
  createPosition(input: { threadId: string; body: string }): Promise<Position>;
  /** value 0 clears the caller's vote. */
  castVote(input: { positionId: string; value: 1 | -1 | 0 }): Promise<void>;
  setBuilderIntent(input: { threadId: string; on: boolean }): Promise<void>;
  addComment(input: { positionId: string; body: string }): Promise<Comment>;
  /** Lead only. Reject, promote to spec, turn into a grant draft, or defer to a later version. */
  resolveThread(input: ResolveInput): Promise<Thread>;
  /** Lead only. Edit a grant draft before it is published. */
  updateGrant(input: { id: string } & Partial<Pick<Grant, 'title' | 'scope' | 'constraints' | 'proposerShare' | 'proposerIds'>>): Promise<Grant>;
  publishGrant(grantId: string): Promise<Grant>;
  /** Lead only. Requires every thread on the version to be resolved or deferred. */
  freezeVersion(input: { projectId: string; versionId: string }): Promise<Project>;
  updateProfile(input: Partial<Pick<Member, 'tokenBalance' | 'expertise' | 'location' | 'bio'>>): Promise<Member>;

  /** Demo only: wipe local changes and restore the seed. */
  reset?(): Promise<void>;
}

export class NotSignedInError extends Error {
  constructor() {
    super('Sign in first.');
  }
}
