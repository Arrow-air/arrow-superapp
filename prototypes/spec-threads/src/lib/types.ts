// Domain types for the spec-thread experiment, v2.
//
// A Project has Versions. One is being built, one is being discussed. A Thread is a question
// addressed to a version ("what does the engine PCB need for PT2?"). People reply with
// Positions. Votes on positions are weighted. At the version freeze the lead resolves every
// open thread one of four ways: reject, promote to spec (a Decision in the register), turn
// into a Grant draft, or defer to the next version. See ROADMAP.md, "Next iteration".

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

/**
 * building:   the team is building and flying it; outside discussion does not target it.
 * discussing: open threads target this version. New threads default here.
 * frozen:     the lead resolved every thread; the design is fixed and moves to the build.
 * planned:    exists so threads can be deferred to it; becomes "discussing" when the one before freezes.
 */
export type VersionState = 'building' | 'discussing' | 'frozen' | 'planned';

export interface Version {
  id: string;
  name: string; // "PT1", "PT2"
  state: VersionState;
  /** Order within the project. Deferral goes to the next one. */
  order: number;
  /** Intended freeze date (ISO date), shown so the queue does not grow forever. */
  freezeTarget?: string;
  frozenAt?: string;
  frozenBy?: string;
}

export interface Project {
  id: string;
  name: string;
  weights: WeightConfig;
  versions: Version[];
  /** Aircraft systems a thread can be filed under. Used later to split the retro bucket. */
  systems: string[];
}

export type ThreadStatus = 'open' | 'resolved';

export interface Thread {
  id: string;
  projectId: string;
  /** The version this thread is addressed to. Changes when deferred. */
  versionId: string;
  system?: string;
  title: string;
  body: string; // markdown
  tags: string[]; // matched against Member.expertise
  authorId: string;
  status: ThreadStatus;
  createdAt: string;
  /** Set when the lead resolves the thread (reject, spec, grant). Defer keeps it open. */
  resolution?: Resolution;
  /** Every time the lead pushed it to a later version. */
  deferrals: Deferral[];
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

export type ResolutionKind = 'reject' | 'spec' | 'grant' | 'defer';

interface ResolutionBase {
  byMemberId: string;
  at: string;
}

/** The lead chose a position. Both ranks are recorded so the readout can count overrides. */
export interface ChosenPosition {
  positionId: string;
  /** Rank of the chosen position by weighted score at resolution time (1 = top). */
  weightedRankAtResolution: number;
  /** Rank by raw one-person-one-vote score at resolution time. */
  rawRankAtResolution: number;
  /** Required when the lead picks something other than the weighted top position. */
  overrideRationale?: string;
}

export type Resolution =
  | (ResolutionBase & { kind: 'reject'; note: string })
  | (ResolutionBase & { kind: 'spec'; decisionId: string } & ChosenPosition)
  | (ResolutionBase & { kind: 'grant'; grantId: string } & ChosenPosition);

export interface Deferral {
  fromVersionId: string;
  toVersionId: string;
  byMemberId: string;
  at: string;
  note?: string;
}

/** An entry in the project's decision register. A thread promoted to a spec or requirement. */
export interface Decision {
  id: string;
  projectId: string;
  versionId: string;
  threadId: string;
  positionId: string;
  /** The question, from the thread title. */
  question: string;
  /** The chosen position's title. */
  chosen: string;
  /** Lead's rationale. Required when the choice was not the weighted top. */
  rationale?: string;
  weightedRankAtDecision: number;
  rawRankAtDecision: number;
  byMemberId: string;
  at: string;
  status: 'decided' | 'superseded';
}

/**
 * A grant or bounty drafted from a thread. Pre-filled from the chosen position and its
 * discussion; a human edits it before it is real. Carries the proposer award.
 */
export interface Grant {
  id: string;
  projectId: string;
  versionId: string;
  threadId: string;
  positionId: string;
  title: string;
  /** Markdown. Starts as the thread body plus the chosen position. */
  scope: string;
  /** Interfaces and constraints extracted from the discussion, one per line. */
  constraints: string[];
  /** Who wrote the idea. Gets proposerShare of the grant. */
  proposerIds: string[];
  /** Fraction of the grant paid to the proposers. Default 0.25. No tokens move in this prototype. */
  proposerShare: number;
  /** Members who commented on the chosen position, for attribution. */
  contributorIds: string[];
  overrideRationale?: string;
  weightedRankAtResolution: number;
  rawRankAtResolution: number;
  byMemberId: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published';
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
