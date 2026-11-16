import type { Zone } from '../../data/zones';
import { AIP006, AIP007, BUILD_14S3P, BUILD_14S9P, COPPER_QUOTE, DEVKIT_REPORT, HANDBOOK, HANDBOOK_DRAFT, LS, NOV3_NOTES, OCT27_NOTES, PROPOSAL, TATTU_STORE, TATTU_TA3200, VESC_DRIVERS, W09, W10, src } from './sources';

// Longshot's working zones. Each opens on what the record says today, with
// the source on every line: the repository and its issues, the proposal the
// DAO approved, the call notes on the Spearhead wiki, and Julius's build
// site. Issue and PR numbers are project-longshot's. The zones are shared by
// every variant: a fact about one variant's pack says which (variants.ts),
// and a fact with none is true of all of them. The two aircraft pages are
// each about one variant's fit.

const SITE9 = src('Build site: 14S9P', BUILD_14S9P);
const SITE3 = src('Build site: 14S3P', BUILD_14S3P);
const OCT27 = src('Oct 27 notes', OCT27_NOTES);
const S9 = '14s9p';
const S3 = '14s3p';

export const longshotZones: Zone[] = [
  // Pack
  {
    id: 'cells',
    summary: 'The 21700 cells that make each pack, and the printed holders that space them: 126 in the 14S9P for Quiver (14 in series, 9 in parallel), 42 in the 14S3P for Spearhead. Which cell later packs use is open.',
    facts: [
      { variant: S9, label: 'Cell', value: 'BAK 21700 65E: 6.5 Ah, 3.6 V nominal, 25 A continuous. 72 g each, 9,072 g for all 126.', source: src('PT1 BOM', `${LS}/blob/main/engineering/builds/PT1/BOM.md`) },
      { variant: S9, label: 'Why this cell', value: 'In stock and close to the best 21700 at order time. Julius first tried Reliance RH60 at about $3 a cell, but it wasn\'t available until the end of June.', source: src('PT1 BOM', `${LS}/blob/main/engineering/builds/PT1/BOM.md#cell-selection-rationale`) },
      { variant: S9, label: 'Tested', value: '20.18 Wh to 2.8 V at 10 A, the best of 11 cells in Julius\'s comparison.', source: src('PT1 BOM', `${LS}/blob/main/engineering/builds/PT1/BOM.md#cell-selection-rationale`) },
      { variant: S9, label: 'Holders', value: 'Upper and bottom cell holders, 3D printed with heat-set inserts, 240 g each.', source: src('#26', `${LS}/issues/26`) },
      { variant: S9, label: 'In CAD', value: 'The build123d model uses a Molicel P45B as a stand-in for the cell.', source: src('BOM.csv', `${LS}/blob/main/engineering/cad/build123d/BOM.csv`) },
      { variant: S3, label: 'Cell', value: 'Tenpower INR21700-60XG: 6.0 Ah, 40 A continuous, 42 in the pack. Not the BAK cell, so its own line in the parts list.', source: SITE3 },
      { variant: S3, label: 'Holders', value: 'Its own upper and bottom holders, printed, with 32 M3 and 4 M4 heat-set inserts.', source: SITE3 },
    ],
    issues: [18, 23],
    parts: ['PW-CELL-001-21700', 'EN-CELL-001-Upper_Cell_Holder', 'EN-CELL-001-Bottom_Cell_Holder'],
  },
  {
    id: 'busbars',
    summary: 'Laser-cut 0.2 mm copper busbars spot-welded to the cells, with screw-terminal bars at the ends of the pack. Each variant has its own set: twelve series bridges, one between the two halves of the pack, and the two terminals.',
    facts: [
      { variant: S9, label: 'Material', value: '0.2 mm copper in the README and the CAD BOM, laser cut by Supro Manufacturing. The supplier\'s quotation lists brass H62 for the 0.2 mm parts and copper C101 for the 6 mm terminals. The order covers three packs.', source: src('Copper order', COPPER_QUOTE) },
      { variant: S9, label: 'Cost', value: '$108.57 a pack delivered ($75.90 in parts), with shipping spread over three batteries.', source: src('PT1 BOM', `${LS}/blob/main/engineering/builds/PT1/BOM.md#copper-busbars`) },
      { variant: S9, label: 'Mass', value: 'All busbars together: 157 g.', source: src('#26', `${LS}/issues/26`) },
      { variant: S9, label: 'Forming', value: 'One flat pattern for every series bridge, turned 180° for the top or bottom of the pack; the tongues bend during spot welding.', source: src('BOM.csv', `${LS}/blob/main/engineering/cad/build123d/BOM.csv`) },
      { variant: S3, label: 'Set', value: 'Twelve series bridges (six on top, six underneath), a crossover between the two strips and the two terminals, all 0.2 mm copper. The screw-terminal bars are 0.250 in 6061 aluminium, anodized.', source: SITE3 },
    ],
    issues: [17],
    prs: [19],
    parts: ['PW-BUS-001-N_Terminal', 'PW-BUS-002-P_Terminal', 'PW-BUS-003-Bridge_1', 'PW-BUS-004-Bridge_2', 'PW-BUS-005-Screw_Terminal_Negative', 'PW-BUS-006-Screw_Terminal_Positive'],
  },
  {
    id: 'enclosure',
    summary: 'The case: 3 mm polycarbonate top and bottom plates and a printed base and cover around the cell block. The 14S9P adds aluminium side reinforcements and is sized to slide into Quiver\'s battery bay like the Tattu; the 14S3P is a 180 × 180 mm block without them.',
    facts: [
      { variant: S9, label: 'Target', value: '220 × 330 × 90 mm usable interior, at most 11.5 kg, IP54.', source: src('Proposal', PROPOSAL) },
      { variant: S9, label: 'Plates', value: '3 mm top and bottom plates, 250 g each: polycarbonate in the CAD BOM, acrylic in the weight table.', source: src('#26', `${LS}/issues/26`) },
      { variant: S9, label: 'Printed parts', value: 'Base and top cover, with heat-set inserts (67 M3, 4 M4 in the whole pack).', source: src('BOM.csv', `${LS}/blob/main/engineering/cad/build123d/BOM.csv`) },
      { variant: S9, label: 'In CAD', value: 'Designed in Fusion 360. The build123d model rebuilds Julius\'s Fusion assembly: 18 of 19 parts match it, and the printed top cover is approximate.', source: src('PR #27', `${LS}/pull/27`) },
      { variant: S3, label: 'Size', value: '180 × 180 mm, about 90.9 mm tall.', source: OCT27 },
      { variant: S3, label: 'Case', value: '3 mm polycarbonate top and bottom plates, a printed base, top cover and cable clamp. No aluminium side sheets in its parts list.', source: SITE3 },
    ],
    issues: [11, 12, 24],
    prs: [27],
    parts: ['EN-PC-001-Top_Plate', 'EN-PC-002-Bottom_Plate', 'EN-SHEET-001-Reinfocement_Right', 'EN-SHEET-002-Reinfocement_Left', 'EN-PRINT-001-3D-Printable_Battery_Base', 'EN-PRINT-002-3D-Printable_Battery_Top_Cover'],
  },
  {
    id: 'mounting',
    summary: 'How each pack is carried and held. The 14S9P has a carrying handle and the Tattu 4.0 clip that keeps it compatible with Quiver\'s battery bay. How the 14S3P is held in Spearhead isn\'t on record yet: its parts list has neither.',
    facts: [
      { variant: S9, label: 'Handle', value: 'A 200 mm carrying handle, bought as one part; the CAD draws it in three pieces.', source: SITE9 },
      { variant: S9, label: 'Clip', value: 'The Tattu 4.0 30 Ah clip, so Longshot locks into the bay the way the Tattu does. No fit check against Quiver\'s slider and connector board is recorded.', source: src('PR #27', `${LS}/pull/27`) },
    ],
    issues: [20, 25],
    parts: ['EN-STRAP-001-Metal_piece', 'EN-STRAP-002-Rubber_Part', 'EN-STRAP-003-Metal_End', 'Tattu_4_0_30Ah_Clip', 'EN-INSERT-001-ruthex_RX-M3x5_7', 'EN-INSERT-002-ruthex_RX-M4x8_1'],
    related: ['Q-18'],
  },

  // Electronics
  {
    id: 'bms',
    status: { tone: 'blocked', text: 'No BMS yet: neither pack has protection, balancing or telemetry' },
    summary: 'The battery management system every Longshot still needs: protection, balancing and CAN. Phase 1 deliberately shipped without one. It will be one design, inside the pack, for every variant; the design work is open, and it is the top priority for Quiver and Spearhead alike.',
    facts: [
      { variant: S9, label: 'Today', value: 'PT1\'s SL board is a dummy: one fuse, the power path, and the cell-sense lines brought out for an external charger. No MOSFETs, no balancing, no firmware.', source: src('SL_PCB README', `${LS}/blob/main/engineering/electronics/pcbs/SL_PCB/README.md`) },
      { label: 'Where', value: 'Inside the pack, not on Spearhead\'s battery connector board. The first battery boards ship without it; the same cells and layout later take a board with it built in. Spearhead PT2\'s battery has one.', source: OCT27 },
      { label: 'Planned', value: 'Smart BMS v1 on an STM32: over- and under-voltage, over-current and over-temperature protection, passive balancing, CAN. To be scoped in a Phase 2 proposal.', source: src('Proposal', PROPOSAL) },
      { label: 'BMSJ', value: 'Julius\'s Vector BMS, imported as a reference design: STM32L476, two LTC6811, INA226 on a 0.1 mΩ shunt, isolated CAN, VESC BMS firmware. The schematic is complete; the board isn\'t laid out.', source: src('BMSJ README', `${LS}/blob/main/engineering/electronics/pcbs/BMSJ/README.md`) },
      { label: 'Firmware', value: 'BMSJ\'s firmware config targets the VESC BMS firmware, which ships an LTC6813 driver but none for the LTC6811 or the INA226 that BMSJ uses.', source: src('vesc_bms_fw drivers', VESC_DRIVERS) },
      { label: 'BMSZ', value: 'Started as a copy of BMSJ, then cut back to the SL board\'s basic layout. Not a BMS today.', source: src('PR #10', `${LS}/pull/10`) },
      { label: 'Who', value: 'Sep 22: Julius reserved a bounty and is approaching freelancers; Alperen is trying Astra for component selection in parallel. Sep 29: Julius has a BMS dev board to test, then copy. Oct 5: no update yet.', source: src('Sep 22 notes', `${W09}#september-22-2026--longshot-battery--bms-call`) },
    ],
    prs: [4, 6, 10],
    links: [
      { label: 'BMSJ board, schematic and firmware', url: `${LS}/tree/main/engineering/electronics/pcbs/BMSJ` },
      { label: 'VESC BMS firmware', url: 'https://github.com/vedderb/vesc_bms_fw' },
    ],
    related: ['Q-19'],
  },
  {
    id: 'can',
    summary: 'What a pack tells the aircraft. Quiver\'s failsafes read the Tattu\'s smart BMS over DroneCAN; Longshot sends nothing yet, so only the voltage backstop acts. Which protocol it speaks is undecided.',
    facts: [
      { variant: S9, label: 'Connector', value: 'CAN H and L are on the main connector, the Samtec ET60S-D06, ready for when there is a BMS to drive them.', source: src('Proposal', PROPOSAL) },
      { label: 'Protocol', value: 'Open: a mirror of the Tattu protocol, a native DroneCAN battery node, or both.', source: src('Proposal', PROPOSAL) },
      { variant: S3, label: 'Connector', value: 'A CAN twisted pair from a JST GH header on its SL board.', source: SITE3 },
      { variant: S9, label: 'Quiver', value: 'Battery failsafes adopted in Quiver #248 read the Tattu BMS count (warn 7,500 mAh, land 4,500 mAh, no arming under 9,000) and are sized for 30 Ah.', source: src('Quiver #248', 'https://github.com/Arrow-air/project-quiver/issues/248') },
      { label: 'Prior art', value: 'An open Caribou pull request decodes DroneCAN BatteryInfo and dumps raw frames, to confirm whether the Tattu 4.0 speaks DroneCAN or its own CAN protocol.', source: src('Caribou PR #54', 'https://github.com/Arrow-air/project-caribou/pull/54') },
      { variant: S3, label: 'Spearhead', value: 'No CAN port for the second battery for now: with no BMS there is nothing to talk to (Erick, Sep 25).', source: src('Sep 25 notes', `${W09}#september-25-2026`) },
    ],
    related: ['Q-19', 'Q-20'],
  },
  {
    id: 'charging',
    status: { tone: 'open', text: 'Interim on the 14S9P: a Tattu TA3200 through exposed charge and balance connectors' },
    summary: 'How a Longshot gets charged. The 14S9P uses a Tattu TA3200 on exposed connectors. Once a pack has its BMS the balance leads go away and a charge cable goes straight to the BMS, ideally talking CAN.',
    facts: [
      { variant: S9, label: 'Today', value: 'The SL board exposes a main charge connector for the TA3200 charge cable and a balance connector that mates with the TA3200 balance cable.', source: src('SL_PCB README', `${LS}/blob/main/engineering/electronics/pcbs/SL_PCB/README.md#charger-connectors`) },
      { label: 'Next', value: 'The second battery PCB iteration has the BMS fitted and needs no external balance leads.', source: src('Sep 22 notes', `${W09}#september-22-2026--longshot-battery--bms-call`) },
      { variant: S3, label: 'With the BMS', value: 'A charge cable straight to the BMS, from a socket on Spearhead\'s skin, likely an AS150U: Alperen\'s charger does CAN over it. A CAN charger or a plain one set to the right voltage both work; the BMS cuts off if anything goes wrong.', source: OCT27 },
      { label: 'Careful', value: 'Longshot is standard Li-ion, full at 58.8 V (4.2 V a cell). The Tattu 4.0 is LiHV, full at 60.9 V (4.35 V a cell). A charger or dock that handles both must never charge Longshot on the LiHV profile.', source: src('#26', `${LS}/issues/26`) },
      { label: 'Over CAN', value: 'Tattu says the TA3200 recognizes batteries that speak DroneCAN, which matters for the BMS protocol choice. Nothing is on record yet about its handshake with a pack that isn\'t a Tattu.', source: src('Tattu store', TATTU_STORE) },
      { label: 'Which TA3200', value: 'It comes in three versions: standard (4.2 V a cell), HV and UHV. Only the standard one suits Longshot, and which one Arrow has isn\'t recorded. Quiver\'s handbook calls for a LiHV charger.', source: src('Tattu', TATTU_TA3200) },
    ],
    issues: [16],
    related: ['Q-21'],
  },
  {
    id: 'connector',
    summary: 'Each pack\'s SL board, which carries power from the cells through the main fuse to the output, and the four voltage-sense boards that bring every cell group\'s voltage and temperature to it. Each variant has its own layout.',
    facts: [
      { variant: S9, label: 'SL board', value: 'Main power path through an AMXL-200 fuse to the ET60S-D06 connector, plus charge and balance connectors for the TA3200. 153 g without the fuse.', source: src('SL_PCB README', `${LS}/blob/main/engineering/electronics/pcbs/SL_PCB/README.md`) },
      { variant: S9, label: 'Main fuse', value: 'Only the AMXL-200 fits; the AMX-150 the README also names doesn\'t.', source: SITE9 },
      { variant: S3, label: 'SL board', value: 'Its own, 6 layers: the AMXL-200 main fuse on 150 A screw terminals, two output studs for the 8 AWG leads to the AS150U, a 2 × 8 Micro-Fit balance connector, and a 2 A fuse on each sense line.', source: SITE3 },
      { label: 'Sense boards', value: 'Four voltage-sense boards (top and bottom, left and right), each with 3 or 4 cell taps, ground and a temperature sensor, on a JST connector to the SL board. 5 g each.', source: src('SL_PCB README', `${LS}/blob/main/engineering/electronics/pcbs/SL_PCB/README.md#cell-voltage-sensing-interface`) },
      { variant: S9, label: 'On Quiver', value: 'Quiver\'s battery connector board takes two Molex 46437-9206 with guide pins; Longshot carries the ET60S-D06. Whether they mate has not been checked.', source: src('Quiver BC PCB guide', 'https://github.com/Arrow-air/project-quiver/blob/main/docs/Archive/PT3-Assembly-Guides/PCB-assembly/battery-connector-pcb.mdx') },
      { variant: S3, label: 'On Spearhead', value: 'AS150U, which has four signal pins; QS8 was rejected as too hard to handle in the field.', source: src('Sep 22 notes', `${W09}#september-22-2026--longshot-battery--bms-call`) },
      { variant: S9, label: 'Sources', value: 'Julius said the SL board (V1) and sense board (V1.0) KiCad files would follow when he closed #16 and #14 in July. The SL board\'s KiCad project was updated from his files on Oct 19; there is still no sense-board project.', source: src('PR #31', `${LS}/pull/31`) },
    ],
    issues: [14, 16, 21, 22],
    prs: [8, 15],
    parts: ['SL_PCB-002-SL_PCB_V3', 'VS_PCB_COMPLETE_TOP_LEFT', 'VS_PCB_COMPLETE_TOP_RIGHT', 'VS_PCB_COMPLETE_BOTTOM_LEFT', 'VS_PCB_COMPLETE_BOTTOM_RIGHT', 'ET60S-D06-0-00-D06-L-V1-S', 'EL-FUSE-001-AMXL-200'],
    related: ['Q-18'],
  },

  // Aircraft
  {
    id: 'on-quiver',
    card: 'longshot',
    status: { tone: 'open', text: 'Flown on Quiver; no flight-test report yet' },
    summary: 'The 14S9P on Quiver, where Longshot started: Quiver #188 asked for a custom 21700 pack as a drop-in for the Tattu 14S smart battery, and became Project Longshot. PT1 matches the Tattu\'s size and weight with about 59% more usable energy. Fitting it properly is Quiver\'s Dev Kit v1.1 work, discussed in Quiver\'s workspace.',
    facts: [
      { label: 'Origin', value: 'Quiver #188, closed on Jul 21 once the work became Project Longshot.', source: src('Quiver #188', 'https://github.com/Arrow-air/project-quiver/issues/188') },
      { label: 'Flown', value: 'At least once: on the Sep 29 call Julius had the log from a Longshot flight and planned another.', source: src('Sep 29 call', 'https://discord.com/channels/853833144037277726/1478778896361980035/1554521669400526873') },
      { label: 'Handbook', value: 'Quiver\'s Pilot\'s Handbook allows only Tattu 3.5 or 4.0 14S smart LiHV packs on a LiHV charger, and sets a 56.0 V pre-flight minimum meant for LiHV cells.', source: src('Pilot\'s Handbook', HANDBOOK) },
      { label: 'Payload', value: 'With the 11.4 kg Tattu the Dev Kit carries 3.95 kg at its 25 kg maximum takeoff weight; a 20 Ah pack (7.9 kg) would leave 7.45 kg.', source: src('Dev Kit report', DEVKIT_REPORT) },
    ],
    related: ['Q-18', 'Q-19', 'Q-20', 'Q-21', 'Q-22'],
  },
  {
    id: 'on-spearhead',
    status: { tone: 'open', text: 'Designed (parts list Nov 3); the first pack has no BMS' },
    summary: 'How the 14S3P fits Spearhead, which moves to 14S for it. The first pack ships without a BMS; in the electric configuration a second pack replaces the gas tank and drives the pusher. Spearhead has no workspace in this app yet, so its fit questions are here.',
    facts: [
      { label: 'Sized', value: '14S3P with 6.5 Ah cells: 19.5 Ah, about 3.9 kg, called 4 kg. A desk estimate with buffers.', source: src('Sep 22 notes', `${W09}#september-22-2026--longshot-battery--bms-call`) },
      { label: 'Replaces', value: 'A Profuse 12S 22 Ah semi-solid pack, 3.7 kg, that cost $450 to $500. Cells for the Spearhead Longshot: about $250.', source: src('Sep 22 notes', `${W09}#september-22-2026--longshot-battery--bms-call`) },
      { label: 'Layout', value: 'About 18 × 18 cm, square, as small as Julius can make it. Spearhead PT2 likely carries two packs of the same capacity.', source: src('Sep 29 call', 'https://discord.com/channels/853833144037277726/1478778896361980035/1554521669400526873') },
      { label: 'Size', value: '180 × 180 mm, about 90.9 mm tall. Spearhead\'s main PCB targets the same footprint so it can sit over the battery.', source: OCT27 },
      { label: 'BMS', value: 'Inside the pack, not on Spearhead\'s battery connector PCB (a daughterboard there was the Sep 22 plan). The first battery board has none; Spearhead PT2\'s battery has one.', source: OCT27 },
      { label: 'Charging', value: 'A socket on the skin for PT2, likely an AS150U, with the charge cable going straight to the BMS. How the generator feeds the battery is still to be worked out.', source: OCT27 },
      { label: 'Connector board', value: 'Spearhead\'s battery PCB carries CAN to the ESCs, a temperature sensor and power for the tail PCB. Without Quiver\'s battery connector, just a plug, it is much smaller.', source: src('Nov 3 notes', NOV3_NOTES) },
      { label: 'When', value: 'Longshot\'s Spearhead customization plus the BMS: about a month (Oct 5). Spearhead PT2 moved from November to December.', source: src('Oct 5 notes', `${W10}#october-5-2026`) },
    ],
    links: [{ label: 'Spearhead call notes, September', url: W09 }, { label: 'Spearhead call notes, October', url: W10 }],
  },
  {
    id: 'testing',
    summary: 'What has been measured and what hasn\'t. The 14S9P\'s cells were tested on the bench and the pack has flown, but the flight-test report Phase 1 promised hasn\'t been written, and pack capacity, discharge and temperatures aren\'t on record. Nothing is measured on the 14S3P yet.',
    facts: [
      { variant: S9, label: 'Cells', value: '20.18 Wh to 2.8 V at 10 A for the BAK 65E, in Julius\'s comparison of 11 cells.', source: src('PT1 BOM', `${LS}/blob/main/engineering/builds/PT1/BOM.md#cell-selection-rationale`) },
      { variant: S9, label: 'Energy', value: 'About 2,540 Wh usable, worked out from that cell test (126 × 20.18 Wh), not measured on the pack. About 2,950 Wh nameplate.', source: src('#26', `${LS}/issues/26`) },
      { variant: S9, label: 'Pack', value: 'Flown at least once (Sep 29 call). No log analysis, bench discharge or thermal data is posted.', source: src('Sep 29 call', 'https://discord.com/channels/853833144037277726/1478778896361980035/1554521669400526873') },
      { variant: S9, label: 'Owed', value: 'A flight-test report: "documented flight validation on Quiver", a Phase 1 deliverable.', source: src('Proposal', PROPOSAL) },
    ],
    related: ['Q-22'],
  },

  // Build
  {
    id: 'builds',
    status: { tone: 'open', text: '14S9P PT1 complete on Aug 29; no 14S3P build on record yet' },
    summary: 'Building packs, for every variant: each variant\'s page lists its builds, and the manufacturing guide is the 14S9P\'s. Julius has suggested building the Spearhead pack in Texas with Thomas and teaching him to build them there.',
    facts: [
      { variant: S9, label: 'PT1', value: 'Complete on Aug 29 at 11.2 kg, about 200 g under the Tattu. 364 g are not itemized yet: the fuse, wiring, screws, temperature sensors, the top-cap clip and four rubber feet.', source: src('#26', `${LS}/issues/26`) },
      { variant: S9, label: 'On GitHub', value: 'PT1\'s build steps (#21 to #25) closed on Oct 15.', source: src('#25', `${LS}/issues/25`) },
      { variant: S3, label: 'So far', value: 'Its parts list, printing tests and bench steps are on the build site (Nov 3). No build on record yet.', source: SITE3 },
      { label: 'Next', value: 'Build the physical Longshot layout in Texas with Thomas, order the PCB shortly after, and teach Thomas to build packs (Julius, Oct 5).', source: src('Oct 5 notes', `${W10}#october-5-2026`) },
    ],
    issues: [26, 21, 22, 23, 24, 25],
    links: [{ label: 'PT1 build notes', url: `${LS}/blob/main/engineering/builds/PT1/README.md` }],
  },
  {
    id: 'sourcing',
    summary: 'Where the parts come from and what they cost: the cells, the copper, printed parts, the strap, and the tools to put a pack together.',
    facts: [
      { variant: S9, label: 'Cells', value: 'Shenzhen Vapcell, through Alibaba: 140 cells for €856.39 landed, about $7.00 a cell, hazardous-goods shipping included.', source: src('PT1 BOM', `${LS}/blob/main/engineering/builds/PT1/BOM.md#battery-cells`) },
      { variant: S9, label: 'Copper', value: 'Supro Manufacturing, laser cut, enough for three packs.', source: src('PR #19', `${LS}/pull/19`) },
      { variant: S3, label: 'Cells', value: 'Tenpower INR21700-60XG, listed at $9.99 a cell in the US, and sold out at both US stores the build site checked on Oct 26.', source: SITE3 },
      { variant: S9, label: 'Strap', value: 'Its model was handed to a freelancer.', source: src('#20', `${LS}/issues/20`) },
      { label: 'Next cells', value: 'Thomas is sourcing cells for the Texas build. 6.5 Ah 21700s come only from BAK and FEB, at about twice the price of 5.0 Ah cells (KBM, Sep 29).', source: src('Sep 29 call', 'https://discord.com/channels/853833144037277726/1478778896361980035/1554521669400526873') },
    ],
    issues: [18, 17, 20],
  },
  {
    id: 'safety',
    summary: 'Living with packs that have no BMS: how they are charged and flown until they get one, and shipping lithium cells.',
    facts: [
      { variant: S9, label: 'Protection', value: 'None on PT1: no over-voltage, under-voltage, over-current or over-temperature cut-off. The fuse is the only protection in the power path.', source: src('SL_PCB README', `${LS}/blob/main/engineering/electronics/pcbs/SL_PCB/README.md`) },
      { variant: S3, label: 'Protection', value: 'A main fuse and a 2 A fuse on each sense line; no BMS on the first board.', source: SITE3 },
      { variant: S9, label: 'Charging', value: 'Only on the TA3200 through the balance connector, on a Li-ion profile, never LiHV.', source: src('#26', `${LS}/issues/26`) },
      { variant: S9, label: 'In flight', value: 'Quiver gets no battery data from PT1, so its BMS-count failsafes can\'t act. The draft Pilot\'s Handbook falls back on voltage alone for such a pack: return to land at 46.2 V, land in place at 44.8 V.', source: src('Quiver PR #274', HANDBOOK_DRAFT) },
      { variant: S9, label: 'Shipping', value: 'Cells travel as hazardous goods: €145.13 shipping and €24.22 insurance on the PT1 order.', source: src('PT1 BOM', `${LS}/blob/main/engineering/builds/PT1/BOM.md#battery-cells`) },
    ],
    related: ['Q-20'],
  },
  {
    id: 'budget',
    summary: 'What the DAO approved for Longshot and what is still to propose. Phase 1 had caps, not commitments; Phase 2, the smart BMS and a production design, gets its own proposal.',
    facts: [
      { label: 'Approved', value: 'Phase 1, on Snapshot on Apr 8 (6 votes, all for). Caps: hardware $3,000 (target about $1,000), project management $1,500, engineering bounties $10,000, a BMS specialist up to $5,000. About $19,500 in all, plus 10,000 ARROW for bounties.', source: src('Proposal', PROPOSAL) },
      { label: 'Expires', value: 'AIP-007 lists Longshot\'s funding as running to the end of Phase 1, May 2026. Under AIP-006 a project past its expiration without an amendment can be marked stale.', source: src('AIP-007', AIP007) },
      { label: 'Spent', value: 'On record: cells $979.55, the copper quote $443.50 for three packs, and four design bounties of $400, $800, $600 and $800 (#11, #12, #14, #16). No payout records or spend total.', source: src('PT1 BOM', `${LS}/blob/main/engineering/builds/PT1/BOM.md`) },
      { label: 'Multisig', value: 'AIP-006 asks each project for a multisig held by its leader and the grants committee. None is on record for Longshot.', source: src('AIP-006', AIP006) },
      { label: 'BMS', value: 'Julius has reserved a BMS bounty in the Longshot budget; Alperen offered Spearhead money if it falls short (Sep 22).', source: src('Sep 22 notes', `${W09}#september-22-2026--longshot-battery--bms-call`) },
      { variant: S3, label: 'Funding', value: 'Not in AIP-007, which still describes Longshot as Quiver\'s pack. Nothing on record says who pays for a variant built for another project.', source: src('AIP-007', AIP007) },
      { label: 'Phase 2', value: 'Smart BMS v1, the protocol, design refinements and a production-ready pack, "proposed as a separate project or amendment after Phase 1 delivers". Not written yet.', source: src('Proposal', PROPOSAL) },
    ],
    links: [
      { label: 'Project Longshot proposal', url: PROPOSAL },
      { label: 'Snapshot vote', url: 'https://snapshot.box/#/s:arrowair.eth/proposal/0xe11e4b620177b6f1b65b07efa2f9be8aa85e335d46c6469106983e0b6e738772' },
    ],
  },
];
