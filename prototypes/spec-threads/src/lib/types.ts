// Domain types for the browser-local coordination prototype.
// One conversation → one draft document → a reviewed conclusion.
// Design adoption and work commissioning are independent outputs. Legacy single-position
// resolutions and item-based briefs remain readable for existing demo data.

export type Role = 'lead' | 'core' | 'member';

export interface Member {
  id: string;
  handle: string; // GitHub login in production
  displayName: string;
  avatarUrl?: string;
  /** $ARROW balance, whole tokens. Self-reported or admin-set in this prototype. */
  tokenBalance: number;
  /** Free-form expertise tags: "pcb", "propulsion", "firmware", ... Self-described. */
  expertise: string[];
  /**
   * Expertise a project lead has confirmed. When present, only these count toward vote weight,
   * so a self-described tag cannot raise anyone's weight. Absent in the sandbox personas.
   */
  verifiedExpertise?: string[];
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
  /** $ARROW set aside to reward this version's discussion, allocated at the freeze. */
  retroPool?: RetroPool;
  /** The allocation recorded when the version froze. Display only: no tokens move. */
  retroAllocation?: RetroAllocation;
}

export interface RetroPool {
  amount: number;
  /** Optional pre-split by aircraft system (fractions of the pool; "project-wide" allowed). */
  systemShares?: Record<string, number>;
  setBy: string;
  setAt: string;
}
export interface RetroItem { positionId: string; threadId: string; score: number; amount: number }
export interface RetroLine { memberId: string; amount: number; items: RetroItem[] }
export interface RetroAllocation {
  amount: number;
  lines: RetroLine[];
  /** Pool left over because no contribution in its share earned positive support. */
  unallocated: number;
  at?: string;
  byMemberId?: string;
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
  sourceRecordId?: string;
  sourceThreadId?: string;
  sourceDecisionId?: string;
  sourceGrantId?: string;
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
  editedAt?:string;
  editHistory?:ContributionEdit[];
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
  editedAt?:string;
  editHistory?:ContributionEdit[];
  id: string;
  positionId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export type ResolutionKind = 'reject' | 'spec' | 'grant' | 'defer' | 'conclude';

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
  | (ResolutionBase & { kind: 'conclude'; snapshot: OutcomeSnapshot; decisionId?: string; grantIds: string[] })
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
  supersedesIds?: string[];
  supersessionNote?: string;
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
  briefSnapshot?: BriefSnapshot;
  outcomeSnapshot?: OutcomeSnapshot;
}

/**
 * A grant or bounty drafted from a thread. Pre-filled from the chosen position and its
 * discussion; a human edits it before it is real. Carries the proposer award.
 */
export interface Grant {
  tracking?: WorkTracking;
  workKind?: 'grant' | 'bounty';
  workPurpose?: 'implementation' | 'research';
  decisionIds?: string[];
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
  /**
   * Who raised the idea when that person is not (yet) a member, e.g. "Erick, Sep 25 call".
   * Their proposer award is held until the lead assigns it to an account.
   */
  proposerNote?: string;
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
  /** Immutable reviewed starting point; later grant edits do not change this record. */
  briefSnapshot?: BriefSnapshot;
  outcomeSnapshot?: OutcomeSnapshot;
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
  /** Treat a thread's aircraft system as one of its tags when matching expertise. */
  matchSystem?: boolean;
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


/** Human-curated synthesis. A source is a snapshot, not an assertion that its claim is true. */
export interface BriefSource {
  key: string;
  kind: 'thread' | 'position' | 'comment';
  id: string;
  positionId?: string;
  authorId: string;
  body: string;
}
export type BriefKind = 'requirement' | 'deliverable' | 'question' | 'evidence' | 'exclusion';
export interface BriefItem {
  id: string;
  kind: BriefKind;
  text: string;
  /** How a deliverable will be accepted; not a claim that a test has passed. */
  verification: string;
  sources: BriefSource[];
  authorId: string;
  updatedBy: string;
  status: 'proposed' | 'accepted' | 'dismissed';
  /** Answer to a question or reason for excluding a proposal. */
  rationale: string;
  decidedBy?: string;
}
export interface BriefApproval {
  byMemberId: string;
  at: string;
  revision: number;
  versionId: string;
  corpus: string;
}
export interface BriefContent {
  purpose: string;
  items: BriefItem[];
  reviewed: { source: BriefSource; byMemberId: string }[];
}
export interface WorkingBrief extends BriefContent {
  threadId: string;
  revision: number;
  approval?: BriefApproval;
  history: { revision: number; byMemberId: string; at: string; action: string; content: BriefContent }[];
}
export interface BriefSnapshot extends BriefContent {
  threadId: string;
  approval: BriefApproval;
}

/** One editable synthesis per discussion; feedback belongs in the conversation. */
export interface OutcomeContent {
  body: string;
  openQuestions: string;
}
export interface OutcomeDraft extends OutcomeContent {
  threadId: string;
  revision: number;
  authorId: string;
  updatedBy: string;
  updatedAt: string;
  history: { revision: number; byMemberId: string; at: string; content: OutcomeContent }[];
}
export interface OutcomeSnapshot extends OutcomeContent {
  threadId: string;
  versionId: string;
  revision: number;
  byMemberId: string;
  at: string;
  sources: BriefSource[];
}
export interface WorkInput {
  kind: 'grant' | 'bounty';
  purpose: 'implementation' | 'research';
  title: string;
  scope: string;
  acceptance: string;
  /** Proposed reward in $ARROW. A record only; nothing is paid from the app. */
  amount?: number;
}


export type WorkStage = 'draft' | 'open' | 'in_progress' | 'in_review' | 'completed' | 'cancelled';
export type FundingStatus = 'unfunded' | 'proposed' | 'funded' | 'paid';
export interface WorkMilestone { id: string; title: string; acceptance: string; evidence: string; completed: boolean }
export interface WorkProgress {
  blockers?:string;
  dependencies?:string[];
  stage: WorkStage;
  ownerId: string;
  dueDate: string;
  funding: FundingStatus;
  budget: string;
  /** Reward in $ARROW. The proposer award is proposerShare of this. */
  amount?: number;
  acceptance: string;
  evidence: string;
  milestones: WorkMilestone[];
  decisionIds: string[];
}
export interface WorkTracking extends WorkProgress {
  revision: number;
  history: { at: string; byMemberId: string; note: string; content: WorkProgress }[];
}
export interface SpecificationContent { body: string; decisionIds: string[] }
export interface SpecificationSection extends SpecificationContent {
  id: string;
  projectId: string;
  versionId: string;
  system: string;
  revision: number;
  updatedBy: string;
  updatedAt: string;
  history: { revision: number; at: string; byMemberId: string; note: string; content: SpecificationContent }[];
}

/** Authored edits remain visible independently from the reviewed outcome snapshot. */
export interface ContributionEdit { body:string; at:string; by:string }
