import { randomUUID, createHash } from "node:crypto";
import { DemoBackend } from "../src/data/demoBackend";
import type { DemoState } from "../src/data/seed";
import { spearhead } from "../src/data/spearheadReal";
import { DEFAULT_WEIGHTS } from "../src/lib/weights";
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
        weights: {
          ...DEFAULT_WEIGHTS,
          tokenFactor: 0,
          tokenCap: 0,
          expertiseBonus: 0,
          builderBonus: 0,
          roleMultiplier: { lead: 1, core: 1, member: 1 },
        },
        versions: [
          { id: "PT1", name: "PT1 / PT1.5", state: "building", order: 1 },
          { id: "PT2", name: "PT2", state: "discussing", order: 2 },
          { id: "next", name: "Next version", state: "planned", order: 3 },
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
export function memberFor(id: string, email: string, name: string): Member {
  return {
    id,
    handle:
      email
        .split("@")[0]
        .replace(/[^a-z0-9_-]/gi, "")
        .slice(0, 40) +
      "-" +
      id.slice(0, 6),
    displayName: name,
    expertise: [],
    tokenBalance: 0,
  };
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
  if (existing) return existing;
  const version = data.projects[0].versions.find(
    (v) => v.state === "discussing",
  );
  if (!version) throw new Error("No version is open for discussion.");
  const sourceText = `## Imported context\n\n${evidence.summary}\n\nEvidence dated ${evidence.date}. Reported contributor: ${evidence.owner ?? "Not recorded"}. This summary is not authored or approved by the source speaker in this app.\n\n${evidenceProject.sources
    .filter((s) => evidence.sourceIds.includes(s.id))
    .map((s) => `- [${s.title}](${s.url})`)
    .join("\n")}`;
  const thread = {
    id: randomUUID(),
    projectId: workspaceId,
    versionId: version.id,
    system: evidence.systems[0],
    title: title?.trim() || evidence.title,
    body: [body?.trim(), sourceText].filter(Boolean).join("\n\n"),
    tags: [],
    authorId: actor,
    status: "open" as const,
    createdAt: new Date().toISOString(),
    deferrals: [],
    sourceRecordId: recordId,
  };
  data.threads.push(thread);
  return thread;
}
