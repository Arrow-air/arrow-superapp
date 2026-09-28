import { randomUUID, createHash } from "node:crypto";
import { DemoBackend } from "../src/data/demoBackend";
import type { DemoState } from "../src/data/seed";
import { spearhead } from "../src/data/spearheadReal";
import { SHARED_WEIGHTS } from "../src/lib/weights";
import type { Member } from "../src/lib/types";
export const workspaceId = "spearhead";
export const digest = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
export function initialState(): DemoState {
  return {
    actingAs: null,
    projects: [
      {
        id: workspaceId,
        name: "Spearhead",
        systems: spearhead.systems.map((s) => s.id),
        weights: structuredClone(SHARED_WEIGHTS),
        versions: [
          { id: "PT1", name: "PT1 / PT1.5", state: "building", order: 1 },
          { id: "PT2", name: "PT2", state: "discussing", order: 2 },
          { id: "next", name: "PT3", state: "planned", order: 3 },
        ],
      },
    ],
    members: [],
    roles: [],
    threads: [],
    positions: [],
    votes: [],
    intents: [],
    comments: [],
    decisions: [],
    grants: [],
    briefs: [],
    drafts: [],
    specifications: [],
  };
}
export function domain(original: DemoState, memberId: string) {
  let current = structuredClone(original);
  current.actingAs = memberId;
  const backend = new DemoBackend(
    {
      getItem: () => JSON.stringify(current),
      setItem: (_key, value) => {
        current = JSON.parse(value);
      },
      removeItem: () => {
        throw new Error("Reset is unavailable.");
      },
    },
    { sampleData: false },
  );
  return {
    backend,
    read: () => {
      const out = structuredClone(current);
      out.actingAs = null;
      return out;
    },
  };
}
/** A mention handle from someone's name, unique in the workspace. Never derived from an email address. */
export function handleFor(name: string, taken: Iterable<string>): string {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "member";
  const used = new Set(taken);
  let handle = base;
  for (let n = 2; used.has(handle); n++) handle = `${base}-${n}`;
  return handle;
}
export function memberFor(
  id: string,
  _email: string,
  name: string,
  taken: Iterable<string> = [],
): Member {
  return {
    id,
    handle: handleFor(name, taken),
    displayName: name,
    expertise: [],
    verifiedExpertise: [],
    tokenBalance: 0,
  };
}
/**
 * Bring an existing workspace up to the current rules without touching its discussion history:
 * lead-weighted support instead of one account/one signal, name-based handles, PT3 naming.
 * Returns true when anything changed.
 */
export function migrateState(data: DemoState): boolean {
  const before = JSON.stringify(data);
  for (const project of data.projects) {
    const w = project.weights;
    const flat =
      w.roleMultiplier.lead === 1 &&
      w.roleMultiplier.core === 1 &&
      w.expertiseBonus === 0 &&
      w.builderBonus === 0;
    if (flat) project.weights = structuredClone(SHARED_WEIGHTS);
    for (const v of project.versions)
      if (v.id === "next" && v.name === "Next version") v.name = "PT3";
  }
  const taken: string[] = [];
  for (const m of data.members) {
    m.verifiedExpertise ??= [];
    // Older accounts used the email's local part plus an id suffix as a handle.
    if (/-[0-9a-f]{6}$/.test(m.handle) && m.handle.endsWith(m.id.slice(0, 6)))
      m.handle = handleFor(m.displayName, taken);
    taken.push(m.handle);
  }
  return JSON.stringify(data) !== before;
}
export function sourceThread(
  data: DemoState,
  recordId: string,
  actor: string,
  body?: string,
  title?: string,
  evidenceProject = spearhead,
) {
  const evidence = evidenceProject.records.find((r) => r.id === recordId);
  if (!evidence) throw new Error("Evidence record not found.");
  const existing = data.threads.find(
    (t) => (t as any).sourceRecordId === recordId && t.status === "open",
  );
  if (existing) {
    // Someone already opened this; their text joins that discussion instead of being dropped.
    if (body?.trim())
      data.positions.push({
        id: randomUUID(),
        threadId: existing.id,
        authorId: actor,
        body: body.trim(),
        createdAt: new Date().toISOString(),
      });
    return existing;
  }
  // A question about the aircraft in build stays with that build; everything else goes to
  // the version in discussion, per the 2026-09-23 call.
  const versions = data.projects[0].versions;
  const discussing = versions.find((v) => v.state === "discussing");
  const building = versions.find((v) => v.state === "building");
  const version =
    discussing && evidence.versions.includes(discussing.id)
      ? discussing
      : building && evidence.versions.includes(building.id)
        ? building
        : discussing;
  if (!version) throw new Error("No version is open for discussion.");
  if (!body?.trim())
    throw new Error("Write your opening contribution before starting the discussion.");
  const sourceText = `**Background from ${evidence.date}${evidence.owner ? `, raised by ${evidence.owner}` : ""}.** ${evidence.summary}\n\n${evidenceProject.sources
    .filter((s) => evidence.sourceIds.includes(s.id))
    .map((s) => `- [${s.title}](${s.url})`)
    .join("\n")}`;
  const thread = {
    id: randomUUID(),
    projectId: workspaceId,
    versionId: version.id,
    system: evidence.systems[0],
    title: title?.trim() || evidence.title,
    // The background is the question; the starter's own text is contribution #1, so it can earn support.
    body: sourceText,
    tags: [],
    authorId: actor,
    status: "open" as const,
    createdAt: new Date().toISOString(),
    deferrals: [],
    sourceRecordId: recordId,
  };
  data.threads.push(thread);
  data.positions.push({
    id: randomUUID(),
    threadId: thread.id,
    authorId: actor,
    body: body.trim(),
    createdAt: thread.createdAt,
  });
  return thread;
}
/**
 * Work from a discussion that started as a call question credits whoever raised it on the call,
 * not whoever clicked "Discuss this". Until that person has an account the award is held.
 */
export function creditCallProposers(
  data: DemoState,
  evidenceProject = spearhead,
) {
  for (const g of data.grants) {
    if (g.proposerNote !== undefined) continue;
    const t = data.threads.find((x) => x.id === g.threadId);
    const record = t?.sourceRecordId
      ? evidenceProject.records.find((r) => r.id === t.sourceRecordId)
      : undefined;
    if (!record?.owner) continue;
    g.proposerNote = `${record.owner} · ${record.date}`;
    g.proposerIds = [];
  }
}
