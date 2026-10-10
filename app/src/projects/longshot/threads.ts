import type { Position, Thread } from '../../modules/threads/data';
import { planOf } from '../plans';
import { AIP007, DEVKIT_REPORT, HANDBOOK, LS, TATTU_STORE, doc, lsCall, lsIssue, proposal } from './sources';

// Longshot's open questions, seeded from the call notes on the Spearhead
// wiki, the Longshot proposal and the repository. Every comment says where it
// came from: a person named in the notes (linked to the note) or a document
// or issue. Nobody has voted. Longshot's integration into Quiver (fit, BMS
// protocol, failsafes, charging both packs, the first test) is discussed in
// Quiver's workspace, Q-18 to Q-22; Longshot's zones link to those threads.

const NEXT = planOf('longshot').next;
const SEP22 = '2026-09-22T12:00:00-05:00';
const SEP25 = '2026-09-25T12:00:00-05:00';
const SEP28 = '2026-09-28T12:00:00-05:00';
const SEP29 = '2026-09-29T12:00:00-05:00';
const OCT5 = '2026-10-05T12:00:00-05:00';
const PROP = '2026-03-10T09:40:00Z';
const PT1 = '2026-08-29T12:00:00Z';
const SL = doc('SL_PCB README', `${LS}/blob/main/engineering/electronics/pcbs/SL_PCB/README.md`);
const BMSJ = doc('BMSJ README', `${LS}/blob/main/engineering/electronics/pcbs/BMSJ/README.md`);
const TATTU = doc('Tattu store', TATTU_STORE);
const JUL = '2026-07-14T12:00:00Z';
const KBM_POST = '2026-03-28T12:00:00Z';

const c = (id: string, text: string, at: string, source: Position['source'], authorId?: string, parentId?: string): Position => ({ id, text, at, source, authorId, parentId });
const thread = (t: Omit<Thread, 'project' | 'kind' | 'votes' | 'replies' | 'objections' | 'activeAt'> & { kind?: Thread['kind']; activeAt?: string }): Thread => ({
  project: 'longshot', kind: 'technical', votes: [], replies: [], objections: 0, activeAt: t.raisedAt, ...t,
});

export const longshotThreads: Thread[] = [
  thread({
    id: 'L-1', zone: 'bms', type: 'question', system: 'bms', version: NEXT,
    title: 'BMS path: copy the dev board, a freelancer bounty, or AI-assisted design?',
    body: 'PT1 has no BMS, and the next steps all wait on one: protection, balancing, telemetry, and charging without balance leads. Three paths are on record. Sep 22: Julius reserved a bounty in the Longshot budget and is approaching freelancers, while Alperen tries Astra for component selection and placement. Sep 28: the BMS software is set up and Julius is waiting on hardware. Sep 29: Julius has a palm-sized BMS dev board to test, then copy into Arrow\'s design. Oct 5: no update yet. Which path leads, and what does the first board have to prove?',
    source: lsCall('ls-sep22-6', 'Sep 22'), raisedAt: SEP22, activeAt: OCT5,
    positions: [
      c('p1', 'Test the dev board, then copy its schematic into Arrow\'s own design.', SEP29, lsCall('ls-sep29-1', 'Sep 29'), 'julius'),
      c('r1', 'A dev board is fine for the first prototype.', SEP29, lsCall('ls-sep29-1', 'Sep 29'), 'alperen', 'p1'),
      c('p2', 'Hire an experienced freelancer with the BMS bounty reserved in the Longshot budget.', SEP22, lsCall('ls-sep22-6', 'Sep 22'), 'julius'),
      c('p3', 'Let AI pick and place the components (Astra), with the traces by a freelancer or a community bounty.', SEP22, lsCall('ls-sep22-8', 'Sep 22'), 'alperen'),
      c('r2', 'GPT-6\'s PCB traces were poor, but its component selection was good.', SEP22, lsCall('ls-sep22-8', 'Sep 22'), 'kbm', 'p3'),
    ],
  }),
  thread({
    id: 'L-2', zone: 'bms', type: 'question', system: 'bms', version: NEXT,
    title: 'What must the first Longshot BMS do?',
    body: 'The proposal lists the core for Phase 2: an STM32, over- and under-voltage, over-current and over-temperature protection, passive balancing and CAN. The calls have added to it: one design shared across Arrow\'s packs, a generator cut-off, and on Spearhead a daughterboard on the battery connector PCB. Alperen is writing up the battery and charging requirements for Erick to review (Sep 25). What is in scope for PT2, and what waits?',
    source: proposal, raisedAt: SEP22,
    positions: [
      c('p1', 'One BMS design for every Arrow pack: 18S for Caribou, 12S or 14S for Quiver and Spearhead, 24S for Feather.', SEP22, lsCall('ls-sep22-7', 'Sep 22'), 'alperen'),
      c('p2', 'Put a generator cut-off, disconnecting the generator when the battery is full, in the general Longshot and Quiver BMS spec.', SEP22, lsCall('ls-sep22-10', 'Sep 22')),
      c('p3', 'Make it a small header-mounted daughterboard on the battery connector PCB (power, CAN, maybe temperature), swappable if it gives trouble.', SEP22, lsCall('ls-sep22-13', 'Sep 22'), 'erick'),
    ],
  }),
  thread({
    id: 'L-3', zone: 'charging', type: 'question', system: 'charging', version: NEXT,
    title: 'Which charger once Longshot has a BMS?',
    body: 'PT1 charges on a Tattu TA3200 through exposed charge and balance connectors. With a BMS the balance leads go away (Sep 22), so the charger has to work with the pack another way, ideally over CAN. Tattu says the TA3200 recognizes batteries that speak DroneCAN; what it expects from a pack that isn\'t a Tattu is not on record. One thing is fixed: Longshot is standard Li-ion, full at 58.8 V, and the Tattu is LiHV, full at 60.9 V. The TA3200 comes in standard (4.2 V a cell), HV and UHV versions, and only the standard one suits Longshot. Quiver\'s side of this is Q-21.',
    source: SL, raisedAt: SEP22,
    positions: [
      c('p1', 'Keep the TA3200, in its standard 4.2 V version: Tattu says it recognizes DroneCAN batteries, so a Longshot BMS that speaks DroneCAN may charge on it.', SEP22, TATTU),
      c('p2', 'Let the BMS control charging: the VESC BMS firmware does CC/CV, so the charger only has to supply current.', PROP, BMSJ),
      c('p3', 'For a pack that stays in the aircraft, a power port and a balance port on the skin and a normal balance charger.', SEP25, lsCall('ls-sep25-2', 'Sep 25'), 'alperen'),
    ],
  }),
  thread({
    id: 'L-4', zone: 'testing', type: 'question', system: 'testing', version: '',
    title: 'PT1\'s test report: what should the bench test and the flight test show?',
    body: 'Phase 1 promised a bench-tested prototype and "documented flight validation on Quiver". PT1 has flown: Julius had the log from a Longshot flight on the Sep 29 call and planned another. Nothing is posted yet, and the pack\'s 2,540 Wh is worked out from a cell test, not measured on the pack. What goes in the report: measured capacity, flight time against the Tattu, voltage sag under load, temperatures from the four sensors, the log itself?',
    source: proposal, raisedAt: SEP29,
    positions: [],
  }),
  thread({
    id: 'L-5', zone: 'cells', part: 'PW-CELL-001-21700', type: 'question', system: 'cells', version: NEXT,
    title: 'Cells for the next packs: 6.5 Ah again, or a cheaper cell?',
    body: 'PT1 uses 126 BAK 21700 65E (6.5 Ah), bought in stock at about $7.00 a cell landed. For the next builds Thomas is sourcing cells and will send Julius options to approve (Sep 29). KBM: 6.5 Ah 21700s come only from BAK and FEB, at about twice the price of 5.0 Ah cells. For Spearhead, cheaper cells would halve the cell cost but hold only 5.5 to 6 Ah (Sep 22).',
    source: lsCall('ls-sep29-4', 'Sep 29'), raisedAt: SEP29,
    positions: [
      c('p1', 'Stay on 6.5 Ah cells for now.', SEP29, lsCall('ls-sep29-4', 'Sep 29'), 'julius'),
      c('r1', 'Keep the weight budget rather than halve the cell cost with 5.5 to 6 Ah cells.', SEP22, lsCall('ls-sep22-5', 'Sep 22'), 'alperen', 'p1'),
      c('p2', '5.8 Ah cells, for a cheaper pack.', SEP29, lsCall('ls-sep29-4', 'Sep 29')),
    ],
  }),
  thread({
    id: 'L-6', zone: 'on-spearhead', type: 'proposal', system: 'spearhead', version: '',
    title: 'Spearhead\'s Longshot: 14S3P, 19.5 Ah, AS150U, about 4 kg, no BMS at first',
    body: 'Sized line by line on the Sep 22 call (the notes name Alperen and Julius), scaling PT1 down by about 3.2. Spearhead moves to 14S for it. The first pack ships without a BMS, added when it\'s ready. Sep 29: a square layout of about 18 × 18 cm, as small as Julius can make it, and likely two packs of the same capacity on Spearhead PT2. Oct 5: about a month for the customization plus the BMS.',
    source: lsCall('ls-sep22-2', 'Sep 22'), raisedAt: SEP22, activeAt: OCT5,
    positions: [
      c('p1', '14S3P with 6.5 Ah cells: 19.5 Ah, about 4 kg, on an AS150U connector, in a square about 18 × 18 cm. First without a BMS, which is added when it\'s ready.', SEP22, lsCall('ls-sep22-2', 'Sep 22')),
    ],
  }),
  thread({
    id: 'L-7', zone: 'on-spearhead', type: 'question', system: 'charging', version: '',
    title: 'Spearhead\'s second pack: how is it charged, and how many BMSs?',
    body: 'In the electric configuration a second Longshot replaces the gas tank and drives the pusher directly (agreed Sep 25). How it charges is open, and so is how many BMSs Spearhead PT2 carries. There is no CAN port for the second pack\'s telemetry for now. Erick will check this when he starts the battery connector PCB.',
    source: lsCall('ls-sep25-2', 'Sep 25'), raisedAt: SEP25,
    positions: [
      c('p1', 'A power port and a balance port on the skin, charged with a normal balance charger, with no BMS on the second pack. On PT2 already, not just the final product.', SEP25, lsCall('ls-sep25-2', 'Sep 25'), 'alperen'),
      c('p2', 'A pack charged through a BMS needs its own. Check whether one BMS can serve both packs if they charge one at a time.', SEP25, lsCall('ls-sep25-2', 'Sep 25'), 'erick'),
    ],
  }),
  thread({
    id: 'L-8', zone: 'budget', type: 'question', kind: 'funding', system: 'funding', version: '',
    title: 'Phase 2: who writes the proposal, and what is in it?',
    body: 'The DAO approved Phase 1 on Apr 8: a prototype with a dummy BMS, flight-tested on Quiver. Phase 2 (the smart BMS v1, the protocol, design refinements and a production-ready pack) is to be "proposed as a separate project or amendment after Phase 1 delivers". AIP-007 lists Longshot\'s funding as running to the end of Phase 1, May 2026, and under AIP-006 a project past its expiration without an amendment can be marked stale. PT1 is built and has flown; the test report is the Phase 1 deliverable still missing. Nothing for Phase 2 is written yet: a new project, or an amendment to AIP-007?',
    source: doc('AIP-007', AIP007), raisedAt: PT1,
    positions: [],
  }),
  thread({
    id: 'L-9', zone: 'builds', type: 'question', system: 'build', version: '',
    title: 'Close out PT1 on GitHub: are #21 to #25 done, and what is in the last 364 g?',
    body: 'PT1 was declared complete on Aug 29 at 11.2 kg, but its build issues are still open: solder the SL and voltage-sense boards (#22, #21), print the holders and the casing (#23, #24), order screws (#25). The weight table (#26) still has about 364 g to itemize: the fuse, wiring, screws, temperature sensors, the top-cap clip and four rubber feet.',
    source: lsIssue(26), raisedAt: PT1,
    positions: [],
  }),
  thread({
    id: 'L-10', zone: 'safety', type: 'question', system: 'safety', version: '',
    title: 'Flying and charging PT1 without a BMS: what are the rules until it has one?',
    body: 'PT1 has no over-voltage, under-voltage, over-current or over-temperature cut-off; the fuse is its only protection. It charges on the TA3200 through its balance connector and must never get the LiHV profile the Tattu uses. In the air Quiver gets no battery data from it, so the failsafes adopted in Quiver #248 can\'t act and only the voltage backstop does (Q-20). The Sep 22 call called charging without a BMS possible but not recommended. What should pilots, and whoever charges it, follow until PT2?',
    source: SL, raisedAt: SEP28,
    positions: [],
  }),
  thread({
    id: 'L-11', zone: 'connector', part: 'SL_PCB-002-SL_PCB_V3', type: 'proposal', system: 'electronics', version: NEXT,
    title: 'Publish the SL board and sense board sources, with the charger pin map',
    body: 'Julius closed #14 (Jul 10) and #16 (Jul 14) saying the voltage-sense board (V1.0) and SL board (V1) KiCad files would follow. The repo still holds only the SL board\'s basic layout and no sense-board project; the boards as built exist only as STEP geometry in the CAD. The SL_PCB README also leaves the TA3200 balance connector part and the full map from the four sense boards to the balance connector open, and warns not to rely on photos for pin mapping. Without the sources nobody else can build or check a pack.',
    source: doc('#16, Julius', `${LS}/issues/16`), raisedAt: JUL,
    positions: [],
  }),
  thread({
    id: 'L-12', zone: 'bms', type: 'question', system: 'bms', version: NEXT,
    title: 'Which license for Longshot\'s hardware, and what credit does the BMS design owe?',
    body: 'Every PCB README says "Hardware: Open Source (license TBD)", and the repo has no license file. The proposal promised release "under Arrow DAO standard licensing"; Quiver uses CERN-OHL-S. BMSJ\'s firmware is the GPL v3 VESC BMS firmware, and its schematic uses symbol libraries named ENNOID and BMS-Master-LV-rescue, the names used by the GPL-3.0 ENNOID-BMS design. Settle the license, and the upstream credits, before the BMS is built on.',
    source: SL, raisedAt: '2026-05-27T12:00:00Z',
    positions: [],
  }),
  thread({
    id: 'L-13', zone: 'busbars', part: 'PW-BUS-003-Bridge_1', type: 'question', system: 'build', version: '',
    title: 'As built: copper or brass busbars, polycarbonate or acrylic plates?',
    body: 'The README and the CAD BOM say the busbars are 0.2 mm copper, but the supplier\'s quotation lists brass H62 for the 0.2 mm parts (copper C101 only for the 6 mm terminals). The CAD BOM lists polycarbonate top and bottom plates; the weight table and the Sep 22 notes say acrylic. The busbar metal matters for current and welding, and the next builds copy whatever the BOM says.',
    source: doc('Copper order', `${LS}/blob/main/engineering/builds/PT1/design/copper-busbars/order-copper-longshot-pt1/README.md`), raisedAt: PT1,
    positions: [],
  }),
  thread({
    id: 'L-14', zone: 'on-quiver', type: 'proposal', system: 'docs', version: '',
    title: 'Update Quiver\'s Pilot\'s Handbook for Longshot',
    body: 'The handbook allows only Tattu 3.5 or 4.0 14S smart LiHV packs on a LiHV charger, sets a 56.0 V pre-flight minimum (4.0 V a cell, for LiHV), and describes the Tattu 4.0\'s power button. Longshot is Li-ion, full at 58.8 V, and its SL board has no switching, so its terminals are live whenever it\'s connected. Pilots flying PT1 need its own charging rule, pre-flight minimum and handling notes.',
    source: doc('Pilot\'s Handbook', HANDBOOK), raisedAt: '2026-09-30T12:00:00Z',
    positions: [],
  }),
  thread({
    id: 'L-15', zone: 'on-quiver', type: 'idea', system: 'battery', version: '',
    title: 'A lighter Longshot for Quiver?',
    body: 'Raised under the proposal: smaller capacity for less weight. Quiver\'s Dev Kit report puts payload at 3.95 kg with the 11.4 kg, 30 Ah Tattu at 25 kg maximum takeoff weight, against 7.45 kg with a 20 Ah pack of 7.9 kg. PT1 weighs 11.2 kg.',
    source: doc('Dev Kit report', DEVKIT_REPORT), raisedAt: KBM_POST,
    positions: [
      c('p1', 'Reduce the pack\'s capacity to reduce its weight, given the thrust overload in harsh weather.', KBM_POST, doc('Forum post', 'https://dao.arrowair.com/t/project-longshot-proposal-discussion/154/4'), 'kbm'),
    ],
  }),
];
