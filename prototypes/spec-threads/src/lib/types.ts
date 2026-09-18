// Domain types for the spec-thread experiment.
// A Need is a question Arrow has to answer ("what power budget does the attachment
// interface need?"). People reply with candidate Specs. Votes on specs are weighted.
// The project lead promotes one spec to a bounty.

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

export type NeedStatus = 'open' | 'spec_selected' | 'bounty';

export interface Need {
  id: string;
  projectId: string;
  title: string;
  body: string; // markdown
  tags: string[]; // matched against Member.expertise
  authorId: string;
  status: NeedStatus;
  createdAt: string;
  /** Set when the lead promotes a spec. */
  promotion?: Promotion;
}

export interface Spec {
  id: string;
  needId: string;
  authorId: string;
  body: string; // markdown
  createdAt: string;
}

export interface Vote {
  specId: string;
  memberId: string;
  value: 1 | -1;
  castAt: string;
}

/** "I will actually build or operate the thing this need is about." Per need, per member. */
export interface BuilderIntent {
  needId: string;
  memberId: string;
}

export interface Comment {
  id: string;
  specId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface Promotion {
  specId: string;
  byMemberId: string;
  at: string;
  /** Rank of the promoted spec by weighted score at promotion time (1 = top). */
  weightedRankAtPromotion: number;
  /** Rank by raw one-person-one-vote score at promotion time. */
  rawRankAtPromotion: number;
  /** Required when the lead picks something other than the weighted top spec. */
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
  /** Added when any of the member's expertise tags matches any of the need's tags. */
  expertiseBonus: number;
  /** Added when the member declared builder intent on this need. */
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

export interface SpecTally {
  specId: string;
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
