// Retro rewards for a version's discussion, as the spec workspace does it
// (DECISIONS 2026-09-23): a pool of $ARROW set aside for the version is split
// at the freeze across every position on its threads, in proportion to
// weighted net support, adopted or not. Whole tokens; the largest remainders
// take the leftovers. Nothing here moves tokens.

export interface Scored { positionId: string; threadId: string; recipient: string; score: number }
export interface RetroItem { positionId: string; threadId: string; score: number; amount: number }
export interface RetroLine { recipient: string; amount: number; items: RetroItem[] }
export interface RetroAllocation { amount: number; lines: RetroLine[]; unallocated: number; at?: string }

export function allocateRetro(pool: number, contributions: Scored[]): RetroAllocation {
  const amount = Math.max(0, Math.floor(pool));
  const items = contributions.filter((c) => c.score > 0);
  const total = items.reduce((sum, i) => sum + i.score, 0);
  if (!amount || !total) return { amount, lines: [], unallocated: amount };
  const exact = items.map((i) => ({ i, raw: (amount * i.score) / total }));
  const out = exact.map(({ i, raw }) => ({ i, amount: Math.floor(raw), frac: raw - Math.floor(raw) }));
  let left = amount - out.reduce((sum, o) => sum + o.amount, 0);
  for (const o of [...out].sort((a, b) => b.frac - a.frac)) {
    if (left <= 0) break;
    o.amount += 1;
    left -= 1;
  }
  const byRecipient = new Map<string, RetroLine>();
  for (const { i, amount: a } of out) {
    if (!a) continue;
    const line = byRecipient.get(i.recipient) ?? { recipient: i.recipient, amount: 0, items: [] };
    line.items.push({ positionId: i.positionId, threadId: i.threadId, score: i.score, amount: a });
    line.amount += a;
    byRecipient.set(i.recipient, line);
  }
  const lines = [...byRecipient.values()].sort((a, b) => b.amount - a.amount);
  return { amount, lines, unallocated: amount - lines.reduce((s, l) => s + l.amount, 0) };
}

/** Proposer award owed from a work package's reward: a slice for whoever wrote the idea. */
export const proposerAward = (reward: number, share: number) => (reward > 0 && share > 0 ? Math.floor(reward * share) : 0);
