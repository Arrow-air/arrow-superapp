import { z } from "zod";
const id = z.string().min(1).max(200),
  text = z.string().max(100000),
  date = z.iso.date(),
  ids = z.array(id).max(500);
const source = z
  .object({
    id,
    title: text,
    url: z
      .url()
      .refine((s) => s.startsWith("https://"), "Use HTTPS source links."),
    date,
    kind: z.enum(["meeting", "repository", "wiki", "discord"]),
    note: text.optional(),
  })
  .strict();
const record = z
  .object({
    id,
    kind: z.enum(["design", "work", "question", "result"]),
    title: text,
    summary: text,
    body: text,
    systems: ids,
    versions: ids,
    status: z.enum([
      "documented",
      "analysis",
      "agreed",
      "reported",
      "in_progress",
      "planned",
      "proposal",
      "open",
      "completed",
      "historical",
    ]),
    statusNote: text,
    date,
    owner: text.optional(),
    next: text.optional(),
    attention: z.boolean().optional(),
    sourceIds: ids,
    relatedIds: ids,
    eventDate: date.optional(),
    lastVerifiedAt: date.optional(),
  })
  .strict();
export const evidenceInput = z
  .object({
    name: z.literal("Spearhead"),
    asOf: date,
    summary: text,
    versions: z
      .array(z.object({ id, name: text, summary: text }).strict())
      .min(1)
      .max(30),
    systems: z
      .array(z.object({ id, name: text, focusId: id.optional() }).strict())
      .max(100),
    sources: z.array(source).max(2000),
    records: z.array(record).max(5000),
    coverage: z.array(text).max(100),
  })
  .strict();
export function mergeEvidence(previous: any, next: any) {
  for (const kind of ["records", "sources", "systems", "versions"]) {
    const values = next[kind];
    if (new Set(values.map((r: any) => r.id)).size !== values.length)
      throw new Error("Duplicate " + kind + " IDs.");
  }
  const merged = {
    ...previous,
    ...next,
    records: [
      ...new Map(
        [...previous.records, ...next.records].map((r: any) => [r.id, r]),
      ).values(),
    ],
    sources: [
      ...new Map(
        [...previous.sources, ...next.sources].map((r: any) => [r.id, r]),
      ).values(),
    ],
  };
  for (const r of merged.records) {
    if (
      r.sourceIds.some(
        (id: string) => !merged.sources.some((s: any) => s.id === id),
      )
    )
      throw new Error("Missing source reference in " + r.id);
    if (
      r.relatedIds.some(
        (id: string) => !merged.records.some((s: any) => s.id === id),
      )
    )
      throw new Error("Missing related record in " + r.id);
    if (
      r.systems.some(
        (id: string) => !merged.systems.some((s: any) => s.id === id),
      )
    )
      throw new Error("Missing system in " + r.id);
    if (
      r.versions.some(
        (id: string) => !merged.versions.some((s: any) => s.id === id),
      )
    )
      throw new Error("Missing version in " + r.id);
  }
  const changes = (kind: string) =>
    next[kind].flatMap((r: any) => {
      const old = previous[kind].find((o: any) => o.id === r.id);
      return !old
        ? [{ id: r.id, title: r.title, kind: "added", after: r }]
        : stableJSON(old) !== stableJSON(r)
          ? [
              {
                id: r.id,
                title: r.title,
                kind: "updated",
                before: old,
                after: r,
              },
            ]
          : [];
    });
  const metadata = ["asOf", "summary", "versions", "systems", "coverage"]
    .filter((key) => stableJSON(previous[key]) !== stableJSON(merged[key]))
    .map((key) => ({
      id: key,
      title: key,
      kind: "updated",
      before: previous[key],
      after: merged[key],
    }));
  return {
    merged,
    metadata,
    records: changes("records"),
    sources: changes("sources"),
    retained: previous.records.filter(
      (r: any) => !next.records.some((n: any) => n.id === r.id),
    ).length,
  };
}

export function stableJSON(value: any): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, v[k]]),
        )
      : v,
  );
}
