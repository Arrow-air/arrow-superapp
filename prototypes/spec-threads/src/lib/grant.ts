// Grant drafts. When the lead turns a thread into a grant or bounty, the draft is pre-filled
// from the thread: the question, the chosen position as the spec, and every concrete
// constraint anyone wrote down (voltages, currents, masses, interfaces). A human edits it
// before it is real. Open question Q30 is whether this draft is good enough or the proposer
// is paid to finish it. This version is a deterministic template; an agent-written draft is
// a later button, once there is a real corpus to feed it.

import { positionTitle } from './format';
import type { Comment, Grant, Member, Position, Project, Thread, Version } from './types';

/** Slice of a grant paid to whoever wrote the idea. A quarter was floated on the 2026-09-23 call. */
export const DEFAULT_PROPOSER_SHARE = 0.25;

const UNIT = /\b\d+(?:[.,]\d+)?\s?(?:m?V|m?A|k?W|Wh|mAh|k?Hz|k?g|mm|cm|m|s|ms|%|°C|deg|Nm|kts?|km\/h|m\/s|bar|psi|dB)\b/;
const INTERFACE = /\b(CAN|UART|I2C|SPI|USB|PWM|SBUS|MAVLink|DroneCAN|Ethernet|RS-?485|RS-?232|JST|XT\d+|connector|bus|rail|fuse)\b/i;

function cleanLine(line: string): string {
  return line
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '')
    .replace(/^#{1,6}\s+/, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

/**
 * Lines from the discussion that read like requirements: list items, or any line with a
 * number and a unit, or a named interface. Deduplicated, in order of appearance.
 */
export function extractConstraints(texts: string[], max = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const text of texts) {
    for (const raw of (text ?? '').split('\n')) {
      const isItem = /^\s*(?:[-*+]|\d+[.)])\s+\S/.test(raw);
      const line = cleanLine(raw);
      if (line.length < 8 || /^#{1,6}/.test(raw.trim())) continue;
      // Prose only counts when it is short enough to read as a requirement, not a paragraph.
      const measurable = UNIT.test(line) && line.length <= 160;
      const named = INTERFACE.test(line) && line.length <= 100;
      if (!(isItem || measurable || named)) continue;
      const key = line.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(line);
      if (out.length >= max) return out;
    }
  }
  return out;
}

export function draftGrant(args: {
  thread: Thread;
  position: Position;
  /** Comments on the chosen position. */
  comments: Comment[];
}): Pick<Grant, 'title' | 'scope' | 'constraints' | 'proposerIds' | 'contributorIds'> {
  const { thread, position, comments } = args;
  const scope = [
    '## The need',
    '',
    thread.body.trim() || '_No details were written on the thread._',
    '',
    `## The spec (from the chosen position: ${positionTitle(position.body)})`,
    '',
    position.body.trim(),
  ].join('\n');
  const contributorIds = [...new Set(comments.map((c) => c.authorId).filter((id) => id !== position.authorId))];
  return {
    title: thread.title,
    scope,
    constraints: extractConstraints([position.body, ...comments.map((c) => c.body)]),
    proposerIds: [position.authorId],
    contributorIds,
  };
}

export function grantMarkdown(args: {
  grant: Grant;
  project: Project;
  version?: Version;
  members: Map<string, Member>;
}): string {
  const { grant, project, version, members } = args;
  const handle = (id: string) => '@' + (members.get(id)?.handle ?? 'unknown');
  const pct = Math.round(grant.proposerShare * 100);
  const lines = [
    `# Grant: ${grant.title}`,
    '',
    `**Project:** ${project.name}${version ? ` · ${version.name}` : ''}  `,
    `**Proposed by:** ${grant.proposerIds.map(handle).join(', ')}  `,
    `**Promoted by:** ${handle(grant.byMemberId)} (project lead)  `,
    `**Community signal at promotion:** weighted rank ${grant.weightedRankAtResolution}, raw rank ${grant.rawRankAtResolution}`,
  ];
  if (grant.contributorIds.length) lines.push(`**Also contributed:** ${grant.contributorIds.map(handle).join(', ')}`);
  lines.push('', grant.scope.trim());
  if (grant.constraints.length) {
    lines.push('', '## Interfaces and constraints (from the discussion)', '', ...grant.constraints.map((c) => `- ${c}`));
  }
  if (grant.overrideRationale) {
    lines.push('', '## Why the lead chose this over the top-voted position', '', grant.overrideRationale.trim());
  }
  lines.push(
    '',
    '## Rewards',
    '',
    `- Grant amount: _TBD_`,
    `- Proposer award: **${pct}%** of the grant to ${grant.proposerIds.map(handle).join(', ')} for writing the spec`,
    '',
    '## Deliverables',
    '',
    '- [ ] _Fill in from the spec above_',
  );
  return lines.join('\n');
}
