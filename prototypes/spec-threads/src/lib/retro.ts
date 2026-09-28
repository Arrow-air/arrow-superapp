// Retro rewards for a version's discussion, the first tier agreed on the 2026-09-23 call.
//
// A pool of $ARROW is set aside for the version. At the freeze it is split across the
// contributions made to that version's discussions in proportion to their weighted net
// support, including ideas that were not adopted. The lead may pre-split the pool by
// aircraft system so a PCB idea and an airframe idea do not compete for the same share.
// Pure functions; nothing here moves tokens.

import type { ThreadBundle } from '../data/backend';
import { analyzeThread } from './analyze';
import type { Member, Project, ProjectRole, RetroAllocation, RetroItem, RetroLine, RetroPool } from './types';

export const PROJECT_WIDE = 'project-wide';

interface Scored extends Omit<RetroItem, 'amount'> { authorId: string; system: string }

/** Every contribution on threads addressed to the version, with its weighted net support. */
export function scoredContributions(args: {
  project: Project;
  versionId: string;
  bundles: ThreadBundle[];
  members: Member[];
  roles: ProjectRole[];
}): Scored[] {
  const { project, versionId, bundles, members, roles } = args;
  return bundles
    .filter((b) => b.thread.projectId === project.id && b.thread.versionId === versionId)
    .flatMap((bundle) => {
      const { tallies } = analyzeThread({ bundle, members, roles, project });
      return bundle.positions.map((p) => ({
        positionId: p.id,
        threadId: bundle.thread.id,
        authorId: p.authorId,
        system: bundle.thread.system || PROJECT_WIDE,
        score: Math.max(0, tallies.find((t) => t.positionId === p.id)?.weightedScore ?? 0),
      }));
    });
}

/** Split `amount` across items by score in whole tokens; largest remainders get the leftovers. */
function apportion(amount: number, items: Scored[]): RetroItem[] {
  const total = items.reduce((sum, i) => sum + i.score, 0);
  if (amount <= 0 || total <= 0) return [];
  const exact = items.filter((i) => i.score > 0).map((i) => ({ i, raw: (amount * i.score) / total }));
  const out = exact.map(({ i, raw }) => ({ positionId: i.positionId, threadId: i.threadId, score: i.score, amount: Math.floor(raw), frac: raw - Math.floor(raw) }));
  let left = Math.round(amount) - out.reduce((sum, o) => sum + o.amount, 0);
  for (const o of [...out].sort((a, b) => b.frac - a.frac)) {
    if (left <= 0) break;
    o.amount += 1;
    left -= 1;
  }
  return out.map(({ frac, ...rest }) => rest);
}

export function allocateRetro(pool: Pick<RetroPool, 'amount' | 'systemShares'>, contributions: Scored[]): RetroAllocation {
  const amount = Math.max(0, Math.floor(pool.amount));
  const shares = Object.entries(pool.systemShares ?? {}).filter(([, share]) => share > 0);
  const buckets: { amount: number; items: Scored[] }[] = [];
  let general = amount;
  for (const [system, share] of shares) {
    const items = contributions.filter((c) => c.system === system && c.score > 0);
    const bucket = Math.floor(amount * share);
    // A system share with nothing to reward rolls into the general pool rather than vanishing.
    if (!items.length) continue;
    buckets.push({ amount: bucket, items });
    general -= bucket;
  }
  // The rest of the pool rewards contributions outside the pre-split systems. If there are none,
  // it spreads across everything, so the pool is never stranded by an unused split.
  const funded = new Set(shares.map(([system]) => system).filter((s) => buckets.some((b) => b.items[0]?.system === s)));
  const scoredAll = contributions.filter((c) => c.score > 0);
  const rest = scoredAll.filter((c) => !funded.has(c.system));
  buckets.push({ amount: general, items: rest.length ? rest : scoredAll });
  const byAuthor = new Map<string, RetroLine>();
  let allocated = 0;
  for (const bucket of buckets) {
    const authorOf = new Map(bucket.items.map((i) => [i.positionId, i.authorId]));
    for (const item of apportion(bucket.amount, bucket.items)) {
      if (!item.amount) continue;
      const authorId = authorOf.get(item.positionId)!;
      const line = byAuthor.get(authorId) ?? { memberId: authorId, amount: 0, items: [] };
      const existing = line.items.find((x) => x.positionId === item.positionId);
      if (existing) existing.amount += item.amount;
      else line.items.push({ ...item });
      line.amount += item.amount;
      allocated += item.amount;
      byAuthor.set(authorId, line);
    }
  }
  const lines = [...byAuthor.values()].sort((a, b) => b.amount - a.amount);
  return { amount, lines, unallocated: amount - allocated };
}

export function versionRetro(args: {
  project: Project;
  versionId: string;
  bundles: ThreadBundle[];
  members: Member[];
  roles: ProjectRole[];
}): RetroAllocation | null {
  const version = args.project.versions.find((v) => v.id === args.versionId);
  if (!version?.retroPool) return null;
  if (version.retroAllocation) return version.retroAllocation;
  return allocateRetro(version.retroPool, scoredContributions(args));
}

/** Proposer award owed from a work package's reward: a slice for whoever wrote the idea. */
export function proposerAward(amount: number | undefined, share: number) {
  return amount && share > 0 ? Math.floor(amount * share) : 0;
}
