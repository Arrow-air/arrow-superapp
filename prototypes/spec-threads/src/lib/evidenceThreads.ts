// Starting a discussion from a call or document record, and crediting the work that follows.
// Shared by the server and the in-browser example workspace, so it avoids Node-only APIs.
import type { DemoState } from "../data/seed";
import { spearhead } from "../data/spearheadReal";

const workspaceId = "spearhead";
const randomUUID = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

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
  const sourceText = `**Background from ${evidence.date}.** ${evidence.summary}${evidence.owner ? ` The notes name ${evidence.owner}.` : ""}\n\n${evidenceProject.sources
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
 * Work from a discussion that started as a call question: the idea came from the call, not from
 * whoever clicked "Discuss this", and the notes alone don't prove who raised it. The proposer award
 * is held, linked to the record, until a lead confirms who gets it.
 */
export function holdCallProposerAwards(
  data: DemoState,
  evidenceProject = spearhead,
) {
  for (const g of data.grants) {
    if (g.proposerRecordId !== undefined || g.proposerNote !== undefined) continue;
    const t = data.threads.find((x) => x.id === g.threadId);
    const record = t?.sourceRecordId
      ? evidenceProject.records.find((r) => r.id === t.sourceRecordId)
      : undefined;
    if (!record) continue;
    g.proposerRecordId = record.id;
    g.proposerIds = [];
  }
}
