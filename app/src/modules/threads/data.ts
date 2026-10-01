import type { Kind } from './weights';
import { issueUrl, prUrl } from '../../data/quiver';

// Quiver's open questions, seeded from the Sep 29 call notes and the
// repository. Every position says where it came from: a person named in the
// call notes, or an issue or pull request. Nobody has voted; votes, replies,
// new threads and decisions made in the demo stay in this browser.

export type ThreadType = 'question' | 'proposal' | 'idea';

export interface SourceRef {
  kind: 'call' | 'issue' | 'pr' | 'doc';
  /** Call item id, or the issue / PR number. */
  ref: string;
  label: string;
  url?: string;
}

/** A comment. Top-level comments (no parentId) are the options a lead can adopt; replies nest under any comment. */
export interface Position {
  id: string; text: string; authorId?: string; source?: SourceRef; at: string; parentId?: string;
  /** Deleted by its author, or removed by a lead; it keeps its place so replies under it stay. */
  deleted?: 'author' | 'lead';
}
export interface Reply { id: string; text: string; authorId?: string; source?: SourceRef; at: string }
export interface Settled {
  positionId: string;
  byId: string;
  at: string;
  override: boolean;
  note: string;
  /** Register number, D-001 upward, as T-09 asks. */
  decision: string;
  /** When the decision was made outside the app (an accepted GitHub issue), where. */
  source?: SourceRef;
}

/** Closed without adopting anything, with the lead's reason. Still counts toward the retro split. */
export interface Declined { byId: string; at: string; note: string }
/** Pushed to a later version; the thread stays open there. */
export interface Deferral { from: string; to: string; byId: string; at: string; note?: string }

export interface Thread {
  id: string;
  /** The working zone this thread lives in. */
  zone: string;
  /** BOM number of the part it is about, when it is about one (clickable in the 3D model). */
  part?: string;
  /** A component on one of the PCBs: board id and reference designator. */
  pcb?: { board: string; ref: string };
  title: string;
  body: string;
  kind: Kind;
  type: ThreadType;
  /** Matched against a voter's expertise. */
  system: string;
  version: string;
  authorId?: string;
  source?: SourceRef;
  raisedAt: string;
  activeAt: string;
  positions: Position[];
  votes: { memberId: string; positionId: string; value: 1 | -1 }[];
  replies: Reply[];
  objections: number;
  settled?: Settled;
  declined?: Declined;
  deferrals?: Deferral[];
}

export const callSource = (ref: string): SourceRef => ({ kind: 'call', ref, label: 'Sep 29 call' });
export const issueSource = (n: number): SourceRef => ({ kind: 'issue', ref: String(n), label: `#${n}`, url: issueUrl(n) });
export const prSource = (n: number): SourceRef => ({ kind: 'pr', ref: String(n), label: `PR #${n}`, url: prUrl(n) });
const PS = 'https://github.com/Arrow-air/payload-systems/tree/main/payloads';
export const latchNote: SourceRef = { kind: 'doc', ref: 'payload-latch-v1', label: 'Latch V1 note', url: `${PS}/Payload-latch#v2-recommendations` };
export const cameraNote: SourceRef = { kind: 'doc', ref: 'multispectral-v1', label: 'Camera V1 note', url: `${PS}/Multispectral-Camera#v2-recommendations` };

const CALL = '2026-09-29T11:30:00-05:00';
const PR267 = '2026-09-18T23:09:00-05:00';
const I234 = '2026-07-09T21:38:00-05:00';
const I248 = '2026-09-09T15:59:00-05:00';
const T01_YES = '2026-09-30T01:07:00-05:00';
const T01_OK = '2026-09-30T02:00:00-05:00';
const LS_DATE = '2026-09-30T12:00:00-05:00';
const LS = 'https://github.com/Arrow-air/project-longshot';
const lsIssue = (n: number): SourceRef => ({ kind: 'issue', ref: `LS-${n}`, label: `LS #${n}`, url: `${LS}/issues/${n}` });
const lsDoc = (label: string, path: string): SourceRef => ({ kind: 'doc', ref: path, label, url: `${LS}/${path}` });
const NOTES = '2026-09-17T12:00:00-05:00';
const T12 = '2026-09-09T15:59:00-05:00';
/** The next Dev Kit revision (working name), and the one after it, for deferrals. */
export const NEXT = 'Dev Kit v1.1';
export const LATER = 'Dev Kit v1.2';

const seeded: Thread[] = [
  {
    id: 'Q-1', zone: 'road-to-selling', kind: 'technical', type: 'question', system: 'selling', version: 'Dev Kit',
    title: 'What else has to be true before Quiver ships in the US?',
    body: 'On the call Thomas named the blockers: FAA approval to sell, the foam case inserts (waiting on a CNC router), obstacle avoidance, and the GPS interference. He wants the last two resolved before units ship. Is anything missing from that list?',
    authorId: 'thomas', source: callSource('sep29-3'), raisedAt: CALL, activeAt: CALL,
    positions: [], votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-2', zone: 'road-to-selling', kind: 'technical', type: 'proposal', system: 'selling', version: 'Dev Kit',
    title: 'Make sales the Quiver focus for the coming months',
    body: 'Quiver has cost a lot to build and needs to earn revenue. Once the blockers are cleared, the project shifts from design and engineering to selling as many units as it can.',
    authorId: 'thomas', source: callSource('sep29-4'), raisedAt: CALL, activeAt: CALL,
    positions: [
      { id: 'p1', text: 'Make sales the focus of the Quiver project for the coming months.', authorId: 'thomas', source: callSource('sep29-4'), at: CALL },
    ],
    votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-3', zone: 'gps-rf', kind: 'technical', type: 'question', system: 'gps', version: NEXT,
    title: 'GPS interference: move the GPS, shield the switches, or revise the PCB?',
    body: 'The M9N loses satellites with the two Ethernet switches installed, on the Houston unit and the West Texas unit (T-13). Erick is learning the spectrum analyzer to confirm the switches are the source, and Julius is flying the Ethernet build this week. Thomas wants this fixed before units ship.',
    authorId: 'thomas', source: callSource('sep29-10'), raisedAt: CALL, activeAt: CALL,
    positions: [
      { id: 'p1', text: 'Give the M9N a longer cable and mount it somewhere else, with an updated cradle. A PCB update would be more pain than anything.', authorId: 'erick', source: callSource('sep29-10'), at: CALL },
      { id: 'p2', text: 'If the spectrum analyzer shows the switches are the source, shield them and add standoffs. Keep the modifications as small as possible.', authorId: 'erick', source: callSource('sep29-10'), at: CALL },
      { id: 'p3', text: 'If the fix needs a PCB revision, start it sooner rather than later.', authorId: 'thomas', source: callSource('sep29-10'), at: CALL },
    ],
    votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-4', zone: 'gps-rf', part: '3250', kind: 'technical', type: 'proposal', system: 'gps', version: NEXT,
    title: 'Primary GPS: offer the Here4 and the Holybro NEO-F9P, retire the Wren Mini',
    body: 'PR #267 adds the CubePilot Here4 and the Holybro H-RTK NEO-F9P Rover as primary GPS options in the CAD and the BOM, and retires the Wren Mini. It is a draft, stacked on the mechanical sync in PR #266.',
    authorId: 'thomas', source: prSource(267), raisedAt: PR267, activeAt: PR267,
    positions: [
      { id: 'p1', text: 'Support both the Here4 and the NEO-F9P Rover as primary GPS alternatives. The Wren Mini is retired, not a third option.', authorId: 'thomas', source: prSource(267), at: PR267 },
    ],
    votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-5', zone: 'interface', part: '3331', kind: 'technical', type: 'question', system: 'payload', version: NEXT,
    title: 'Attachment power: the 12 V payload rail is about 13 W, shared by three ports',
    body: 'The attachment interface is sized for logic-level payloads. Floodlights, spreaders, larger gimbals and heaters want 20 to 100 W or more, so each one grows its own battery pigtail today (#233). The issue asks for a direction for the next main PCB and attach PCB revision.',
    source: issueSource(234), raisedAt: I234, activeAt: I234,
    positions: [
      { id: 'p1', text: 'A dedicated payload 12 V system: a separate converter sized for payloads (100 W class), with per-port switching and fusing.', source: issueSource(234), at: I234 },
      { id: 'p2', text: 'Expose switched, fused battery voltage on the attachment interface and let attachments regulate locally. Needs a pogo contact current check and a hot-mate arcing plan.', source: issueSource(234), at: I234 },
      { id: 'p3', text: 'No board change: publish one blessed high-power pigtail pattern (connector, fuse, switch).', source: issueSource(234), at: I234 },
    ],
    votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-6', zone: 'parameters', kind: 'technical', type: 'question', system: 'battery', version: 'Dev Kit',
    title: 'Battery failsafe: approve the BMS capacity values?',
    body: 'T-01 proposes triggering the battery failsafe from the pack\'s BMS count instead of ESC voltage: warn at 7,500 mAh left (25 percent), land at 4,500 mAh left (15 percent). Julius owns the battery PCB and the pack integration, so it is his call to check. A no comes with the number he would use instead.',
    source: issueSource(248), raisedAt: I248, activeAt: CALL,
    positions: [
      { id: 'p1', text: 'Yes: BATT2_LOW_MAH 7500 and BATT2_CRT_MAH 4500 go into the next parameter card, and the Handbook and the guide drop their "proposed" marker.', source: issueSource(248), at: I248 },
    ],
    votes: [],
    replies: [
      { id: 'r1', text: 'Asked Julius on the call for his input on the cutoffs, now that the Tattu BMS is available.', authorId: 'erick', source: callSource('sep29-15'), at: CALL },
      { id: 'r2', text: 'I will write something on GitHub.', authorId: 'julius', source: callSource('sep29-15'), at: CALL },
      { id: 'r3', text: 'Q1: Yes. The proposed low and critical values are good. Side note: for manual flights, LAND_REPOSITION should stay enabled, so the pilot can steer away from a bad spot if a failsafe landing triggers.', authorId: 'julius', source: issueSource(248), at: T01_YES },
    ],
    objections: 0,
    settled: { positionId: 'p1', byId: 'erick', at: T01_OK, override: false, decision: 'D-001', source: issueSource(248), note: 'Accepted on GitHub: BATT2_LOW_MAH 7500 and BATT2_CRT_MAH 4500, documented in Pilot\'s Handbook §4.2.1 and Initial Configuration Guide §7.3 and §7.4.' },
  },
  {
    id: 'Q-7', zone: 'parameters', kind: 'technical', type: 'question', system: 'battery', version: 'Dev Kit',
    title: 'Refuse to arm below 30 percent remaining?',
    body: 'The second T-01 question, judged on its own. BATT2_ARM_MAH 9000 would refuse arming with less than 30 percent left. Because the BMS count persists across boots, a pack installed half used would be caught. The lead has not adopted it yet.',
    source: issueSource(248), raisedAt: I248, activeAt: I248,
    positions: [
      { id: 'p1', text: 'Yes: add BATT2_ARM_MAH 9000 to the same parameter card revision.', source: issueSource(248), at: I248 },
    ],
    votes: [],
    replies: [{ id: 'r1', text: 'Q2: Yes. The arming block at 9000 mAh makes sense.', authorId: 'julius', source: issueSource(248), at: T01_YES }],
    objections: 0,
    settled: { positionId: 'p1', byId: 'erick', at: T01_OK, override: false, decision: 'D-002', source: issueSource(248), note: 'Accepted on GitHub: BATT2_ARM_MAH 9000 added, and LAND_REPOSITION stays 1.' },
  },
  {
    id: 'Q-8', zone: 'where-we-sell', kind: 'technical', type: 'question', system: 'sales', version: 'Dev Kit',
    title: 'Where do we sell Quiver: the Arrow store, a local page, or both?',
    body: 'Thomas will sell locally through his business out here, and wonders whether that should run through the Arrow store or a landing page tailored to what customers here care about. Either way the sale runs through the Arrow store process and pays back to the DAO. What is learned selling in Texas should carry over to other manufacturers selling elsewhere.',
    authorId: 'thomas', source: callSource('sep29-5'), raisedAt: CALL, activeAt: CALL,
    positions: [
      { id: 'p1', text: 'Both: a page tailored to local customers, and the Arrow store running a standard online sales funnel.', authorId: 'thomas', source: callSource('sep29-5'), at: CALL },
    ],
    votes: [],
    replies: [
      { id: 'r1', text: 'It would not hurt to have two sales pages: one for the DAO that we advertise, and one Thomas uses locally. This needs input from the whole DAO.', authorId: 'erick', source: callSource('sep29-5'), at: CALL },
    ],
    objections: 0,
  },
  {
    id: 'Q-9', zone: 'who-we-sell-to', kind: 'technical', type: 'proposal', system: 'sales', version: 'Dev Kit',
    title: 'Aim the online funnel at integrators, attachment developers and dev-kit buyers',
    body: 'There is a lot of wisdom in running a good online sales funnel. Thomas suggests pointing it at the people who would build on Quiver.',
    authorId: 'thomas', source: callSource('sep29-6'), raisedAt: CALL, activeAt: CALL,
    positions: [
      { id: 'p1', text: 'Target integrators, attachment developers, and people who would want the dev kit.', authorId: 'thomas', source: callSource('sep29-6'), at: CALL },
    ],
    votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-10', zone: 'who-we-sell-to', kind: 'technical', type: 'idea', system: 'sales', version: 'Dev Kit',
    title: 'Do local customers want a seller nearby who supports them?',
    body: 'Thomas\'s hypothesis: at least some customers will want a local feel, where they get good support close by. Worth testing before it shapes the sales pages.',
    authorId: 'thomas', source: callSource('sep29-7'), raisedAt: CALL, activeAt: CALL,
    positions: [],
    votes: [],
    replies: [
      { id: 'r1', text: 'Especially ranchers. They want to know they can call someone, or get someone close by to help.', authorId: 'erick', source: callSource('sep29-7'), at: CALL },
    ],
    objections: 0,
  },
  {
    id: 'Q-11', zone: 'airframe', kind: 'technical', type: 'question', system: 'structure', version: NEXT,
    title: 'Structure and enclosure: what should the next revision change?',
    body: 'KBM asked whether there is a plan to improve the enclosure or the structure, and offered structural advice. There is no list yet. Erick is preparing easy wins for the Thursday call, and what it takes to make them. Propose each change as its own Dev Kit v1.1 improvement so it can be weighed and decided on its own; use this thread for the overall direction.',
    authorId: 'kbm', source: callSource('sep29-20'), raisedAt: CALL, activeAt: CALL,
    positions: [], votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-12', zone: 'config-guide', kind: 'technical', type: 'question', system: 'docs', version: 'Dev Kit',
    title: 'One large docs sync, or separate pull requests?',
    body: 'Erick has a batch of local changes to sync: configuration guide, harness, Pilot\'s Handbook, SDK notes. Some flight-controller parameters deviate from the baseline on GitHub.',
    authorId: 'erick', source: callSource('sep29-18'), raisedAt: CALL, activeAt: CALL,
    positions: [
      { id: 'p1', text: 'Put the flight-controller parameter changes in their own pull request so Zeynep can review and merge them. Sync the rest separately.', authorId: 'erick', source: callSource('sep29-18'), at: CALL },
    ],
    votes: [],
    replies: [
      { id: 'r1', text: 'Okay, sounds good.', authorId: 'zeynep', source: callSource('sep29-18'), at: CALL },
    ],
    objections: 0,
  },
  {
    id: 'Q-13', zone: 'payload-latch', kind: 'technical', type: 'question', system: 'payload', version: 'V2',
    title: 'Latch V2: what holds the pin when power drops?',
    body: 'V1 has no spring. An unpowered servo holds the pin by friction only, and the payload rail drops on every relay cycle and reboot. It was never tested with a load. The V1 note says V2 needs a mechanical lock on power loss.',
    source: latchNote, raisedAt: NOTES, activeAt: NOTES,
    positions: [
      { id: 'p1', text: 'A return spring that closes the latch when the servo lets go.', source: latchNote, at: NOTES },
      { id: 'p2', text: 'Over-center pin geometry, so the load itself keeps the pin locked.', source: latchNote, at: NOTES },
    ],
    votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-14', zone: 'payload-latch', kind: 'technical', type: 'question', system: 'payload', version: 'V2',
    title: 'Drive the latch straight from the flight controller, or add a microcontroller?',
    body: 'V1 runs the servo directly off a flight-controller PWM output, with no pulldown, so what the servo does when the signal stops has not been characterized. The V1 note says to decide from the signal-loss test.',
    source: latchNote, raisedAt: NOTES, activeAt: NOTES,
    positions: [
      { id: 'p1', text: 'Keep it flight-controller PWM only.', source: latchNote, at: NOTES },
      { id: 'p2', text: 'Reintroduce a microcontroller for debounce, stall guard and a lock on signal loss.', source: latchNote, at: NOTES },
    ],
    votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-15', zone: 'multispectral', kind: 'technical', type: 'question', system: 'payload', version: 'V2',
    title: 'Camera V2: how does each image get a GPS tag?',
    body: 'On the bottom port the camera\'s built-in GPS antenna faces the 2 mm aluminum lower plate, so geotags are unverified and probably missing. Without them the images are hard to use for mapping.',
    source: cameraNote, raisedAt: NOTES, activeAt: NOTES,
    positions: [
      { id: 'p1', text: 'Move it to a side port with a plain PETG GPS window, so the camera\'s own antenna sees the sky.', source: cameraNote, at: NOTES },
      { id: 'p2', text: 'Feed the vehicle\'s GPS (NMEA) to the camera.', source: cameraNote, at: NOTES },
    ],
    votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-16', zone: 'interface', kind: 'technical', type: 'question', system: 'payload', version: NEXT,
    title: 'Swapping payloads on the bottom port without rewriting parameters',
    body: 'The latch and the camera both fly on the bottom port with the same output and RC channel, but need different endpoints (1315/1750 µs against 1000/2000). Every swap means rewriting SERVO9, and a stale 1000 µs endpoint drives the latch servo past its lock stop. Both V1 notes flag it.',
    source: latchNote, raisedAt: NOTES, activeAt: NOTES,
    positions: [
      { id: 'p1', text: 'A parameter file per payload, loaded when it is swapped onto the bottom port.', source: latchNote, at: NOTES },
      { id: 'p2', text: 'Dedicate ports, so each payload type always lands on the same output.', source: latchNote, at: NOTES },
    ],
    votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-17', zone: 'quiverhub', kind: 'technical', type: 'question', system: 'software', version: '',
    title: 'What should QuiverHub do next?',
    body: 'QuiverHub V1 shipped (milestones M1 to M3). The M4 and M5 named back then were never scoped, and nobody can say today what they meant. T-12 asks Alex to write the next scope after running V1 on the Houston unit (T-18), for the Project Lead to accept and the October checkpoint to fund. These are the needs T-12 lists; vote on what matters to you.',
    source: issueSource(258), raisedAt: T12, activeAt: T12,
    positions: [
      { id: 'p1', text: 'An upload path to the flight tracking platform.', source: issueSource(258), at: T12 },
      { id: 'p2', text: 'Log access in the field.', source: issueSource(258), at: T12 },
      { id: 'p3', text: 'An over-the-air update path.', source: issueSource(258), at: T12 },
      { id: 'p4', text: 'Camera streaming.', source: issueSource(258), at: T12 },
      { id: 'p5', text: 'A payload app pattern the Attachment Developer Guide can point developers to.', source: issueSource(258), at: T12 },
      { id: 'p6', text: 'Mission planning and deployment, the old M4 and M5, if they are still the right next steps.', source: issueSource(258), at: T12 },
    ],
    votes: [], replies: [], objections: 0,
  },

  {
    id: 'Q-18', zone: 'power', part: '3320', kind: 'technical', type: 'question', system: 'battery', version: NEXT,
    title: 'Longshot fit: does it slide into the bay and mate with the battery connector PCB?',
    body: 'Longshot was designed around Tattu geometry and uses the Tattu clip, with full-length side rail channels. But its SL board carries an ET60S-D06 connector, while Quiver\'s battery connector PCB (3320) uses two Molex 46437-9206 with guide pins. No fit check against the slider (2211) or the connector PCB is recorded.',
    source: lsDoc('LS PR #27', 'pull/27'), raisedAt: LS_DATE, activeAt: LS_DATE,
    positions: [], votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-19', zone: 'power', kind: 'technical', type: 'question', system: 'battery', version: NEXT,
    title: 'Longshot BMS: emulate the Tattu BMS, or speak DroneCAN natively?',
    body: 'The PT1 board has no BMS: one fuse and cell-sense lines passed through to the charger. The v1 plan is an STM32 smart BMS (VESC BMS reference design) with isolated CAN. How it talks to Quiver is marked TBD in LS #26. As of the Sep 22 call there was no working BMS yet.',
    source: lsIssue(26), raisedAt: LS_DATE, activeAt: LS_DATE,
    positions: [
      { id: 'p1', text: 'Emulate the Tattu BMS, so Quiver\'s existing battery setup and failsafes work unchanged.', source: lsIssue(26), at: LS_DATE },
      { id: 'p2', text: 'Native DroneCAN battery messages.', source: lsIssue(26), at: LS_DATE },
    ],
    votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-20', zone: 'power', kind: 'technical', type: 'question', system: 'battery', version: NEXT,
    title: 'Failsafe values for a 58.5 Ah pack',
    body: 'The values adopted in #248 (warn at 7,500 mAh left, land at 4,500, refuse to arm below 9,000) read the Tattu BMS over DroneCAN and are sized for 30 Ah. A PT1 Longshot sends no battery data, so only the voltage backstop on the ESC monitor would act. What should Quiver fly with on Longshot, before and after its BMS?',
    source: issueSource(248), raisedAt: LS_DATE, activeAt: LS_DATE,
    positions: [], votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-21', zone: 'power', kind: 'technical', type: 'question', system: 'battery', version: NEXT,
    title: 'Charging both packs: 58.8 V for Longshot, 60.9 V for the Tattu',
    body: 'Longshot charges to 58.8 V; the Tattu LiHV pack to 60.9 V. LS #26 warns that chargers and docks must handle both cutoffs, and the Pilot\'s Handbook currently calls for a 14S LiHV charger. Longshot is planned around the Tattu TA3200 plus a balance connector.',
    source: lsIssue(26), raisedAt: LS_DATE, activeAt: LS_DATE,
    positions: [], votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-22', zone: 'power', part: '3410', kind: 'technical', type: 'question', system: 'battery', version: NEXT,
    title: 'First Longshot test on Quiver: what does it have to show?',
    body: 'No pack-level test is recorded yet; the only data is a cell-level discharge (BAK 65E, 20.18 Wh at 10 A to 2.8 V). Before Longshot replaces the Tattu, what should a first bench test and first flight prove: fit, voltage under load, temperatures from its four sensors, endurance against the Tattu?',
    source: lsIssue(26), raisedAt: LS_DATE, activeAt: LS_DATE,
    positions: [], votes: [], replies: [], objections: 0,
  },
];

// Threads are one tree of comments. The seeded replies were written as
// answers to a specific option, so they nest under it; the rest stay top level.
const PARENT: Record<string, string> = {
  'Q-6:r1': 'p1', 'Q-6:r2': 'p1', 'Q-6:r3': 'p1', 'Q-7:r1': 'p1', 'Q-8:r1': 'p1', 'Q-12:r1': 'p1',
};
export const threads: Thread[] = seeded.map((t) => ({
  ...t,
  positions: [...t.positions, ...t.replies.map((r) => ({ id: r.id, text: r.text, authorId: r.authorId, source: r.source, at: r.at, parentId: PARENT[`${t.id}:${r.id}`] }))],
  replies: [],
}));
