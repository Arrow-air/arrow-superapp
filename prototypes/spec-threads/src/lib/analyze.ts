// Turns a need and its votes into weights, tallies, and the experiment's headline signals.

import type { NeedBundle } from '../data/backend';
import type { Member, Project, ProjectRole, Role, SpecTally, WeightBreakdown } from './types';
import { tallySpecs, voteWeight, weightingChangedWinner } from './weights';

export interface NeedAnalysis {
  /** Weight breakdown for every member who could vote, keyed by member id. */
  weights: Map<string, WeightBreakdown>;
  tallies: SpecTally[];
  /** Did weighting change which spec is on top, versus one person one vote? */
  weightingChangedWinner: boolean;
  /** Distinct members who voted on any spec in this need. */
  participants: number;
  /** If promoted: did the lead pick the weighted top spec? null while still open. */
  leadFollowedWeighted: boolean | null;
  /** If promoted: did the lead pick the raw top spec? */
  leadFollowedRaw: boolean | null;
}

export function roleOf(roles: ProjectRole[], projectId: string, memberId: string): Role {
  return roles.find((r) => r.projectId === projectId && r.memberId === memberId)?.role ?? 'member';
}

export function analyzeNeed(args: {
  bundle: NeedBundle;
  members: Member[];
  roles: ProjectRole[];
  project: Project;
}): NeedAnalysis {
  const { bundle, members, roles, project } = args;
  const builders = new Set(bundle.intents.map((i) => i.memberId));
  const weights = new Map<string, WeightBreakdown>();
  for (const member of members) {
    weights.set(
      member.id,
      voteWeight({
        member,
        need: bundle.need,
        role: roleOf(roles, project.id, member.id),
        isBuilder: builders.has(member.id),
        cfg: project.weights,
      }),
    );
  }
  const tallies = tallySpecs({
    specs: bundle.specs,
    votes: bundle.votes,
    // A voter we have no profile for still counts, at base weight.
    weightFor: (id) => weights.get(id)?.total ?? project.weights.base,
  });
  const promo = bundle.need.promotion;
  return {
    weights,
    tallies,
    weightingChangedWinner: weightingChangedWinner(tallies),
    participants: new Set(bundle.votes.map((v) => v.memberId)).size,
    leadFollowedWeighted: promo ? promo.weightedRankAtPromotion === 1 : null,
    leadFollowedRaw: promo ? promo.rawRankAtPromotion === 1 : null,
  };
}
