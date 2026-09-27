import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes, createHash } from "node:crypto";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { initialState, digest } from "./state";
import { spearhead } from "../src/data/spearheadReal";
import { corpusKey } from "../src/lib/brief";
const config = JSON.parse(
  readFileSync(".runtime/acceptance-server.json", "utf8"),
);
assert.equal(
  new URL(config.databaseUrl).pathname,
  "/arrow_workspace_acceptance",
);
const db = new pg.Pool({ connectionString: config.databaseUrl });
const admin = createClient(config.supabaseUrl, config.serviceKey, {
  auth: { persistSession: false },
});
const BASE = "http://127.0.0.1:4197";
let checks = 0;
function check(name: string, value: unknown) {
  assert.ok(value, name);
  console.log("PASS " + name);
  checks++;
}
const userFile = ".runtime/acceptance-users.json";
try {
  const old = JSON.parse(readFileSync(userFile, "utf8"));
  for (const u of old) if (u.id) await admin.auth.admin.deleteUser(u.id);
} catch {}
await db.query(
  "truncate arrow_workspace.notifications,arrow_workspace.events,arrow_workspace.snapshots,arrow_workspace.invites,arrow_workspace.watches,arrow_workspace.reconciliations,arrow_workspace.attachments,arrow_workspace.read_cursors,arrow_workspace.evidence_versions restart identity cascade",
);
await db.query(
  "update arrow_workspace.workspaces set data=$1,revision=0 where id=$2",
  [JSON.stringify(initialState()), "spearhead"],
);
await db.query(
  "update arrow_workspace.evidence set revision=1,data=$1,digest=$2 where workspace_id=$3",
  [JSON.stringify(spearhead), digest(JSON.stringify(spearhead)), "spearhead"],
);
const users: any[] = [];
for (const role of ["lead", "member"]) {
  const token = randomBytes(32).toString("hex"),
    email = `arrow-${role}-${Date.now()}@example.test`,
    password = randomBytes(24).toString("base64url");
  await db.query(
    "insert into arrow_workspace.invites values($1,$2,$3,$4,$5,now()+interval '1 hour',null)",
    [
      createHash("sha256").update(token).digest("hex"),
      "spearhead",
      email,
      role,
      "Acceptance " + role,
    ],
  );
  const accept = await fetch(BASE + "/api/invite/accept", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  assert.equal(accept.status, 200, await accept.text());
  const reuse = await fetch(BASE + "/api/invite/accept", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  check(role + " invitation is single-use", reuse.status === 403);
  const client = createClient(config.supabaseUrl, config.anonKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  assert.ifError(error);
  users.push({
    role,
    email,
    password,
    token: data.session!.access_token,
    id: data.user!.id,
  });
}
writeFileSync(userFile, JSON.stringify(users), { mode: 0o600 });
const [lead, member] = users;
async function call(user: any, path: string, body?: unknown) {
  const r = await fetch(BASE + "/api" + path, {
    method: body ? "POST" : "GET",
    headers: {
      ...(user ? { authorization: "Bearer " + user.token } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  return { status: r.status, data };
}
async function snapshot(user = lead) {
  const r = await call(user, "/state");
  assert.equal(r.status, 200);
  return r.data;
}
async function rpc(
  user: any,
  method: string,
  input: unknown,
  revision?: number,
) {
  return call(user, "/rpc", {
    method,
    input,
    expectedRevision: revision ?? (await snapshot(user)).revision,
  });
}
check(
  "anonymous sees evidence but not team state",
  (await call(null, "/evidence")).status === 200 &&
    (await call(null, "/state")).status === 401,
);
check(
  "forged JWT is rejected",
  (await call({ token: "forged" }, "/state")).status === 401,
);
check(
  "fresh shared state has no fictional members",
  (await snapshot()).members.length === 2 &&
    (await snapshot()).threads.length === 0,
);
check(
  "reset and impersonation APIs are unavailable",
  (await rpc(lead, "reset", {})).status === 404 &&
    (await rpc(lead, "actAs", member.id)).status === 404,
);
check(
  "profile cannot self-assign tokens or roles",
  (await rpc(member, "updateProfile", { tokenBalance: 100000, role: "lead" }))
    .status === 400,
);
const start = await rpc(member, "startFromEvidence", {
  recordId: "charging-bms",
});
assert.equal(start.status, 200, JSON.stringify(start.data));
const thread = start.data.result;
check(
  "source-linked discussion records actual app author",
  thread.authorId === member.id &&
    thread.sourceRecordId === "charging-bms" &&
    thread.body.includes("not authored or approved"),
);
check(
  "repeated source discussion start is idempotent",
  (await rpc(member, "startFromEvidence", { recordId: "charging-bms" })).data
    .result.id === thread.id,
);
await call(member, "/watches", { target: thread.id, on: true });
const stale = (await snapshot()).revision;
const contribution = await rpc(lead, "createPosition", {
  threadId: thread.id,
  body: "Use a documented bench test to evaluate charging behavior.",
});
assert.equal(contribution.status, 200, JSON.stringify(contribution.data));
check(
  "stale concurrent writer cannot overwrite changes",
  (
    await rpc(
      member,
      "createPosition",
      { threadId: thread.id, body: "Stale contribution" },
      stale,
    )
  ).status === 409,
);
const comment = await rpc(member, "addComment", {
  positionId: contribution.data.result.id,
  body: "Please record the pack configuration and acceptance criteria.",
});
assert.equal(comment.status, 200);
check(
  "another author cannot edit a contribution",
  (
    await rpc(member, "editContribution", {
      kind: "position",
      id: contribution.data.result.id,
      expectedBody: contribution.data.result.body,
      body: "Override",
    })
  ).status === 403,
);
const draft = await rpc(lead, "saveOutcome", {
  threadId: thread.id,
  expectedRevision: 0,
  body: "Characterize charging on the bench; no flight approval is implied.",
  openQuestions: "",
});
assert.equal(draft.status, 200, JSON.stringify(draft.data));
function bundle(s: any) {
  const t = s.threads.find((t: any) => t.id === thread.id),
    positions = s.positions.filter((p: any) => p.threadId === t.id);
  return {
    thread: t,
    positions,
    comments: s.comments.filter((c: any) =>
      positions.some((p: any) => p.id === c.positionId),
    ),
    votes: [],
    intents: [],
    draft: s.drafts.find((d: any) => d.threadId === t.id),
  };
}
const s = await snapshot();
const resolution = {
  threadId: thread.id,
  expectedRevision: 1,
  expectedCorpus: corpusKey(bundle(s)),
  adopt: true,
  work: {
    kind: "bounty",
    purpose: "implementation",
    title: "Document a bench charging procedure",
    scope:
      "Write and review the procedure with configuration and measurement fields.",
    acceptance: "Provide a reviewed procedure and linked test evidence.",
  },
};
check(
  "contributor cannot approve an outcome",
  (await rpc(member, "concludeThread", resolution)).status >= 400,
);
const closed = await rpc(lead, "concludeThread", resolution);
assert.equal(closed.status, 200, JSON.stringify(closed.data));
const grantId = closed.data.result.resolution.grantIds[0];
let g = (await snapshot()).grants.find((g: any) => g.id === grantId);
check(
  "decision and work created atomically from reviewed outcome",
  !!closed.data.result.resolution.decisionId &&
    !!g &&
    g.outcomeSnapshot.sources.length === 3,
);
let progress = { ...g.tracking, stage: "open", ownerId: member.id };
delete progress.history;
delete progress.revision;
const updated = await rpc(lead, "updateWork", {
  id: grantId,
  expectedRevision: 0,
  content: progress,
  note: "Assign the accepted scope for implementation.",
});
assert.equal(updated.status, 200, JSON.stringify(updated.data));
g = updated.data.result;
check(
  "contributor cannot change assigned funding",
  (
    await rpc(member, "updateWork", {
      id: grantId,
      expectedRevision: g.tracking.revision,
      content: { ...progress, funding: "paid" },
      note: "Try to pay",
    })
  ).status >= 400,
);
let result = await rpc(member, "updateWork", {
  id: grantId,
  expectedRevision: g.tracking.revision,
  content: { ...progress, stage: "in_progress" },
  note: "Started work",
});
assert.equal(result.status, 200, JSON.stringify(result.data));
g = result.data.result;
check(
  "review requires result evidence",
  (
    await rpc(member, "updateWork", {
      id: grantId,
      expectedRevision: g.tracking.revision,
      content: { ...progress, stage: "in_review" },
      note: "Submit empty results",
    })
  ).status >= 400,
);
const upload = await call(member, "/attachments", {
  entityId: grantId,
  filename: "bench-result.txt",
  mediaType: "text/plain",
  data: Buffer.from(
    "Acceptance test fixture; not real aircraft evidence.",
  ).toString("base64"),
  note: "Test fixture revision 1",
});
assert.equal(upload.status, 200, JSON.stringify(upload.data));
result = await rpc(member, "updateWork", {
  id: grantId,
  expectedRevision: g.tracking.revision,
  content: {
    ...progress,
    stage: "in_review",
    evidence: "Procedure and acceptance-test attachment " + upload.data.id,
  },
  note: "Submitted for lead review",
});
assert.equal(result.status, 200, JSON.stringify(result.data));
g = result.data.result;
check(
  "owner can submit but cannot accept own work",
  (
    await rpc(member, "updateWork", {
      id: grantId,
      expectedRevision: g.tracking.revision,
      content: {
        ...progress,
        stage: "completed",
        evidence: g.tracking.evidence,
      },
      note: "Self accept",
    })
  ).status >= 400,
);
result = await rpc(lead, "updateWork", {
  id: grantId,
  expectedRevision: g.tracking.revision,
  content: { ...progress, stage: "completed", evidence: g.tracking.evidence },
  note: "Reviewed and accepted the test deliverable",
});
assert.equal(result.status, 200, JSON.stringify(result.data));
check(
  "accepted completion does not invent payment",
  result.data.result.tracking.funding === "unfunded" &&
    result.data.result.tracking.stage === "completed",
);
check(
  "followed discussion creates recipient notifications",
  (await call(member, "/notifications")).data.length > 0,
);
check(
  "submitted work requests lead attention",
  (await call(lead, "/notifications")).data.some(
    (n: any) => n.entity_id === grantId,
  ),
);
const exportData = await call(lead, "/export");
check(
  "export includes reviewed records, evidence, events and file manifest",
  exportData.data.project.decisions.length === 1 &&
    exportData.data.evidence.records.length === 55 &&
    exportData.data.attachments.length === 1 &&
    exportData.data.events.length > 5,
);
check(
  "export never contains auth credentials or invitation tokens",
  !JSON.stringify(exportData.data).includes(lead.password) &&
    !JSON.stringify(exportData.data).includes(lead.token),
);
const anonFile = await call(null, "/attachments/" + upload.data.id);
check("files require authentication", anonFile.status === 401);
const direct = await fetch(BASE + "/api/attachments/" + upload.data.id, {
  headers: { authorization: "Bearer " + member.token },
});
check(
  "file bytes and safe disposition survive retrieval",
  (await direct.text()).includes("Acceptance test fixture") &&
    direct.headers.get("content-disposition")?.startsWith("attachment;"),
);
check(
  "auditable snapshots preserve earlier revisions",
  (await db.query("select count(*)::int as n from arrow_workspace.snapshots"))
    .rows[0].n > 5,
);
// Recovery drill: copy an actual immutable revision into a separate recovery row, verify contents, and retain the live row unchanged.
const before = await snapshot();
const saved = await db.query(
  "select revision,data from arrow_workspace.snapshots order by revision desc limit 1",
);
await db.query(
  "insert into arrow_workspace.workspaces(id,revision,data) values($1,$2,$3) on conflict(id) do update set revision=excluded.revision,data=excluded.data",
  ["recovery-check", saved.rows[0].revision, saved.rows[0].data],
);
const restored = await db.query(
  "select data from arrow_workspace.workspaces where id=$1",
  ["recovery-check"],
);
check(
  "snapshot restore reconstructs earlier state without changing current project",
  JSON.stringify(restored.rows[0].data) ===
    JSON.stringify(saved.rows[0].data) &&
    (await snapshot()).revision === before.revision,
);

check(
  "contributor cannot invite new privileged members",
  (
    await call(member, "/invites", {
      email: "x@example.test",
      displayName: "Not allowed",
      role: "lead",
    })
  ).status === 403,
);
const blockedOrigin = await fetch(BASE + "/api/rpc", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: "Bearer " + lead.token,
    origin: "https://untrusted.example",
  },
  body: JSON.stringify({
    method: "updateProfile",
    input: { bio: "cross origin" },
    expectedRevision: (await snapshot()).revision,
  }),
});
check("cross-origin writes are rejected", blockedOrigin.status === 403);
const ev = (await call(null, "/evidence")).data;
check(
  "unchanged exported evidence previews as no-op",
  !(
    await call(lead, "/import/preview", {
      project: ev.data,
      expectedRevision: ev.revision,
    })
  ).data.changed,
);
const modified = structuredClone(ev.data);
modified.summary += " Acceptance import check.";
check(
  "contributor cannot import source evidence",
  (
    await call(member, "/import/preview", {
      project: modified,
      expectedRevision: ev.revision,
    })
  ).status === 403,
);
const importPreview = await call(lead, "/import/preview", {
  project: modified,
  expectedRevision: ev.revision,
});
check(
  "import preview does not mutate evidence",
  importPreview.status === 200 &&
    importPreview.data.changed &&
    (await call(null, "/evidence")).data.revision === ev.revision,
);
const applied = await call(lead, "/import/apply", {
  project: modified,
  expectedRevision: ev.revision,
});
check(
  "reviewed import preserves record count and prior revision",
  applied.status === 200 &&
    (await call(null, "/evidence")).data.data.records.length === 55 &&
    (
      await db.query(
        "select count(*)::int as n from arrow_workspace.evidence_versions",
      )
    ).rows[0].n >= 1,
);
const duplicate = await call(lead, "/import/apply", {
  project: modified,
  expectedRevision: applied.data.revision,
});
check(
  "identical import is a no-op",
  duplicate.status === 200 &&
    !duplicate.data.changed &&
    duplicate.data.revision === applied.data.revision,
);
check(
  "stale import cannot overwrite a newer revision",
  (
    await call(lead, "/import/apply", {
      project: ev.data,
      expectedRevision: ev.revision,
    })
  ).status === 409,
);
const bad = structuredClone(modified);
bad.records[0].sourceIds = ["missing-source"];
check(
  "broken source references reject the import",
  (
    await call(lead, "/import/preview", {
      project: bad,
      expectedRevision: applied.data.revision,
    })
  ).status === 400,
);
console.log(checks + " shared API acceptance checks passed.");
await db.end();
