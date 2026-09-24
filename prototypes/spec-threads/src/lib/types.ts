// Domain types for the position-thread experiment.
// A Thread is a question Arrow has to answer ("what power budget does the attachment
// interface thread?"). People reply with candidate Positions. Votes on positions are weighted.
// The project lead promotes one position to a bounty.

export type Role = 'lead' | 'core' | 'member';

export interface Member {
  id: string;
  handle: string; // GitHub login in production
  displayName: string;
  avatarUrl?: string;
  /** $ARROW balance, whole tokens. Self-reported or admin-set in this prototype. */
  tokenBalance: number;
  /** Free-form expertise tags: "pcb", "propulsion", "firmware", ... */
  expertise: string[];
  location?: string;
  bio?: string;
}

/** A member's role is per project: a Spearhead lead is an ordinary member on Quiver. */
export interface ProjectRole {
  projectId: string;
  memberId: string;
  role: Role;
}

export interface Project {
  id: string;
  name: string;
  weights: WeightConfig;
}

export type ThreadStatus = 'open' | 'spec_selected' | 'bounty';

export interface Thread {
  id: string;
  projectId: string;
  title: string;
  body: string; // markdown
  tags: string[]; // matched against Member.expertise
  authorId: string;
  status: ThreadStatus;
  createdAt: string;
  /** Set when the lead promotes a position. */
  promotion?: Promotion;
}

export interface Position {
  id: string;
  threadId: string;
  authorId: string;
  body: string; // markdown
  createdAt: string;
}

export interface Vote {
  positionId: string;
  memberId: string;
  value: 1 | -1;
  castAt: string;
}

/** "I will actually build or operate the thing this thread is about." Per thread, per member. */
export interface BuilderIntent {
  threadId: string;
  memberId: string;
}

export interface Comment {
  id: string;
  positionId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface Promotion {
  positionId: string;
  byMemberId: string;
  at: string;
  /** Rank of the promoted position by weighted score at promotion time (1 = top). */
  weightedRankAtPromotion: number;
  /** Rank by raw one-person-one-vote score at promotion time. */
  rawRankAtPromotion: number;
  /** Required when the lead picks something other than the weighted top position. */
  overrideRationale?: string;
  bountyMarkdown: string;
}

/** Tunable per project. Every number here is a hypothesis; the readout page exists to test them. */
export interface WeightConfig {
  base: number;
  /** tokenTerm = min(tokenCap, tokenFactor * log10(1 + balance / tokenScale)) */
  tokenFactor: number;
  tokenScale: number;
  tokenCap: number;
  /** Added when any of the member's expertise tags matches any of the thread's tags. */
  expertiseBonus: number;
  /** Added when the member declared builder intent on this thread. */
  builderBonus: number;
  /** Multiplies the sum of the terms above. */
  roleMultiplier: Record<Role, number>;
}

export interface WeightBreakdown {
  base: number;
  token: number;
  expertise: number;
  builder: number;
  roleMultiplier: number;
  role: Role;
  total: number;
  matchedTags: string[];
}

export interface PositionTally {
  positionId: string;
  rawUp: number;
  rawDown: number;
  rawScore: number;
  weightedUp: number;
  weightedDown: number;
  weightedScore: number;
  voters: number;
  rawRank: number;
  weightedRank: number;
}
