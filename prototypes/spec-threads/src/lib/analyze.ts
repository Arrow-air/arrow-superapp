// Turns a thread and its votes into weights, tallies, and the experiment's headline signals.

import type { ThreadBundle } from '../data/backend';
import type { Member, Project, ProjectRole, Role, PositionTally, WeightBreakdown } from './types';
import { tallyPositions, voteWeight, weightingChangedWinner } from './weights';

export interface ThreadAnalysis {
  /** Weight breakdown for every member who could vote, keyed by member id. */
  weights: Map<string, WeightBreakdown>;
  tallies: PositionTally[];
  /** Did weighting change which position is on top, versus one person one vote? */
  weightingChangedWinner: boolean;
  /** Distinct members who voted on any position in this thread. */
  participants: number;
  /** If promoted: did the lead pick the weighted top position? null while still open. */
  leadFollowedWeighted: boolean | null;
  /** If promoted: did the lead pick the raw top position? */
  leadFollowedRaw: boolean | null;
}

export function roleOf(roles: ProjectRole[], projectId: string, memberId: string): Role {
  return roles.find((r) => r.projectId === projectId && r.memberId === memberId)?.role ?? 'member';
}

export function analyzeThread(args: {
  bundle: ThreadBundle;
  members: Member[];
  roles: ProjectRole[];
  project: Project;
}): ThreadAnalysis {
  const { bundle, members, roles, project } = args;
  const builders = new Set(bundle.intents.map((i) => i.memberId));
  const weights = new Map<string, WeightBreakdown>();
  for (const member of members) {
    weights.set(
      member.id,
      voteWeight({
        member,
        thread: bundle.thread,
        role: roleOf(roles, project.id, member.id),
        isBuilder: builders.has(member.id),
        cfg: project.weights,
      }),
    );
  }
  const tallies = tallyPositions({
    positions: bundle.positions,
    votes: bundle.votes,
    // A voter we have no profile for still counts, at base weight.
    weightFor: (id) => weights.get(id)?.total ?? project.weights.base,
  });
  const promo = bundle.thread.promotion;
  return {
    weights,
    tallies,
    weightingChangedWinner: weightingChangedWinner(tallies),
    participants: new Set(bundle.votes.map((v) => v.memberId)).size,
    leadFollowedWeighted: promo ? promo.weightedRankAtPromotion === 1 : null,
    leadFollowedRaw: promo ? promo.rawRankAtPromotion === 1 : null,
  };
}
