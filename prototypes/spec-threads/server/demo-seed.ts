// Seeds the example workspace: fictional contributors, about two weeks of PT2 activity on the real
// Spearhead call questions, and a freeze plan, so the whole flow can be shown end to end.
// Everything runs through the same domain rules as the real service. Only the example database
// (arrow_workspace_demo) is touched; the script refuses to run against anything else.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { creditCallProposers, digest, domain, initialState, memberFor, sourceThread, workspaceId } from "./state";
import { spearhead } from "../src/data/spearheadReal";
import { corpusKey } from "../src/lib/brief";
import { progressOf, trackingOf } from "../src/lib/projectRecords";
import type { DemoBackend } from "../src/data/demoBackend";
import type { DemoState } from "../src/data/seed";
import type { Role, WorkInput, WorkProgress } from "../src/lib/types";

const config = JSON.parse(readFileSync(".runtime/demo-server.json", "utf8"));
assert.equal(new URL(config.databaseUrl).pathname, "/arrow_workspace_demo", "Refusing to seed anything but the example database.");
const db = new pg.Pool({ connectionString: config.databaseUrl });
const admin = createClient(config.supabaseUrl, config.serviceKey, { auth: { persistSession: false } });
const LEAD_EMAIL = process.env.DEMO_LEAD_EMAIL ?? "thomas@arrowair.com";
// One password for every fictional account, kept across resets so a presenter can reuse it.
if (!config.demoPassword) {
  config.demoPassword = randomBytes(9).toString("base64url");
  writeFileSync(".runtime/demo-server.json", JSON.stringify(config), { mode: 0o600 });
}

// A scripted clock, so the activity reads like two weeks of work rather than one minute.
const RealDate = Date;
let clock = RealDate.parse("2026-09-14T15:00:00Z");
class ScriptedDate extends RealDate {
  constructor(...args: any[]) {
    super(...((args.length ? args : [clock]) as [number]));
  }
  static now() {
    return clock;
  }
}
(globalThis as any).Date = ScriptedDate;
const at = (iso: string) => {
  clock = RealDate.parse(iso);
};

// Fictional people. Names and bios are made up; the banner says so on every page.
const people = [
  { key: "mara", name: "Mara Quinn", role: "core" as Role, verified: ["power", "avionics"], skills: ["power electronics", "pcb"], location: "Bristol, UK", bio: "Fictional example contributor. Power electronics engineer who designs small drone boards." },
  { key: "ravi", name: "Ravi Menon", role: "core" as Role, verified: ["propulsion"], skills: ["propulsion", "powertrain"], location: "Pune, IN", bio: "Fictional example contributor. Propulsion and powertrain." },
  { key: "dev", name: "Dev Okafor", role: "member" as Role, verified: ["airframe"], skills: ["composites", "airframe"], location: "Lagos, NG", bio: "Fictional example contributor. Composites builder with his own workshop." },
  { key: "lin", name: "Lin Takeda", role: "member" as Role, verified: ["flight-controls"], skills: ["flight controls", "simulation"], location: "Osaka, JP", bio: "Fictional example contributor. Flight-control tuning and simulation." },
  { key: "sofia", name: "Sofia Reyes", role: "member" as Role, verified: [], skills: ["operations", "survey"], location: "Alpine, TX", bio: "Fictional example contributor. Operator who runs a small survey business and wants to fly one." },
];

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

let state: DemoState = initialState();
state.members = [memberFor(ids.thomas, LEAD_EMAIL, leadUser.user_metadata?.display_name ?? "Thomas")];
state.roles = [{ projectId: workspaceId, memberId: ids.thomas, role: "lead" }];
for (const p of people) {
  state.members.push({ ...memberFor(ids[p.key], "", p.name, state.members.map((m) => m.handle)), expertise: p.skills, location: p.location, bio: p.bio });
  state.roles.push({ projectId: workspaceId, memberId: ids[p.key], role: "member" });
}

interface Ev { actor: string; action: string; entity?: string; at: string; data: any }
const events: Ev[] = [];
async function act<T>(who: string, action: string, fn: (b: DemoBackend) => Promise<T>, data: any = {}, entity?: (r: T) => string | undefined): Promise<T> {
  const d = domain(state, ids[who]);
  const result = await fn(d.backend);
  state = d.read();
  events.push({ actor: ids[who], action, entity: entity?.(result) ?? data.threadId ?? data.id ?? data.versionId ?? data.memberId, at: new RealDate(clock).toISOString(), data });
  return result;
}
const start = (who: string, recordId: string, body: string) => {
  const t = sourceThread(state, recordId, ids[who], body, undefined, spearhead);
  events.push({ actor: ids[who], action: "startFromEvidence", entity: t.id, at: new RealDate(clock).toISOString(), data: { recordId, body } });
  return t.id;
};
const post = (who: string, threadId: string, body: string) => act(who, "createPosition", (b) => b.createPosition({ threadId, body }), { threadId, body }).then((p) => p.id);
const reply = (who: string, positionId: string, body: string) => act(who, "addComment", (b) => b.addComment({ positionId, body }), { positionId, body }, () => state.positions.find((p) => p.id === positionId)?.threadId);
const vote = (who: string, positionId: string) => act(who, "castVote", (b) => b.castVote({ positionId, value: 1 }), { positionId, value: 1 }, () => state.positions.find((p) => p.id === positionId)?.threadId);
const opening = (threadId: string) => state.positions.find((p) => p.threadId === threadId)!.id;
async function summarize(who: string, threadId: string, body: string, openQuestions = "") {
  const revision = state.drafts?.find((d) => d.threadId === threadId)?.revision ?? 0;
  await act(who, "saveOutcome", (b) => b.saveOutcome({ threadId, expectedRevision: revision, body, openQuestions }), { threadId });
}
async function settle(threadId: string, adopt: boolean, decision?: string, work?: WorkInput) {
  const d = domain(state, ids.thomas);
  const bundle = (await d.backend.getBundle(threadId))!;
  const input = { threadId, expectedRevision: bundle.draft!.revision, expectedCorpus: corpusKey(bundle), adopt, decision, work };
  const t = await d.backend.concludeThread(input);
  state = d.read();
  creditCallProposers(state, spearhead);
  events.push({ actor: ids.thomas, action: "concludeThread", entity: threadId, at: new RealDate(clock).toISOString(), data: input });
  return t.resolution?.kind === "conclude" ? t.resolution.grantIds[0] : undefined;
}
async function move(who: string, grantId: string, stage: WorkProgress["stage"], note: string, extra: Partial<WorkProgress> = {}) {
  const g = state.grants.find((x) => x.id === grantId)!;
  const t = trackingOf(g);
  const content = { ...progressOf(t), ...extra, stage };
  await act(who, "updateWork", (b) => b.updateWork({ id: grantId, expectedRevision: t.revision, content, note }), { id: grantId, content, note });
}
function claim(who: string, grantId: string) {
  // Mirrors the service's claim: the claimant owns it and work starts.
  const g = state.grants.find((x) => x.id === grantId)!;
  const t = trackingOf(g);
  const now = new RealDate(clock).toISOString();
  g.tracking = { ...t, ownerId: ids[who], stage: "in_progress", revision: t.revision + 1, history: [...t.history, { at: now, byMemberId: ids[who], note: "Assignment accepted: I accept this work and its acceptance criteria.", content: { ...progressOf(t), ownerId: ids[who], stage: "in_progress" } }] };
  events.push({ actor: ids[who], action: "claimWork", entity: grantId, at: now, data: { id: grantId } });
}
const intent = (who: string, threadId: string) => act(who, "setBuilderIntent", (b) => b.setBuilderIntent({ threadId, on: true }), { threadId, on: true });

// Sep 14 — the lead sets roles and confirms expertise.
at("2026-09-14T14:00:00Z");
for (const p of people) await act("thomas", "setMemberStanding", (b) => b.setMemberStanding!({ projectId: workspaceId, memberId: ids[p.key], role: p.role, verifiedExpertise: p.verified }), { memberId: ids[p.key], role: p.role });

// Charging: discussed, adopted, funded, delivered, accepted.
at("2026-09-14T16:00:00Z");
const charging = start("ravi", "charging-bms", "Characterize charging on the bench before choosing a BMS: charge both packs in place through the flight harness and log cell temperatures.");
at("2026-09-14T20:10:00Z");
const chargingOps = await post("sofia", charging, "From an operator's side, charging inside the airframe matters more than a fancy BMS. If we never have to pull a pack in the field, that's a win.");
at("2026-09-15T08:30:00Z");
await vote("mara", opening(charging)); await vote("thomas", opening(charging)); await vote("dev", chargingOps); await vote("lin", opening(charging));
await intent("sofia", charging);
at("2026-09-15T12:00:00Z");
await summarize("ravi", charging, "Characterize in-place charging on the bench before choosing a BMS.\n\nCharge both packs through the flight harness, log cell temperatures and balance behaviour, and pick the BMS from the results.");
at("2026-09-15T17:00:00Z");
const chargingWork = await settle(charging, true, "Characterize in-place charging on the bench before choosing a BMS", { kind: "bounty", purpose: "implementation", amount: 2000, title: "Bench charging procedure for both packs", scope: "Write and run a bench procedure that charges both packs through the flight harness and logs cell temperatures and balancing.", acceptance: "A procedure document and one full logged charge cycle per pack." });
at("2026-09-15T17:05:00Z");
await move("thomas", chargingWork!, "open", "Opened for claims.");
at("2026-09-16T09:40:00Z");
claim("sofia", chargingWork!);
at("2026-09-22T19:00:00Z");
await move("sofia", chargingWork!, "in_review", "Submitted for review.", { evidence: "Procedure v1 and two charge logs are in the Spearhead power folder. Both packs balanced within 12 mV; peak cell temperature 38 °C." });
at("2026-09-23T15:30:00Z");
await move("thomas", chargingWork!, "completed", "Results accepted.", { funding: "proposed" });

// Electric first: adopted into the spec without work.
at("2026-09-16T13:00:00Z");
const electric = start("ravi", "electric-first", "Fly PT2 electric first and add the gasoline configuration once transition is proven. One new variable at a time.");
at("2026-09-16T18:20:00Z");
const electricBoard = await post("mara", electric, "Agree, but size the power board for the starter-generator now so the gasoline step isn't a redesign.");
at("2026-09-17T10:00:00Z");
await vote("thomas", opening(electric)); await vote("lin", opening(electric)); await vote("sofia", opening(electric)); await vote("dev", electricBoard); await vote("ravi", electricBoard);
at("2026-09-19T15:00:00Z");
await summarize("ravi", electric, "PT2 flies electric first; the gasoline configuration follows once transition is proven.\n\nThe power board is sized for the starter-generator so the later step is not a redesign.");
at("2026-09-20T16:00:00Z");
await settle(electric, true, "PT2 flies electric first; gasoline follows once transition is proven");

// Tail servo regulators: adopted, funded, claimed, and submitted — waiting for the lead.
at("2026-09-15T14:10:00Z");
const servo = start("mara", "servo-redundancy", "Separate regulator per servo. A shared redundant output still has a single failure point in the OR-ing and the connector; two small regulators cost less than a lost tail surface.");
at("2026-09-15T18:30:00Z");
const servoShared = await post("dev", servo, "A shared regulator with ideal-diode OR-ing from both batteries keeps the tail board smaller. Per-servo regulators double the heat in a tight tail boom.");
at("2026-09-16T09:00:00Z");
await reply("lin", opening(servo), "From the flight-control side: losing one elevator half is flyable in our sim; losing both is not. That argues for Mara's split.");
await vote("lin", opening(servo)); await vote("ravi", opening(servo)); await vote("sofia", servoShared); await vote("thomas", opening(servo));
await intent("mara", servo);
at("2026-09-17T15:00:00Z");
await summarize("mara", servo, "Separate fused regulator per tail servo, fed from the tail board.\n\nEach regulator is sized for one servo's stall current with margin. Check heat on the bench before the board layout is frozen.");
at("2026-09-18T16:00:00Z");
const servoWork = await settle(servo, true, "Separate fused regulator per tail servo", { kind: "bounty", purpose: "implementation", amount: 3000, title: "Tail servo regulator schematic and bench test", scope: "Schematic for two independent fused regulators on the tail board, plus a bench test at servo stall current.", acceptance: "Schematic reviewed; bench log showing both regulators holding stall current for 10 minutes below 85 °C." });
at("2026-09-18T16:05:00Z");
await move("thomas", servoWork!, "open", "Opened for claims.");
at("2026-09-19T10:00:00Z");
claim("mara", servoWork!);

// A V-tail proposal: declined with a reason.
at("2026-09-18T11:00:00Z");
const vtail = await act("sofia", "createThread", (b) => b.createThread({ projectId: workspaceId, system: "airframe", title: "Should PT2 switch to a V-tail?", body: "A V-tail saves a servo and a little drag, and it's simpler to transport.", tags: [] }), {}, (t) => t.id);
at("2026-09-18T15:40:00Z");
const vtailNo = await post("dev", vtail.id, "It couples pitch and yaw in the mixer and changes the tail PCB and servo layout we're about to agree.");
await vote("thomas", vtailNo); await vote("lin", vtailNo);
at("2026-09-19T14:00:00Z");
await act("thomas", "resolveThread", (b) => b.resolveThread({ threadId: vtail.id, kind: "reject", note: "Out of scope for PT2: the tail PCB and servo layout assume a conventional tail." }), { threadId: vtail.id, kind: "reject" });

// Freeze plan and retro pool.
at("2026-09-20T17:00:00Z");
await act("thomas", "setVersionPlan", (b) => b.setVersionPlan!({ projectId: workspaceId, versionId: "PT2", freezeTarget: "2026-10-18", retroPool: { amount: 25000, systemShares: { power: 0.2 } } }), { versionId: "PT2", freezeTarget: "2026-10-18", retroPool: { amount: 25000 } });

// Wing skins: open, and weighting changes which approach leads.
at("2026-09-20T15:00:00Z");
const wing = start("dev", "wing-skin-choice", "Oracover for the PT2 wings. It's faster to build and repair, and PT2 is still a test aircraft; carbon skins cost us weeks on PT1.");
at("2026-09-21T11:00:00Z");
const wingCarbon = await post("sofia", wing, "Carbon skins for anything that will fly from rough strips. Film tears on landing, and field repairs are messy.");
at("2026-09-21T13:00:00Z");
await reply("lin", opening(wing), "Stiffness matters for flutter at transition speeds. Oracover over a carbon D-box should be fine, but we should check it.");
at("2026-09-22T09:30:00Z");
const wingHybrid = await post("ravi", wing, "Oracover now over a carbon D-box leading edge; revisit full carbon for PT3 once the wing shape is final.");
await intent("dev", wing);
at("2026-09-22T16:00:00Z");
await vote("mara", wingCarbon); await vote("lin", wingCarbon); await vote("ravi", wingCarbon);
await vote("thomas", wingHybrid); await vote("dev", wingHybrid);
at("2026-09-23T10:00:00Z");
await reply("sofia", wingHybrid, "I could live with this if the D-box goes all the way to the tip.");

// Tail airfoil: settled as research work, open to claim.
at("2026-09-22T14:00:00Z");
const airfoil = start("lin", "tail-airfoil-conflict", "The tail note says NACA 0015 and the configuration files say 0018. We should confirm which one PT1 actually flies before PT2 inherits it.");
at("2026-09-22T19:30:00Z");
const airfoilDev = await post("dev", airfoil, "I'm fairly sure PT1's tail was cut from the 0018 templates and the note is stale, but I'd measure it before trusting me.");
await vote("thomas", opening(airfoil)); await vote("mara", opening(airfoil)); await vote("sofia", airfoilDev);
at("2026-09-24T12:00:00Z");
await summarize("lin", airfoil, "Confirm the PT1 tail section from the build templates and a measurement, then correct the note.", "Which section does PT1 actually fly?");
at("2026-09-25T16:00:00Z");
const airfoilWork = await settle(airfoil, false, undefined, { kind: "grant", purpose: "research", amount: 1500, title: "Measure the PT1 tail section and correct the airfoil note", scope: "Measure the PT1 horizontal tail at three stations, compare with the 0015 and 0018 templates, and update the information note.", acceptance: "Measurements with photos, the matching section named, and a corrected note." });
at("2026-09-25T16:05:00Z");
await move("thomas", airfoilWork!, "open", "Opened for claims.");

// Belly payload rail: deferred to PT3.
at("2026-09-21T09:00:00Z");
const rail = await act("sofia", "createThread", (b) => b.createThread({ projectId: workspaceId, system: "payload", title: "Should PT2 carry a belly payload rail?", body: "Operators will want to hang a camera or a small sprayer. A standard rail now saves a redesign later.", tags: [] }), {}, (t) => t.id);
at("2026-09-21T17:00:00Z");
const railLin = await post("lin", rail.id, "A rail is fine, but we have no payload mass or power budget yet. It's hard to design an interface without a customer.");
await vote("thomas", railLin); await vote("dev", railLin);
at("2026-09-24T15:00:00Z");
await act("thomas", "resolveThread", (b) => b.resolveThread({ threadId: rail.id, kind: "defer", toVersionId: "next", note: "Needs payload mass and power requirements first; revisit for PT3." }), { threadId: rail.id, kind: "defer" });

// Main-board interfaces: converged, with a summary ready for the lead.
at("2026-09-23T14:00:00Z");
const board = start("mara", "main-peripherals", "The main board needs six PWM servo outputs, a temperature input per motor, switched ignition power for the gasoline build, and two CAN buses.");
at("2026-09-24T10:30:00Z");
const boardRavi = await post("ravi", board, "Keep the ignition and fuel-pump outputs on the board even for the electric build, just unpopulated. Re-spinning the board for gasoline later costs more than the connector.");
at("2026-09-24T13:00:00Z");
await reply("lin", opening(board), "Two CAN buses please: one for the ESCs, one for servos and sensors.");
await vote("thomas", opening(board)); await vote("lin", opening(board)); await vote("ravi", opening(board)); await vote("mara", boardRavi); await vote("dev", boardRavi);
at("2026-09-26T11:00:00Z");
await summarize("mara", board, "Main board: six PWM servo outputs, per-motor temperature inputs, two CAN buses (ESCs; servos and sensors), and gasoline ignition and fuel-pump outputs footprinted but unpopulated on the electric build.");

// A PT1 build question stays with PT1.
at("2026-09-24T18:00:00Z");
const imbalance = start("lin", "motor-imbalance", "Log heading and wind for every hover. If the imbalance tracks the wind direction, it's tail loading, not motor variation.");
at("2026-09-25T09:00:00Z");
const imbalanceDev = await post("dev", imbalance, "We already stiffened the arms. I'd also swap two motors front-to-back and see whether the imbalance follows the motor.");
await vote("thomas", imbalanceDev); await vote("mara", opening(imbalance));

// Mara submits the servo work; it now waits for the lead.
at("2026-09-26T20:00:00Z");
await move("mara", servoWork!, "in_review", "Submitted for review.", { evidence: "Schematic rev A and the bench log are in the tail-board folder. Both regulators held stall current for 10 minutes; peak 71 °C." });

// Write the workspace, its activity, and the lead's recent notifications.
await db.query("update arrow_workspace.workspaces set data=$1,revision=$2,updated_at=now() where id=$3", [JSON.stringify({ ...state, actingAs: null }), events.length, workspaceId]);
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
