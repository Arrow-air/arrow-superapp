// The example Spearhead scenario: fictional contributors and about two weeks of PT2 activity on the
// real call questions, run through the same domain rules as the service. Used to seed the example
// database and to build the static example that specs.arrowair.com serves.
import { holdCallProposerAwards, domain, initialState, memberFor, sourceThread, workspaceId } from "./state";
import { spearhead } from "../src/data/spearheadReal";
import { corpusKey } from "../src/lib/brief";
import { progressOf, trackingOf } from "../src/lib/projectRecords";
import type { DemoBackend } from "../src/data/demoBackend";
import type { DemoState } from "../src/data/seed";
import type { ModelAnchor, Role, WorkInput, WorkProgress } from "../src/lib/types";
import { anchorLabel, MODEL_ID } from "../src/workspace/model";

/** An anchor on the Spearhead model, labelled the way the app labels it. */
const on = (group: string, component?: string, part?: string): ModelAnchor => ({ model: MODEL_ID, group, ...(component ? { component } : {}), ...(part ? { part } : {}), label: anchorLabel({ group, component, part }) });

// Fictional people. Names and bios are made up; the banner says so on every page.
export const people = [
  { key: "nadia", name: "Nadia Park", role: "lead" as Role, verified: [], skills: ["systems engineering", "flight test"], location: "Denver, US", bio: "Fictional example project lead. Every earlier lead action in this example workspace is hers." },
  { key: "mara", name: "Mara Quinn", role: "core" as Role, verified: ["power", "avionics"], skills: ["power electronics", "pcb"], location: "Bristol, UK", bio: "Fictional example contributor. Power electronics engineer who designs small drone boards." },
  { key: "ravi", name: "Ravi Menon", role: "core" as Role, verified: ["propulsion"], skills: ["propulsion", "powertrain"], location: "Pune, IN", bio: "Fictional example contributor. Propulsion and powertrain." },
  { key: "dev", name: "Dev Okafor", role: "member" as Role, verified: ["airframe"], skills: ["composites", "airframe"], location: "Lagos, NG", bio: "Fictional example contributor. Composites builder with his own workshop." },
  { key: "lin", name: "Lin Takeda", role: "member" as Role, verified: ["flight-controls"], skills: ["flight controls", "simulation"], location: "Osaka, JP", bio: "Fictional example contributor. Flight-control tuning and simulation." },
  { key: "sofia", name: "Sofia Reyes", role: "member" as Role, verified: [], skills: ["operations", "survey"], location: "Alpine, TX", bio: "Fictional example contributor. Operator who runs a small survey business and wants to fly one." },
];


export interface Ev { actor: string; action: string; entity?: string; at: string; data: any }

/**
 * Plays the scenario. `ids` maps each person's key to an account id. `lead` optionally adds a real
 * project lead as a second lead with no history, so nothing is ever attributed to a real person.
 */
export async function runExampleScenario(ids: Record<string, string>, lead?: { id: string; email: string; name: string }) {
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
  try {
  const at = (iso: string) => {
    clock = RealDate.parse(iso);
  };

  let state: DemoState = initialState();
  state.members = [];
  state.roles = [];
  for (const p of people) {
    state.members.push({ ...memberFor(ids[p.key], "", p.name, state.members.map((m) => m.handle)), expertise: p.skills, location: p.location, bio: p.bio });
    state.roles.push({ projectId: workspaceId, memberId: ids[p.key], role: p.key === "nadia" ? "lead" : "member" });
  }
  // A real project lead is a second lead with no seeded history, so everything they see was done by fictional people.
  if (lead) {
    state.members.push(memberFor(lead.id, lead.email, lead.name, state.members.map((m) => m.handle)));
    state.roles.push({ projectId: workspaceId, memberId: lead.id, role: "lead" });
  }

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
  const anchor = (threadId: string, a: ModelAnchor) => { state.threads.find((t) => t.id === threadId)!.anchor = a; };
  const post = (who: string, threadId: string, body: string) => act(who, "createPosition", (b) => b.createPosition({ threadId, body }), { threadId, body }).then((p) => p.id);
  const reply = (who: string, positionId: string, body: string) => act(who, "addComment", (b) => b.addComment({ positionId, body }), { positionId, body }, () => state.positions.find((p) => p.id === positionId)?.threadId);
  const vote = (who: string, positionId: string) => act(who, "castVote", (b) => b.castVote({ positionId, value: 1 }), { positionId, value: 1 }, () => state.positions.find((p) => p.id === positionId)?.threadId);
  const opening = (threadId: string) => state.positions.find((p) => p.threadId === threadId)!.id;
  async function summarize(who: string, threadId: string, body: string, openQuestions = "") {
    const revision = state.drafts?.find((d) => d.threadId === threadId)?.revision ?? 0;
    await act(who, "saveOutcome", (b) => b.saveOutcome({ threadId, expectedRevision: revision, body, openQuestions }), { threadId });
  }
  async function settle(threadId: string, adopt: boolean, decision?: string, work?: WorkInput) {
    const d = domain(state, ids.nadia);
    const bundle = (await d.backend.getBundle(threadId))!;
    const input = { threadId, expectedRevision: bundle.draft!.revision, expectedCorpus: corpusKey(bundle), adopt, decision, work };
    const t = await d.backend.concludeThread(input);
    state = d.read();
    holdCallProposerAwards(state, spearhead);
    events.push({ actor: ids.nadia, action: "concludeThread", entity: threadId, at: new RealDate(clock).toISOString(), data: input });
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
  for (const p of people.filter((x) => x.key !== "nadia")) await act("nadia", "setMemberStanding", (b) => b.setMemberStanding!({ projectId: workspaceId, memberId: ids[p.key], role: p.role, verifiedExpertise: p.verified }), { memberId: ids[p.key], role: p.role });

  // Charging: discussed, adopted, funded, delivered, accepted.
  at("2026-09-14T16:00:00Z");
  const charging = start("ravi", "charging-bms", "Characterize charging on the bench before choosing a BMS: charge both packs in place through the flight harness and log cell temperatures.");
  at("2026-09-14T20:10:00Z");
  const chargingOps = await post("sofia", charging, "From an operator's side, charging inside the airframe matters more than a fancy BMS. If we never have to pull a pack in the field, that's a win.");
  at("2026-09-15T08:30:00Z");
  await vote("mara", opening(charging)); await vote("nadia", opening(charging)); await vote("dev", chargingOps); await vote("lin", opening(charging));
  await intent("sofia", charging);
  at("2026-09-15T12:00:00Z");
  await summarize("ravi", charging, "Characterize in-place charging on the bench before choosing a BMS.\n\nCharge both packs through the flight harness, log cell temperatures and balance behaviour, and pick the BMS from the results.");
  at("2026-09-15T17:00:00Z");
  const chargingWork = await settle(charging, true, "Characterize in-place charging on the bench before choosing a BMS", { kind: "bounty", purpose: "implementation", amount: 2000, title: "Bench charging procedure for both packs", scope: "Write and run a bench procedure that charges both packs through the flight harness and logs cell temperatures and balancing.", acceptance: "A procedure document and one full logged charge cycle per pack." });
  at("2026-09-15T17:05:00Z");
  await move("nadia", chargingWork!, "open", "Opened for claims.");
  at("2026-09-16T09:40:00Z");
  claim("sofia", chargingWork!);
  at("2026-09-22T19:00:00Z");
  await move("sofia", chargingWork!, "in_review", "Submitted for review.", { evidence: "Procedure v1 and two charge logs are in the Spearhead power folder. Both packs balanced within 12 mV; peak cell temperature 38 °C." });
  at("2026-09-23T15:30:00Z");
  await move("nadia", chargingWork!, "completed", "Results accepted.", { funding: "proposed" });

  // Electric first: adopted into the spec without work.
  at("2026-09-16T13:00:00Z");
  const electric = start("ravi", "electric-first", "Fly PT2 electric first and add the gasoline configuration once transition is proven. One new variable at a time.");
  at("2026-09-16T18:20:00Z");
  const electricBoard = await post("mara", electric, "Agree, but size the power board for the starter-generator now so the gasoline step isn't a redesign.");
  at("2026-09-17T10:00:00Z");
  await vote("nadia", opening(electric)); await vote("lin", opening(electric)); await vote("sofia", opening(electric)); await vote("dev", electricBoard); await vote("ravi", electricBoard);
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
  await vote("lin", opening(servo)); await vote("ravi", opening(servo)); await vote("sofia", servoShared); await vote("nadia", opening(servo));
  await intent("mara", servo);
  at("2026-09-17T15:00:00Z");
  await summarize("mara", servo, "Separate fused regulator per tail servo, fed from the tail board.\n\nEach regulator is sized for one servo's stall current with margin. Check heat on the bench before the board layout is frozen.");
  at("2026-09-18T16:00:00Z");
  const servoWork = await settle(servo, true, "Separate fused regulator per tail servo", { kind: "bounty", purpose: "implementation", amount: 3000, title: "Tail servo regulator schematic and bench test", scope: "Schematic for two independent fused regulators on the tail board, plus a bench test at servo stall current.", acceptance: "Schematic reviewed; bench log showing both regulators holding stall current for 10 minutes below 85 °C." });
  at("2026-09-18T16:05:00Z");
  await move("nadia", servoWork!, "open", "Opened for claims.");
  at("2026-09-19T10:00:00Z");
  claim("mara", servoWork!);

  // A conventional-tail proposal: declined with a reason. (Spearhead flies a V-tail with ruddervators.)
  at("2026-09-18T11:00:00Z");
  const vtail = await act("sofia", "createThread", (b) => b.createThread({ projectId: workspaceId, system: "airframe", title: "Should PT2 go back to a conventional tail?", body: "A separate elevator and rudder would make the mixing simpler and a damaged tail easier to fix in the field.", tags: [], anchor: on("tail") }), {}, (t) => t.id);
  at("2026-09-18T15:40:00Z");
  const vtailNo = await post("dev", vtail.id, "It adds a third tail servo and weight, and the tail PCB, the two ruddervator servos and the regulator decision all assume the V-tail.");
  await vote("nadia", vtailNo); await vote("lin", vtailNo);
  at("2026-09-19T14:00:00Z");
  await act("nadia", "resolveThread", (b) => b.resolveThread({ threadId: vtail.id, kind: "reject", note: "Out of scope for PT2: the tail PCB, servos and regulators are built around the V-tail." }), { threadId: vtail.id, kind: "reject" });

  // Freeze plan and retro pool.
  at("2026-09-20T17:00:00Z");
  await act("nadia", "setVersionPlan", (b) => b.setVersionPlan!({ projectId: workspaceId, versionId: "PT2", freezeTarget: "2026-10-18", retroPool: { amount: 25000, systemShares: { power: 0.2 } } }), { versionId: "PT2", freezeTarget: "2026-10-18", retroPool: { amount: 25000 } });

  // Wing skins: open, and weighting changes which approach leads.
  at("2026-09-20T15:00:00Z");
  const wing = start("dev", "wing-skin-choice", "Oracover for the PT2 wings. It's faster to build and repair, and PT2 is still a test aircraft; carbon skins cost us weeks on PT1.");
  anchor(wing, on("main_wing", "root"));
  at("2026-09-21T11:00:00Z");
  const wingCarbon = await post("sofia", wing, "Carbon skins for anything that will fly from rough strips. Film tears on landing, and field repairs are messy.");
  at("2026-09-21T13:00:00Z");
  await reply("lin", opening(wing), "Stiffness matters for flutter at transition speeds. Oracover over a carbon D-box should be fine, but we should check it.");
  at("2026-09-22T09:30:00Z");
  const wingHybrid = await post("ravi", wing, "Oracover now over a carbon D-box leading edge; revisit full carbon for PT3 once the wing shape is final.");
  await intent("dev", wing);
  at("2026-09-22T16:00:00Z");
  await vote("mara", wingCarbon); await vote("lin", wingCarbon); await vote("ravi", wingCarbon);
  await vote("nadia", wingHybrid); await vote("dev", wingHybrid);
  at("2026-09-23T10:00:00Z");
  await reply("sofia", wingHybrid, "I could live with this if the D-box goes all the way to the tip.");

  // Tail airfoil: settled as research work, open to claim.
  at("2026-09-22T14:00:00Z");
  const airfoil = start("lin", "tail-airfoil-conflict", "The tail note says NACA 0015 and the configuration files say 0018. We should confirm which one PT1 actually flies before PT2 inherits it.");
  at("2026-09-22T19:30:00Z");
  const airfoilDev = await post("dev", airfoil, "I'm fairly sure PT1's tail was cut from the 0018 templates and the note is stale, but I'd measure it before trusting me.");
  await vote("nadia", opening(airfoil)); await vote("mara", opening(airfoil)); await vote("sofia", airfoilDev);
  at("2026-09-24T12:00:00Z");
  await summarize("lin", airfoil, "Confirm the PT1 tail section from the build templates and a measurement, then correct the note.", "Which section does PT1 actually fly?");
  at("2026-09-25T16:00:00Z");
  const airfoilWork = await settle(airfoil, false, undefined, { kind: "grant", purpose: "research", amount: 1500, title: "Measure the PT1 tail section and correct the airfoil note", scope: "Measure the PT1 horizontal tail at three stations, compare with the 0015 and 0018 templates, and update the information note.", acceptance: "Measurements with photos, the matching section named, and a corrected note." });
  at("2026-09-25T16:05:00Z");
  await move("nadia", airfoilWork!, "open", "Opened for claims.");

  // Belly payload rail: deferred to PT3.
  at("2026-09-21T09:00:00Z");
  const rail = await act("sofia", "createThread", (b) => b.createThread({ projectId: workspaceId, system: "payload", title: "Should PT2 carry a belly payload rail?", body: "Operators will want to hang a camera or a small sprayer. A standard rail now saves a redesign later.", tags: [] }), {}, (t) => t.id);
  at("2026-09-21T17:00:00Z");
  const railLin = await post("lin", rail.id, "A rail is fine, but we have no payload mass or power budget yet. It's hard to design an interface without a customer.");
  await vote("nadia", railLin); await vote("dev", railLin);
  at("2026-09-24T15:00:00Z");
  await act("nadia", "resolveThread", (b) => b.resolveThread({ threadId: rail.id, kind: "defer", toVersionId: "next", note: "Needs payload mass and power requirements first; revisit for PT3." }), { threadId: rail.id, kind: "defer" });

  // Main-board interfaces: converged, with a summary ready for the lead.
  at("2026-09-23T14:00:00Z");
  const board = start("mara", "main-peripherals", "The main board needs six PWM servo outputs, a temperature input per motor, switched ignition power for the gasoline build, and two CAN buses.");
  at("2026-09-24T10:30:00Z");
  const boardRavi = await post("ravi", board, "Keep the ignition and fuel-pump outputs on the board even for the electric build, just unpopulated. Re-spinning the board for gasoline later costs more than the connector.");
  at("2026-09-24T13:00:00Z");
  await reply("lin", opening(board), "Two CAN buses please: one for the ESCs, one for servos and sensors.");
  await vote("nadia", opening(board)); await vote("lin", opening(board)); await vote("ravi", opening(board)); await vote("mara", boardRavi); await vote("dev", boardRavi);
  at("2026-09-26T11:00:00Z");
  await summarize("mara", board, "Main board: six PWM servo outputs, per-motor temperature inputs, two CAN buses (ESCs; servos and sensors), and gasoline ignition and fuel-pump outputs footprinted but unpopulated on the electric build.");

  // A PT1 build question stays with PT1.
  at("2026-09-24T18:00:00Z");
  const imbalance = start("lin", "motor-imbalance", "Log heading and wind for every hover. If the imbalance tracks the wind direction, it's tail loading, not motor variation.");
  anchor(imbalance, on("motor_mounts_and_booms", "motor_mounts:1"));
  at("2026-09-25T09:00:00Z");
  const imbalanceDev = await post("dev", imbalance, "We already stiffened the arms. I'd also swap two motors front-to-back and see whether the imbalance follows the motor.");
  await vote("nadia", imbalanceDev); await vote("mara", opening(imbalance));

  // Discussions that start from the model itself.
  at("2026-09-25T15:00:00Z");
  const mirror = await act("dev", "createThread", (b) => b.createThread({ projectId: workspaceId, system: "airframe", title: "Is the starboard outer wing really a mirror of port?", body: "The model mirrors the port outer wing because the starboard one was never modelled. Before anyone cuts PT2 molds from this, can someone confirm the starboard wing has no differences: servo pocket, pitot, wiring exit?", tags: [], anchor: on("inferred_starboard_outer_wing") }), {}, (t) => t.id);
  at("2026-09-25T19:30:00Z");
  const mirrorLin = await post("lin", mirror.id, "The pitot lives on the port wing only, so the starboard skin shouldn't have that cutout. The servo pocket should be identical.");
  await vote("dev", mirrorLin); await vote("nadia", mirrorLin);
  at("2026-09-26T09:10:00Z");
  const sta2 = await act("mara", "createThread", (b) => b.createThread({ projectId: workspaceId, system: "airframe", title: "Bulkhead sta2 needs a pass-through for the pusher battery harness", body: "With the separate pusher battery in the fuel-tank space (agreed on the Sep 25 call), its harness has to cross sta2. There's no opening in this bulkhead in the model.", tags: [], anchor: on("fuselage", "fuselage:1+fuselage_body:1+bulkheads:1", "sta2") }), {}, (t) => t.id);
  at("2026-09-26T13:40:00Z");
  const sta2Dev = await post("dev", sta2.id, "A 20 mm grommeted hole low on the port side keeps it clear of the longerons. I can cut a test bulkhead.");
  await vote("mara", sta2Dev); await vote("ravi", sta2Dev); await vote("nadia", sta2Dev);
  await intent("dev", sta2.id);
  at("2026-09-26T16:00:00Z");
  const gear = await act("ravi", "createThread", (b) => b.createThread({ projectId: workspaceId, system: "airframe", title: "Are the recovered rear landing gear bodies the current design?", body: "These eleven bodies were hidden in the Fusion file and recovered for the review. Are they what's on PT1 today, or an older iteration we should drop from the PT2 baseline?", tags: [], anchor: on("restored_rear_landing_gear") }), {}, (t) => t.id);
  void gear;

  // Mara submits the servo work; it now waits for the lead.
  at("2026-09-26T20:00:00Z");
  await move("mara", servoWork!, "in_review", "Submitted for review.", { evidence: "Schematic rev A and the bench log are in the tail-board folder. Both regulators held stall current for 10 minutes; peak 71 °C." });

  return { state: { ...state, actingAs: null } as DemoState, events };

  } finally {
    (globalThis as any).Date = RealDate;
  }
}
