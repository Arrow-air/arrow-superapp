// The one seam between the UI and wherever data lives.
// Two implementations: demo (browser storage, seeded, zero setup) and supabase.

import type {
  BuilderIntent,
  Comment,
  Member,
  Need,
  Project,
  ProjectRole,
  Promotion,
  Spec,
  Vote,
} from '../lib/types';

export interface NeedBundle {
  need: Need;
  specs: Spec[];
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
  listNeeds(): Promise<Need[]>;
  /** Every need with its specs, votes, intents, and comments. Used by the readout page. */
  listBundles(): Promise<NeedBundle[]>;
  getBundle(needId: string): Promise<NeedBundle | null>;

  createNeed(input: { projectId: string; title: string; body: string; tags: string[] }): Promise<Need>;
  createSpec(input: { needId: string; body: string }): Promise<Spec>;
  /** value 0 clears the caller's vote. */
  castVote(input: { specId: string; value: 1 | -1 | 0 }): Promise<void>;
  setBuilderIntent(input: { needId: string; on: boolean }): Promise<void>;
  addComment(input: { specId: string; body: string }): Promise<Comment>;
  recordPromotion(input: { needId: string; promotion: Promotion }): Promise<void>;
  updateProfile(input: Partial<Pick<Member, 'tokenBalance' | 'expertise' | 'location' | 'bio'>>): Promise<Member>;

  /** Demo only: wipe local changes and restore the seed. */
  reset?(): Promise<void>;
}

export class NotSignedInError extends Error {
  constructor() {
    super('Sign in first.');
  }
}
