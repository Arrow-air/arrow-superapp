// Resolution: the four ways a thread ends at the version freeze.
//
//   reject   the lead says no, with a line of why
//   spec     the lead promotes one position to a specification or requirement (decision register)
//   grant    the lead turns the thread into a grant or bounty draft, pre-filled from the discussion
//   defer    not done being discussed; push it to the next version, keep the history
//
// The lead keeps the final say (aircraft are trade-offs, someone has to be opinionated), but
// choosing anything other than the weighted top position requires a written rationale.
// Those rationales are data for open question Q2. Pure functions; the backend applies them.

import { positionTitle } from './format';
import { DEFAULT_PROPOSER_SHARE, draftGrant } from './grant';
import type {
  ChosenPosition,
  Comment,
  Decision,
  Deferral,
  Grant,
  Position,
  PositionTally,
  Project,
  Resolution,
  Role,
  Thread,
} from './types';
import { deferTargets } from './versions';

export class ResolutionError extends Error {}

/** Minimum length for a rejection note or an override rationale. */
export const MIN_RATIONALE_LENGTH = 20;

export function canResolve(role: Role | undefined): boolean {
  return role === 'lead';
}

export function needsRationale(positionId: string, tallies: PositionTally[]): boolean {
  const t = tallies.find((x) => x.positionId === positionId);
  return !t || t.weightedRank !== 1;
}

function assertLeadAndOpen(thread: Thread, leadRole: Role | undefined) {
  if (!canResolve(leadRole)) throw new ResolutionError('Only the project lead can resolve a thread.');
  if (thread.status !== 'open') throw new ResolutionError('This thread is already resolved.');
}

/** Validate the lead's choice of position and record both ranks. */
export function choosePosition(args: {
  thread: Thread;
  position: Position;
  tallies: PositionTally[];
  overrideRationale?: string;
}): ChosenPosition {
  const { thread, position, tallies } = args;
  if (position.threadId !== thread.id) throw new ResolutionError('That position does not belong to this thread.');
  const rationale = args.overrideRationale?.trim();
  const override = needsRationale(position.id, tallies);
  if (override && (!rationale || rationale.length < MIN_RATIONALE_LENGTH)) {
    throw new ResolutionError(
      `This is not the top weighted position. Add a rationale of at least ${MIN_RATIONALE_LENGTH} characters.`,
    );
  }
  const tally = tallies.find((t) => t.positionId === position.id);
  return {
    positionId: position.id,
    weightedRankAtResolution: tally?.weightedRank ?? tallies.length + 1,
    rawRankAtResolution: tally?.rawRank ?? tallies.length + 1,
    overrideRationale: override ? rationale : undefined,
  };
}

export function rejectThread(args: { thread: Thread; leadId: string; leadRole: Role | undefined; note: string; now?: Date }): Resolution {
  const { thread, leadId, leadRole } = args;
  assertLeadAndOpen(thread, leadRole);
  const note = args.note?.trim() ?? '';
  if (note.length < MIN_RATIONALE_LENGTH) {
    throw new ResolutionError(`Say why, in at least ${MIN_RATIONALE_LENGTH} characters. It is published on the thread.`);
  }
  return { kind: 'reject', note, byMemberId: leadId, at: (args.now ?? new Date()).toISOString() };
}

export function promoteToSpec(args: {
  thread: Thread;
  position: Position;
  leadId: string;
  leadRole: Role | undefined;
  tallies: PositionTally[];
  overrideRationale?: string;
  decisionId: string;
  now?: Date;
}): { resolution: Resolution; decision: Decision } {
  const { thread, position, leadId, leadRole, tallies, decisionId } = args;
  assertLeadAndOpen(thread, leadRole);
  const chosen = choosePosition({ thread, position, tallies, overrideRationale: args.overrideRationale });
  const at = (args.now ?? new Date()).toISOString();
  const decision: Decision = {
    id: decisionId,
    projectId: thread.projectId,
    versionId: thread.versionId,
    threadId: thread.id,
    positionId: position.id,
    question: thread.title,
    chosen: positionTitle(position.body),
    rationale: chosen.overrideRationale,
    weightedRankAtDecision: chosen.weightedRankAtResolution,
    rawRankAtDecision: chosen.rawRankAtResolution,
    byMemberId: leadId,
    at,
    status: 'decided',
  };
  return { resolution: { kind: 'spec', decisionId, byMemberId: leadId, at, ...chosen }, decision };
}

export function promoteToGrant(args: {
  thread: Thread;
  position: Position;
  /** Comments on the chosen position, for constraints and attribution. */
  comments: Comment[];
  leadId: string;
  leadRole: Role | undefined;
  tallies: PositionTally[];
  overrideRationale?: string;
  proposerShare?: number;
  grantId: string;
  now?: Date;
}): { resolution: Resolution; grant: Grant } {
  const { thread, position, comments, leadId, leadRole, tallies, grantId } = args;
  assertLeadAndOpen(thread, leadRole);
  const chosen = choosePosition({ thread, position, tallies, overrideRationale: args.overrideRationale });
  const share = args.proposerShare ?? DEFAULT_PROPOSER_SHARE;
  if (!Number.isFinite(share) || share < 0 || share > 1) throw new ResolutionError('Proposer share must be between 0 and 1.');
  const at = (args.now ?? new Date()).toISOString();
  const grant: Grant = {
    id: grantId,
    projectId: thread.projectId,
    versionId: thread.versionId,
    threadId: thread.id,
    positionId: position.id,
    ...draftGrant({ thread, position, comments }),
    proposerShare: share,
    overrideRationale: chosen.overrideRationale,
    weightedRankAtResolution: chosen.weightedRankAtResolution,
    rawRankAtResolution: chosen.rawRankAtResolution,
    byMemberId: leadId,
    createdAt: at,
    updatedAt: at,
    status: 'draft',
  };
  return { resolution: { kind: 'grant', grantId, byMemberId: leadId, at, ...chosen }, grant };
}

export function deferThread(args: {
  thread: Thread;
  project: Project;
  leadId: string;
  leadRole: Role | undefined;
  toVersionId: string;
  note?: string;
  now?: Date;
}): Deferral {
  const { thread, project, leadId, leadRole, toVersionId } = args;
  assertLeadAndOpen(thread, leadRole);
  const target = deferTargets(project, thread.versionId).find((v) => v.id === toVersionId);
  if (!target) throw new ResolutionError('A thread can only be deferred to a later version that is not yet frozen.');
  const note = args.note?.trim();
  return {
    fromVersionId: thread.versionId,
    toVersionId,
    byMemberId: leadId,
    at: (args.now ?? new Date()).toISOString(),
    note: note || undefined,
  };
}
