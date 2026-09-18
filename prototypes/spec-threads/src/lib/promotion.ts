// Promotion: the project lead turns one spec into a bounty.
// The lead keeps the final say (aircraft are trade-offs, someone has to be opinionated),
// but choosing anything other than the weighted top spec requires a written rationale.
// Those rationales are data for open question Q2.

import type { Member, Need, Promotion, Role, Spec, SpecTally } from './types';

export class PromotionError extends Error {}

export const MIN_RATIONALE_LENGTH = 20;

export function canPromote(role: Role | undefined): boolean {
  return role === 'lead';
}

export function needsRationale(specId: string, tallies: SpecTally[]): boolean {
  const t = tallies.find((x) => x.specId === specId);
  return !t || t.weightedRank !== 1;
}

export function bountyMarkdown(args: {
  need: Need;
  spec: Spec;
  specAuthor: Member;
  lead: Member;
  tally: SpecTally | undefined;
  overrideRationale?: string;
}): string {
  const { need, spec, specAuthor, lead, tally, overrideRationale } = args;
  const lines = [
    `# Bounty: ${need.title}`,
    '',
    `**Project:** ${need.projectId}  `,
    `**Spec by:** @${specAuthor.handle}  `,
    `**Promoted by:** @${lead.handle} (project lead)  `,
  ];
  if (tally) {
    lines.push(
      `**Community signal:** weighted score ${tally.weightedScore} (rank ${tally.weightedRank}), raw score ${tally.rawScore} (rank ${tally.rawRank}), ${tally.voters} voters`,
    );
  }
  lines.push('', '## The need', '', need.body.trim(), '', '## The spec', '', spec.body.trim());
  if (overrideRationale) {
    lines.push('', '## Why the lead chose this over the top-voted spec', '', overrideRationale.trim());
  }
  lines.push(
    '',
    '## Rewards',
    '',
    `- Retro grant to @${specAuthor.handle} for writing the spec: _amount TBD_`,
    '- Build bounty: _amount TBD_',
    '',
    '## Deliverables',
    '',
    '- [ ] _Fill in from the spec above_',
  );
  return lines.join('\n');
}

export function promote(args: {
  need: Need;
  spec: Spec;
  specAuthor: Member;
  lead: Member;
  leadRole: Role | undefined;
  tallies: SpecTally[];
  overrideRationale?: string;
  now?: Date;
}): Promotion {
  const { need, spec, specAuthor, lead, leadRole, tallies } = args;
  if (!canPromote(leadRole)) {
    throw new PromotionError('Only the project lead can promote a spec.');
  }
  if (need.status !== 'open') {
    throw new PromotionError('This need already has a promoted spec.');
  }
  if (spec.needId !== need.id) {
    throw new PromotionError('That spec does not belong to this need.');
  }
  const rationale = args.overrideRationale?.trim();
  if (needsRationale(spec.id, tallies) && (!rationale || rationale.length < MIN_RATIONALE_LENGTH)) {
    throw new PromotionError(
      `This is not the top weighted spec. Add a rationale of at least ${MIN_RATIONALE_LENGTH} characters.`,
    );
  }
  const tally = tallies.find((t) => t.specId === spec.id);
  const keptRationale = needsRationale(spec.id, tallies) ? rationale : undefined;
  return {
    specId: spec.id,
    byMemberId: lead.id,
    at: (args.now ?? new Date()).toISOString(),
    weightedRankAtPromotion: tally?.weightedRank ?? tallies.length + 1,
    rawRankAtPromotion: tally?.rawRank ?? tallies.length + 1,
    overrideRationale: keptRationale,
    bountyMarkdown: bountyMarkdown({
      need,
      spec,
      specAuthor,
      lead,
      tally,
      overrideRationale: keptRationale,
    }),
  };
}
