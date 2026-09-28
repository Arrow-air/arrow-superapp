// Seeds the example workspace: fictional contributors, about two weeks of PT2 activity on the real
// Spearhead call questions, and a freeze plan, so the whole flow can be shown end to end.
// Everything runs through the same domain rules as the real service. Only the example database
// (arrow_workspace_demo) is touched; the script refuses to run against anything else.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { digest, workspaceId } from "./state";
import { people, runExampleScenario, type Ev } from "./exampleScenario";
import { spearhead } from "../src/data/spearheadReal";

const config = JSON.parse(readFileSync(".runtime/demo-server.json", "utf8"));
assert.equal(new URL(config.databaseUrl).pathname, "/arrow_workspace_demo", "Refusing to seed anything but the example database.");
const db = new pg.Pool({ connectionString: config.databaseUrl });
const admin = createClient(config.supabaseUrl, config.serviceKey, { auth: { persistSession: false } });
const LEAD_EMAIL: string = process.env.DEMO_LEAD_EMAIL ?? config.leadEmail;
assert.ok(LEAD_EMAIL, "Set leadEmail in .runtime/demo-server.json or DEMO_LEAD_EMAIL.");
// One password for every fictional account, kept across resets so a presenter can reuse it.
if (!config.demoPassword) {
  config.demoPassword = randomBytes(9).toString("base64url");
  writeFileSync(".runtime/demo-server.json", JSON.stringify(config), { mode: 0o600 });
}

const userFile = ".runtime/demo-users.json";
try {
  for (const u of JSON.parse(readFileSync(userFile, "utf8"))) if (u.id) await admin.auth.admin.deleteUser(u.id);
} catch {}
await db.query(
  "truncate arrow_workspace.notifications,arrow_workspace.events,arrow_workspace.snapshots,arrow_workspace.invites,arrow_workspace.watches,arrow_workspace.reconciliations,arrow_workspace.attachments,arrow_workspace.read_cursors,arrow_workspace.evidence_versions restart identity cascade",
);
await db.query("insert into arrow_workspace.evidence(workspace_id,revision,digest,data) values($1,1,$2,$3) on conflict(workspace_id) do update set revision=1,digest=excluded.digest,data=excluded.data", [workspaceId, digest(JSON.stringify(spearhead)), JSON.stringify(spearhead)]);

// The lead is the real project lead's own login, so they can settle and freeze live.
const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
const leadUser = list.users.find((u) => u.email === LEAD_EMAIL);
assert.ok(leadUser, `No account for ${LEAD_EMAIL}. Set DEMO_LEAD_EMAIL.`);
const ids: Record<string, string> = { thomas: leadUser.id };
const created: { key: string; name: string; email: string; password: string; id: string }[] = [];
for (const p of people) {
  const email = `demo-${p.key}@example.test`, password = config.demoPassword as string;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: p.name } });
  assert.ok(!error && data.user, error?.message ?? "Could not create example account.");
  ids[p.key] = data.user.id;
  created.push({ key: p.key, name: p.name, email, password, id: data.user.id });
}
writeFileSync(userFile, JSON.stringify(created, null, 2), { mode: 0o600 });

const { state, events } = await runExampleScenario(ids, { id: leadUser.id, email: LEAD_EMAIL, name: leadUser.user_metadata?.display_name ?? "Thomas" });

// Write the workspace, its activity, and the lead's recent notifications.
await db.query("update arrow_workspace.workspaces set data=$1,revision=$2,updated_at=now() where id=$3", [JSON.stringify(state), events.length, workspaceId]);
const titleOf = (id?: string) => state.threads.find((t) => t.id === id)?.title ?? state.grants.find((g) => g.id === id)?.title ?? state.members.find((m) => m.id === id)?.displayName ?? state.projects[0].versions.find((v) => v.id === id)?.name ?? "Spearhead";
const leadSees = (e: Ev) => e.actor !== ids.thomas && (["createPosition", "addComment", "startFromEvidence", "updateWork", "claimWork", "createThread"].includes(e.action));
for (const e of events.sort((a, b) => a.at.localeCompare(b.at))) {
  const { rows } = await db.query("insert into arrow_workspace.events(workspace_id,actor_id,action,entity_id,title,data,at) values($1,$2,$3,$4,$5,$6,$7) returning id", [workspaceId, e.actor, e.action, e.entity ?? null, titleOf(e.entity), JSON.stringify(e.data), e.at]);
  if (leadSees(e)) await db.query("insert into arrow_workspace.notifications(workspace_id,member_id,event_id,read_at) values($1,$2,$3,$4)", [workspaceId, ids.thomas, rows[0].id, e.at < "2026-09-24" ? e.at : null]);
}
await db.query("insert into arrow_workspace.watches values($1,$2,'project') on conflict do nothing", [workspaceId, ids.thomas]);
await db.end();
console.log(`Example workspace seeded: ${state.threads.length} discussions, ${state.positions.length} contributions, ${state.votes.length} votes, ${state.decisions.length} decisions, ${state.grants.length} work items, ${events.length} events.`);
void randomUUID;
