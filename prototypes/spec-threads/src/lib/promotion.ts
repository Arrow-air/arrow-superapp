// Promotion: the project lead turns one position into a bounty.
// The lead keeps the final say (aircraft are trade-offs, someone has to be opinionated),
// but choosing anything other than the weighted top position requires a written rationale.
// Those rationales are data for open question Q2.

import type { Member, Thread, Promotion, Role, Position, PositionTally } from './types';

export class PromotionError extends Error {}

export const MIN_RATIONALE_LENGTH = 20;

export function canPromote(role: Role | undefined): boolean {
  return role === 'lead';
}

export function needsRationale(positionId: string, tallies: PositionTally[]): boolean {
  const t = tallies.find((x) => x.positionId === positionId);
  return !t || t.weightedRank !== 1;
}

export function bountyMarkdown(args: {
  thread: Thread;
  position: Position;
  positionAuthor: Member;
  lead: Member;
  tally: PositionTally | undefined;
  overrideRationale?: string;
}): string {
  const { thread, position, positionAuthor, lead, tally, overrideRationale } = args;
  const lines = [
    `# Bounty: ${thread.title}`,
    '',
    `**Project:** ${thread.projectId}  `,
    `**Position by:** @${positionAuthor.handle}  `,
    `**Promoted by:** @${lead.handle} (project lead)  `,
  ];
  if (tally) {
    lines.push(
      `**Community signal:** weighted score ${tally.weightedScore} (rank ${tally.weightedRank}), raw score ${tally.rawScore} (rank ${tally.rawRank}), ${tally.voters} voters`,
    );
  }
  lines.push('', '## The thread', '', thread.body.trim(), '', '## The position', '', position.body.trim());
  if (overrideRationale) {
    lines.push('', '## Why the lead chose this over the top-voted position', '', overrideRationale.trim());
  }
  lines.push(
    '',
    '## Rewards',
    '',
    `- Retro grant to @${positionAuthor.handle} for writing the position: _amount TBD_`,
    '- Build bounty: _amount TBD_',
    '',
    '## Deliverables',
    '',
    '- [ ] _Fill in from the position above_',
  );
  return lines.join('\n');
}

export function promote(args: {
  thread: Thread;
  position: Position;
  positionAuthor: Member;
  lead: Member;
  leadRole: Role | undefined;
  tallies: PositionTally[];
  overrideRationale?: string;
  now?: Date;
}): Promotion {
  const { thread, position, positionAuthor, lead, leadRole, tallies } = args;
  if (!canPromote(leadRole)) {
    throw new PromotionError('Only the project lead can promote a position.');
  }
  if (thread.status !== 'open') {
    throw new PromotionError('This thread already has a promoted position.');
  }
  if (position.threadId !== thread.id) {
    throw new PromotionError('That position does not belong to this thread.');
  }
  const rationale = args.overrideRationale?.trim();
  if (needsRationale(position.id, tallies) && (!rationale || rationale.length < MIN_RATIONALE_LENGTH)) {
    throw new PromotionError(
      `This is not the top weighted position. Add a rationale of at least ${MIN_RATIONALE_LENGTH} characters.`,
    );
  }
  const tally = tallies.find((t) => t.positionId === position.id);
  const keptRationale = needsRationale(position.id, tallies) ? rationale : undefined;
  return {
    positionId: position.id,
    byMemberId: lead.id,
    at: (args.now ?? new Date()).toISOString(),
    weightedRankAtPromotion: tally?.weightedRank ?? tallies.length + 1,
    rawRankAtPromotion: tally?.rawRank ?? tallies.length + 1,
    overrideRationale: keptRationale,
    bountyMarkdown: bountyMarkdown({
      thread,
      position,
      positionAuthor,
      lead,
      tally,
      overrideRationale: keptRationale,
    }),
  };
}
