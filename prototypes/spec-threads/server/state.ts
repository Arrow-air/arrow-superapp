import { createHash } from "node:crypto";
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
export { sourceThread, holdCallProposerAwards } from "../src/lib/evidenceThreads";
