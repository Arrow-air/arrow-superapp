// How to build a Longshot pack: PT1, step by step, from the record. Every
// line says where it comes from: the repository (pinned to f7ec9a7 so line
// anchors hold), its issues, Julius's answers, Arrow's build photos on X, the
// call notes. "Worked out from the CAD" marks what was computed from the CAD
// files but never written down by whoever built PT1; lines marked `practice`
// are common practice for spot-welded 21700 packs, not Longshot's spec. What
// the record doesn't say is asked as a question in the step that needs it,
// for whoever knows (mostly Julius) to answer in the app, or for the next
// build to measure. Question ids are stored with their answers: never rename
// one once it has been answered.
import type { Guide, GuideImage, GuideQuestion, GuideSource } from '../../modules/guide/types';
import { HANDBOOK_DRAFT, LS, PROPOSAL, TATTU_TA3200, W09, src } from './sources';

// Sources.
const AT = `${LS}/blob/f7ec9a7`;
const at = (label: string, path: string, lines?: string) => src(label, `${AT}/${path}${lines ? `#${lines}` : ''}`);
const issue = (n: number, title?: string, comment?: string) => src(`#${n}${title ? ` ${title}` : ''}`, `${LS}/issues/${n}${comment ? `#issuecomment-${comment}` : ''}`);
const onX = (date: string, id: string) => src(`Arrow on X, ${date}`, `https://x.com/ArrowAir_/status/${id}`);
const SLR = 'engineering/electronics/pcbs/SL_PCB/README.md';
const PT1BOM = 'engineering/builds/PT1/BOM.md';
const PT1N = 'engineering/builds/PT1/README.md';
const BOMMD = 'engineering/cad/build123d/BOM.md';
const CU = 'engineering/builds/PT1/design/copper-busbars/order-copper-longshot-pt1/README.md';
const CAD = 'engineering/cad/build123d/src/longshot';
const PLACE = `${CAD}/placements.json`;
const BH = `${CAD}/parts/en_cell_001_bottom_cell_holder.py`;
const UH = `${CAD}/parts/en_cell_001_upper_cell_holder.py`;
const TC = `${CAD}/parts/en_print_002_3d_printable_battery_top_cover.py`;
const NT = `${CAD}/parts/pw_bus_001_n_terminal.py`;
const BR1 = `${CAD}/parts/pw_bus_003_bridge_1.py`;
const T5 = `${CAD}/parts/pw_bus_005_screw_terminal_negative.py`;
const TP = `${CAD}/parts/en_pc_001_top_plate.py`;
const SH = `${CAD}/parts/en_sheet_001_reinfocement_right.py`;
const VAL = 'engineering/cad/build123d/validation/results.md';
const KICAD = 'engineering/electronics/pcbs/SL_PCB/kicad/SL_PCB.kicad_pcb';
const HB = 'https://github.com/Arrow-air/project-quiver/blob/9ef9efc80db1e0b7fa2fe03766c2bcf7a8eee03e/docs/Operations/Pilot-Handbook.md';
const S = {
  julius: src('Julius, in e797fb0', `${LS}/commit/e797fb0c45dc0e876854129b6b0bd0467cee05ac`),
  proposal: src('Proposal', PROPOSAL),
  sep22: src('Sep 22 notes', `${W09}#september-22-2026--longshot-battery--bms-call`),
  tattu: src('Tattu TA3200', TATTU_TA3200),
  weights: issue(26),
  handbook: (lines: string) => src('Quiver Pilot\'s Handbook', `${HB}#${lines}`),
  xPrint: onX('Jul 11', '2076046668110389726'),
  xDesign: onX('Jul 11', '2076046662691123383'),
  xCells: onX('Aug 26', '2092752981837942960'),
  xBoard: onX('Aug 26', '2092752986061537486'),
};

// Pictures: Arrow's build photos on X (shown small, opened full size), files
// attached to issue comments, and images in the repository.
const tw = (id: string, caption: string, source: GuideSource): GuideImage =>
  ({ src: `https://pbs.twimg.com/media/${id}.jpg?name=small`, full: `https://pbs.twimg.com/media/${id}.jpg?name=orig`, caption, source });
const att = (uuid: string, caption: string, source: GuideSource): GuideImage => ({ src: `https://github.com/user-attachments/assets/${uuid}`, caption, source });
const repo = (path: string, caption: string): GuideImage => ({ src: `https://raw.githubusercontent.com/Arrow-air/project-longshot/f7ec9a7/${path}`, caption, source: at('project-longshot', path) });
const WP = 'docs/issue-assets/longshot-battery-work-packages';

// Parts, by their build123d BOM number.
const CELL = 'PW-CELL-001-21700';
const UPPER = 'EN-CELL-001-Upper_Cell_Holder';
const BOTTOM = 'EN-CELL-001-Bottom_Cell_Holder';
const BUS_N = 'PW-BUS-001-N_Terminal';
const BUS_P = 'PW-BUS-002-P_Terminal';
const BRIDGE = 'PW-BUS-003-Bridge_1';
const CROSS = 'PW-BUS-004-Bridge_2';
const TERM_N = 'PW-BUS-005-Screw_Terminal_Negative';
const TERM_P = 'PW-BUS-006-Screw_Terminal_Positive';
const TOP_PLATE = 'EN-PC-001-Top_Plate';
const BOTTOM_PLATE = 'EN-PC-002-Bottom_Plate';
const SHEET_R = 'EN-SHEET-001-Reinfocement_Right';
const SHEET_L = 'EN-SHEET-002-Reinfocement_Left';
const BASE = 'EN-PRINT-001-3D-Printable_Battery_Base';
const COVER = 'EN-PRINT-002-3D-Printable_Battery_Top_Cover';
const STRAP = ['EN-STRAP-001-Metal_piece', 'EN-STRAP-002-Rubber_Part', 'EN-STRAP-003-Metal_End'];
const CLIP = 'Tattu_4_0_30Ah_Clip';
const INSERT_M3 = 'EN-INSERT-001-ruthex_RX-M3x5_7';
const INSERT_M4 = 'EN-INSERT-002-ruthex_RX-M4x8_1';
const SL = 'SL_PCB-002-SL_PCB_V3';
const VS = ['VS_PCB_COMPLETE_TOP_LEFT', 'VS_PCB_COMPLETE_TOP_RIGHT', 'VS_PCB_COMPLETE_BOTTOM_LEFT', 'VS_PCB_COMPLETE_BOTTOM_RIGHT'];
const ET60S = 'ET60S-D06-0-00-D06-L-V1-S';
const FUSE = 'EL-FUSE-001-AMXL-200';
const SMD_FUSE = 'FUSE-SMD_L10_0-W5_0-H3_8';
const FUSE_TERMS = 'AMT0450003DB0000G';
const BALANCE = 'CONN-TH_430451612';
const JST = 'CONN-SMD_SM7B-GHS-TB-LF-SN';

// The pack as it goes together, for the 3D view.
const HOLDERS = [UPPER, BOTTOM, INSERT_M3, INSERT_M4];
const SENSED = [...HOLDERS, ...VS, JST];
const LOADED = [...SENSED, CELL];
const BUSBARS = [BRIDGE, CROSS, BUS_N, BUS_P];
const WELDED = [...LOADED, ...BUSBARS];
const BOARD = [SL, ET60S, FUSE, FUSE_TERMS, BALANCE, SMD_FUSE];
const BOARDED = [...WELDED, ...BOARD];
const POWERED = [...BOARDED, TERM_N, TERM_P];
const CASE = [BOTTOM_PLATE, SHEET_R, SHEET_L, BASE, COVER, TOP_PLATE];
const ENCLOSED = [...POWERED, ...CASE];
const DONE = [...ENCLOSED, ...STRAP, CLIP];

const q = (x: Omit<GuideQuestion, 'when'> & { when?: GuideQuestion['when'] }): GuideQuestion => ({ when: 'before', ...x });

export const longshotGuide: Guide = {
  id: 'longshot-pt1',
  project: 'longshot',
  title: 'How to build a Longshot pack',
  subject: 'PT1 · 14S9P · 126 cells',
  intro:
    'Building Longshot PT1, the 14S9P pack of 126 BAK 21700 cells that flies on Quiver, from bare parts to a charged, weighed pack. Each step says what the project\'s record says, with the source; "worked out from the CAD" marks what the CAD shows but nobody has written down. Where the record is silent the step asks: answer what you know here, and the next build answers the rest, with photos from the shot list.',
  variantNote:
    'Spearhead\'s 14S3P pack (42 cells, about 18 × 18 cm) is planned to follow the same process; its layout isn\'t drawn yet, so its counts, busbars and enclosure will differ.',
  sources: [src('project-longshot', LS), at('PT1 build notes', PT1N), at('PT1 BOM', PT1BOM), at('CAD BOM', BOMMD), at('SL_PCB README', SLR), src('Arrow on X', 'https://x.com/ArrowAir_'), src('Call notes', W09)],
  builds: [
    { id: 'next', label: 'Next build' },
    { id: 'pt1', label: 'PT1' },
  ],
  phases: [
    { id: 'prepare', title: 'Before you start', summary: 'PT1 has no BMS and no switch: nothing in the pack stops a short, an overcharge or a hot cell except one fuse, and once that fuse is in, the connector is live. Set the bench up for that, and count every part before the first cell comes out of its box.' },
    { id: 'make', title: 'Make the parts', summary: 'The cell holders, the base and the top cover are 3D printed, all 71 heat-set inserts go into the holders, and the voltage-sense boards are soldered and laid along the holders\' edges. All of it happens before a cell comes out of its box.' },
    { id: 'cells', title: 'Cells', summary: 'Every cell is checked, then the 126 go upright between the holders in 14 groups of 9, each group\'s polarity flipped from the last.' },
    { id: 'weld', title: 'Busbars and welding', summary: 'Seventeen busbars, 504 weld tongues: spot-welded to the cells, they turn 126 loose cells into one 14S9P pack, and each busbar\'s small ear becomes a sense tap. From the first weld the groups are live.' },
    { id: 'board', title: 'Main board and power path', summary: 'The SL board takes the power and the sense lines. It is a dummy on purpose: the power runs through the main fuse to the connector, and the 15 sense lines through their own fuses to a header for the TA3200 charger\'s balance cable.' },
    { id: 'enclose', title: 'Enclosure', summary: 'Plates, aluminium side sheets and the printed base and cover close the pack; the strap and the Tattu clip make it carry and lock like the Tattu it replaces.' },
    { id: 'test', title: 'Test and record', summary: 'Weigh it, check it, charge it the first time on the right charger profile, and measure what it holds. None of this is on record for PT1 yet.' },
    { id: 'finish', title: 'Label, store and ship', summary: 'What leaves the bench: a labelled pack, stored safely, and a plan for shipping lithium.' },
  ],
  steps: [
    // Before you start
    {
      id: 'bench', phase: 'prepare', title: 'Set up a safe bench',
      goal: 'A clear, non-conductive bench with fire kit at hand, and everyone at it knows the pack has no protection.',
      how: [
        { text: 'The SL board has no MOSFET switching, no balancing, no microcontroller and no BMS firmware: it is a dummy on purpose.', source: at('SL_PCB README', SLR, 'L13') },
        { text: 'Power runs from the cells through the main fuse straight to the connector. With no switch, the connector is live as soon as the fuse is in.', source: at('SL_PCB README', SLR, 'L23-L26') },
        { text: 'Keep a Class D fire extinguisher nearby, and a fire blanket; Quiver\'s handbook asks this for the Tattu.', source: S.handbook('L119-L124') },
        { text: 'Work on a non-conductive mat, take off rings and watches, and use insulated tools: a dropped spanner across two busbars is a dead short.', practice: true },
        { text: 'Keep cells in their packaging until they go into the holder, cover finished busbars as you go, and never leave cells or a pack charging unattended.', practice: true },
      ],
      questions: [
        q({ id: 'bench-setup', text: 'How was the bench set up for PT1: mat, tools, fire kit, ventilation for welding?', why: 'The guide should start from what worked, not from a generic list.', kind: 'text', ask: 'julius' }),
      ],
      shots: ['The bench before the first cell comes out: mat, tools, fire kit'],
      threads: ['L-10'],
      zone: 'safety',
    },
    {
      id: 'parts', phase: 'prepare', title: 'Count the parts and check the tools',
      goal: 'Every part on the BOM is on the bench and counted, and every tool works.',
      parts: [{ id: CELL, qty: 126 }, { id: BRIDGE, qty: 12 }, { id: SL, qty: 1 }, { id: ET60S, qty: 1 }, { id: FUSE, qty: 1 }, { id: INSERT_M3, qty: 67 }],
      tools: [
        { text: 'A spot welder that can weld the 0.2 mm busbars (see the welding step)', practice: true },
        { text: 'A soldering iron, with a heat-set insert tip', practice: true },
        { text: 'A 3D printer: PT1\'s parts came off a Bambu Lab printer with a textured PEI plate', source: S.xPrint },
        { text: 'A multimeter, and an internal-resistance meter for the cells', practice: true },
        { text: 'Insulated hand tools, Kapton tape, and insulator rings for the cells\' positive ends', practice: true },
      ],
      how: [
        { text: 'The bill of materials from the CAD: 32 lines, 260 parts a pack (126 cells, 17 busbar parts, 12 printed and sheet parts, 5 boards, 100 bought-in parts).', source: at('CAD BOM', BOMMD, 'L10-L19') },
        { text: 'Not in it: screws (the list #25 asks for was never compiled), the four temperature sensors, the wiring and the rubber feet.', source: S.weights },
        { text: 'Cells: BAK 21700 65E from Shenzhen Vapcell Technology on Alibaba. PT1\'s order was 140 for the 126 in the pack, leaving 14 spare.', source: at('PT1 BOM', PT1BOM, 'L7-L21') },
        { text: 'Busbars: laser cut by Shanghai Supro Manufacturing; one order covers about three packs.', source: issue(17) },
        { text: 'Voltage-sense boards: made by JLCPCB.', source: issue(14, undefined, '4935605459') },
      ],
      questions: [
        q({ id: 'screw-list', text: 'Which screws does a pack take, and how many of each?', why: 'There\'s no screw list anywhere and the CAD has no screws; the enclosure step counts the holes as a starting point.', kind: 'text', ask: 'julius' }),
        q({ id: 'spare-cells', text: 'How many spare cells should a build order, and did any of PT1\'s 14 go into the pack?', why: 'A build that runs short stops.', kind: 'text', ask: 'julius' }),
      ],
      shots: ['Every part laid out and labelled, before the build'],
      issues: [25, 17, 18],
      zone: 'sourcing',
    },

    // Make the parts
    {
      id: 'print-holders', phase: 'make', title: 'Print the cell holders',
      goal: 'An upper and a bottom cell holder, printed and cleaned up, with the cells seating properly and the guide rails clear.',
      parts: [{ id: UPPER, qty: 1 }, { id: BOTTOM, qty: 1 }],
      how: [
        { text: 'Print the upper and the bottom cell holder: two print jobs. Then check the fit: the cells seat properly, and the guide rails clear.', source: issue(23, 'Print battery holders') },
        { text: 'In the CAD each holder is 234.6 × 299.8 mm and about 36 mm tall, the upper one 2 mm taller for the bosses on its mating face. Each cell sits in a 21.5 mm seat.', source: at('Holder CAD', BH, 'L1-L12') },
        { text: 'In the PT1 photos the holders print in black on a Bambu Lab printer with a textured PEI plate.', source: S.xPrint },
        { text: 'Each holder weighs 240 g with its inserts.', source: S.weights },
        { text: 'Test-fit a few cells in each holder: firm, but no force needed. A holder that pinches will crack around the cells later.', practice: true },
      ],
      questions: [
        q({ id: 'holder-material', text: 'What material were PT1\'s holders printed in?', why: 'Holders sit against the cells for the life of the pack, so heat and creep matter, and no source names the material.', kind: 'choice', options: ['PETG', 'ASA', 'ABS', 'PLA', 'PA (nylon) or a composite', 'Other (say in the note)'], ask: 'julius' }),
        q({ id: 'holder-settings', text: 'Which print settings: nozzle, layer height, walls, infill, temperatures?', why: 'So the next printer makes the same part. At 240 g for about 393 cm³ they weren\'t printed solid, so the infill matters.', kind: 'text', ask: 'julius' }),
        q({ id: 'holder-orientation', text: 'Which face down, and with what supports?', why: 'Orientation decides where the layer lines run, and so where a holder cracks.', kind: 'text', ask: 'julius' }),
        q({ id: 'holder-print-time', text: 'How long does each holder take to print?', why: 'The longest print sets when cells can go in.', kind: 'number', unit: 'h', ask: 'julius' }),
        q({ id: 'holder-fit', text: 'Did the cells fit straight off the printer, or was the hole size tuned?', why: 'The CAD seat is 21.5 mm; another printer or filament may need a different size.', kind: 'text', when: 'build', perBuild: true }),
      ],
      shots: ['Both holders off the printer', 'A cell seated in a holder, close up'],
      images: [tw('HM-ZM8jXYAAQWKy', 'A PT1 cell holder printing in black on a textured PEI plate', S.xPrint)],
      issues: [23],
      zone: 'cells',
      model: { lit: [UPPER, BOTTOM], adds: [UPPER, BOTTOM] },
    },
    {
      id: 'print-case', phase: 'make', title: 'Print the base and top cover',
      goal: 'The printed base and top cover, checked against the pack.',
      parts: [{ id: BASE, qty: 1 }, { id: COVER, qty: 1 }],
      how: [
        { text: 'Print the top cap and the base of the casing, then check their fit against the pack.', source: issue(24, 'Print top cap and base') },
        { text: 'The base was designed by an outside freelancer, and takes rubber feet bought on Amazon.', source: issue(11, undefined, '4727878106') },
        { text: 'So was the top cover, which integrates the carrying strap and the battery latch.', source: issue(12, undefined, '4969918925') },
        { text: 'The build123d versions are close but not exact: the top cover misses its tower-roof insert bosses and a few rounds, the base its 2 mm drain notch. Julius\'s Fusion originals aren\'t in the repository.', source: at('CAD validation', VAL, 'L25') },
        { text: 'In the PT1 photos the top cover printed in black on a textured PEI plate, with tree supports.', source: S.xPrint },
        { text: 'The weight table has the top cap at 170 g "with inserts" and the base at 60 g.', source: S.weights },
      ],
      questions: [
        q({ id: 'print-files', text: 'Where are the print files for the top cover and the base, from the Fusion originals?', why: 'The build123d versions are approximate, so they aren\'t the ones to print.', kind: 'link', ask: 'julius' }),
        q({ id: 'case-material', text: 'What material and settings were the base and cover printed in?', why: 'The cover carries the strap load; neither the freelancer\'s notes nor any setting is on record.', kind: 'text', ask: 'julius' }),
      ],
      shots: ['Base and top cover off the printer'],
      images: [
        tw('HM-ZQiGXwAAXjSa', 'PT1\'s top cover off the printer, tree supports still on', S.xPrint),
        att('119f2870-c2a8-48ae-9d8d-699eddbb85ce', 'The freelancer\'s base on the pack, with its four rubber feet', issue(11, undefined, '4727878106')),
      ],
      issues: [24, 11, 12],
      zone: 'enclosure',
      model: { lit: [BASE, COVER], adds: [BASE, COVER] },
    },
    {
      id: 'inserts', phase: 'make', title: 'Set the heat-set inserts',
      goal: 'All 71 inserts in the two holders, square and flush.',
      parts: [{ id: INSERT_M3, qty: 67 }, { id: INSERT_M4, qty: 4 }],
      tools: [{ text: 'A soldering iron with a heat-set insert tip', practice: true }],
      how: [
        { text: 'A pack takes 67 M3 (ruthex RX-M3x5.7) and 4 M4 (ruthex RX-M4x8.1) heat-set inserts.', source: at('CAD BOM', BOMMD, 'L78-L79') },
        { text: 'Worked out from the CAD: all 71 sit in the two cell holders, 29 M3 and 2 M4 in the upper, 38 M3 and 2 M4 in the bottom. None go in the base or the top cover.', source: at('placements.json', PLACE, 'L1700') },
        { text: 'The M3s go in 4.0 mm holes; the M4s in 5.6 mm holes, 8.8 mm deep, at the flange ends.', source: at('Holder CAD', BH, 'L102-L147') },
        { text: 'Press each one in square to the surface and stop flush; let it cool before loading the holder.', practice: true },
      ],
      tables: [{
        title: 'What each insert holds (worked out from the CAD)',
        columns: ['Holds', 'M3', 'M4', 'Where'],
        rows: [
          ['Upper holder to bottom holder', '12', '', 'Bottom holder\'s mating face, 6 a side; the screws come in from the top face'],
          ['Top plate', '12', '', 'Upper holder\'s outer face, both long edges'],
          ['Bottom plate', '12', '', 'Bottom holder\'s outer face, both long edges'],
          ['Side sheets, inner web', '12', '', 'Holder side walls, 3 a side on each holder'],
          ['Side sheets, foot tabs', '8', '', 'Base-end face, 4 on each holder'],
          ['Base and feet', '4', '', 'Base-end face corners, 2 on each holder'],
          ['Screw-terminal bars', '4', '', 'Upper holder, connector-end recess'],
          ['Lugs at the connector end', '3', '', '2 on the bottom holder, 1 on the upper (probably the main board\'s mounting)'],
          ['Top cover, through the side sheets', '', '4', 'Holder flange ends at the connector end, 2 on each holder'],
          ['Total', '67', '4', ''],
        ],
        note: 'Nobody has written this down; it comes from the hole and part positions in the CAD.',
        source: at('placements.json', PLACE, 'L1700'),
      }],
      questions: [
        q({ id: 'insert-temp', text: 'What iron temperature sets the inserts cleanly in the holder material?', why: 'Too hot and the plastic flows; too cold and the insert goes in crooked.', kind: 'number', unit: '°C', ask: 'julius' }),
        q({ id: 'insert-screws', text: 'Which screw length suits each insert depth?', why: 'A screw that bottoms out spins its insert; Thomas flagged checking the depth for M3×10.', kind: 'text', ask: 'julius' }),
        q({ id: 'cover-inserts', text: 'Does the top cap take inserts? The weight table says "with inserts", the CAD shows none.', why: 'One of them is wrong, and it changes the insert count.', kind: 'text', ask: 'julius' }),
      ],
      shots: ['A row of set inserts, close up'],
      images: [tw('HQru5x9XMAATzVL', 'PT1\'s holders with the brass inserts set and the sense boards along the edges, before the cells', S.xCells)],
      zone: 'cells',
      model: { lit: HOLDERS, adds: [INSERT_M3, INSERT_M4] },
    },
    {
      id: 'sense-boards', phase: 'make', title: 'Solder the sense boards and lay them on the holders',
      goal: 'Four voltage-sense boards soldered, checked, and lying along the long edges of the holders.',
      parts: VS.map((id) => ({ id, qty: 1 })),
      how: [
        { text: 'Four boards, TL, TR, BL and BR, made as one panel and snapped apart by hand. Each collects three or four cell voltages and a temperature sensor, and plugs into the main board through a JST connector.', source: issue(14) },
        { text: 'Solder all four, then inspect them and check continuity before they go on.', source: issue(21, 'Solder VS PCBs') },
        { text: 'In the CAD the top boards (TL, TR) run along the long edges of the upper holder\'s outer face and the bottom boards (BL, BR) along the bottom holder\'s, each with its JST connector at the connector end.', source: at('CAD BOM', BOMMD, 'L67-L70') },
        { text: 'In the PT1 photos the boards were already lying along the holders\' edges before any cell went in.', source: S.xCells },
        { text: 'Each holder has a 1.6 mm deep wire channel along both flanges.', source: at('Holder CAD', BH, 'L93-L100') },
        { text: 'The documents call the connector 6-pin; the CAD has a 7-pin JST GH (SM7B-GHS-TB).', source: at('CAD BOM', BOMMD, 'L76') },
      ],
      tables: [{
        title: 'Sense taps on each board',
        columns: ['Board', 'Face', 'Taps'],
        rows: [['TL', 'Top', 'C0, C2, C4, C6'], ['TR', 'Top', 'C8, C10, C12, C14'], ['BL', 'Bottom', 'C1, C3, C5, C7'], ['BR', 'Bottom', 'C9, C11, C13']],
        note: 'C0 is the pack negative; Cn is the positive side of group n. As labelled on Julius\'s V1.0 board render.',
        source: issue(14, undefined, '4935605459'),
      }],
      questions: [
        q({ id: 'jst-cables', text: 'Which JST GH cables join the sense boards to the main board: 6 or 7 pins, which pin is which, how long?', why: 'The documents say 6-pin, the CAD 7-pin, and no pinout is on record.', kind: 'text', ask: 'julius' }),
        q({ id: 'vs-mounting', text: 'How are the sense boards fixed to the holders: glue, tape, screws?', why: 'Nothing on record says.', kind: 'text', ask: 'julius' }),
        q({ id: 'sense-files', text: 'Where are the sense boards\' KiCad files?', why: 'Promised on Jul 10 and not in the repository; without them nobody else can make the boards.', kind: 'link', ask: 'julius' }),
      ],
      shots: ['A soldered sense board, both sides', 'The boards lying along a holder\'s edges'],
      images: [att('941be209-be77-4eda-bdbc-cce97891c3fe', 'Julius\'s render of the V1.0 sense-board panel, pads VS_C0 to VS_C14', issue(14, undefined, '4935605459'))],
      issues: [21, 14],
      threads: ['L-11'],
      zone: 'connector',
      model: { lit: SENSED, adds: [...VS, JST] },
    },

    // Cells
    {
      id: 'check-cells', phase: 'cells', title: 'Check every cell',
      goal: 'Every cell measured and recorded, damaged or odd ones set aside.',
      parts: [{ id: CELL, qty: 126 }],
      tools: [{ text: 'A multimeter and an internal-resistance meter', practice: true }],
      how: [
        { text: 'BAK 21700 65E: 6.5 Ah, 3.6 V nominal, 25 A continuous; 72 g each, 9,072 g for all 126.', source: at('PT1 BOM', PT1BOM, 'L7-L21') },
        { text: 'Chosen because it was in stock and close to the best 21700s at the time. In a 10 A discharge comparison of 11 cells to 2.8 V that Julius shared, it delivered the most energy: 20.18 Wh.', source: at('PT1 BOM', PT1BOM, 'L44-L60') },
        { text: 'PT1\'s cells have teal wraps and a printed data-matrix code on the negative end.', source: S.xCells },
        { text: 'Measure every cell\'s voltage and internal resistance before it goes in, and write them down: it\'s the only time each cell can be measured on its own.', practice: true },
        { text: 'Set aside any cell with a dent, a torn wrap or a damaged top insulator.', practice: true },
      ],
      checks: [{ text: 'Every cell has a voltage and a resistance on the sheet; the outliers are out of the build.', practice: true }],
      questions: [
        q({ id: 'cell-voltage-window', text: 'How close in voltage did the cells have to be before welding?', why: 'Cells joined in parallel at different voltages push current into each other the moment they touch.', kind: 'number', unit: 'mV', hint: 'A common target is every cell within a few tens of millivolts of the rest before assembly.', ask: 'julius' }),
        q({ id: 'cell-ir-limit', text: 'What internal resistance did the cells measure, and what reading would reject one?', why: 'A high-resistance cell heats more and fades first, and drags its group with it.', kind: 'text', hint: 'Measured with a 1 kHz AC meter; cells well above the rest of the batch get rejected.', ask: 'julius' }),
        q({ id: 'assembly-soc', text: 'What voltage were the cells at when they went into the pack?', why: 'A pack built full holds the most energy while tools are around it.', kind: 'text', ask: 'julius' }),
        q({ id: 'cell-datasheet', text: 'Link to the BAK 65E datasheet', why: 'Its limits (charge current, temperatures, minimum voltage) set the charging and storage rules.', kind: 'link', ask: 'julius' }),
        q({ id: 'cell-arrival-voltage', text: 'What voltage did the cells arrive at?', why: 'Shipping charge varies by supplier and batch.', kind: 'number', unit: 'V', when: 'build', perBuild: true }),
        q({ id: 'cell-rejects', text: 'How many cells were set aside, and why?', why: 'Tells the next order how many spares to buy.', kind: 'text', when: 'build', perBuild: true }),
      ],
      shots: ['Cells being measured, meter visible', 'The filled-in measurement sheet'],
      issues: [18],
      zone: 'cells',
      model: { lit: [CELL], adds: [CELL] },
    },
    {
      id: 'load-cells', phase: 'cells', title: 'Load the cells into the holders',
      goal: '126 cells upright between the holders in 14 groups of 9, each group the right way up, and the upper holder screwed down.',
      parts: [{ id: CELL, qty: 126 }, { id: BOTTOM, qty: 1 }, { id: UPPER, qty: 1 }],
      how: [
        { text: '14S9P: 14 groups in series, 9 cells in parallel in each, 126 cells placed by hand.', source: S.xCells },
        { text: 'In the CAD the cells sit in a shifted grid: 14 rows of 9 on a 23 mm pitch, every other row offset by half a cell. Each group is two neighbouring rows, one of 5 cells and one of 4.', source: at('Holder CAD', BH, 'L1-L12') },
        { text: 'Worked out from the CAD: the left half holds groups 1 to 7, the right half 8 to 14. Within a half the polarity flips every group, and the series path is a U, out along the left half from the connector end, across on the bottom face at the far end, and back along the right half.', source: at('placements.json', PLACE, 'L24-L33') },
        { text: 'The PT1 photo of the loaded holder shows the same pattern.', source: S.xCells },
        { text: 'Worked out from the CAD: the upper holder closes over the cells and is screwed to the bottom one with 12 screws, 6 a side, into inserts in the bottom holder\'s mating face.', source: at('Holder CAD', UH, 'L53-L61') },
        { text: 'Check every group\'s polarity against the map before the upper holder goes on: it\'s the last moment a reversed cell is easy to fix.', practice: true },
      ],
      tables: [{
        title: 'Group map (worked out from the CAD)',
        columns: ['Group', 'Half', 'Rows', 'Cells', '+ caps face', 'Top-face busbar', 'Bottom-face busbar'],
        rows: [
          ['S1', 'Left', '1–2', '5 + 4', 'Bottom', 'Negative terminal (C0)', 'Bridge S1+/S2− (C1)'],
          ['S2', 'Left', '3–4', '5 + 4', 'Top', 'Bridge S2+/S3− (C2)', 'Bridge S1+/S2−'],
          ['S3', 'Left', '5–6', '5 + 4', 'Bottom', 'Bridge S2+/S3−', 'Bridge S3+/S4− (C3)'],
          ['S4', 'Left', '7–8', '5 + 4', 'Top', 'Bridge S4+/S5− (C4)', 'Bridge S3+/S4−'],
          ['S5', 'Left', '9–10', '5 + 4', 'Bottom', 'Bridge S4+/S5−', 'Bridge S5+/S6− (C5)'],
          ['S6', 'Left', '11–12', '5 + 4', 'Top', 'Bridge S6+/S7− (C6)', 'Bridge S5+/S6−'],
          ['S7', 'Left', '13–14', '5 + 4', 'Bottom', 'Bridge S6+/S7−', 'Crossover S7+/S8− (C7)'],
          ['S8', 'Right', '13–14', '4 + 5', 'Top', 'Bridge S8+/S9− (C8)', 'Crossover S7+/S8−'],
          ['S9', 'Right', '11–12', '4 + 5', 'Bottom', 'Bridge S8+/S9−', 'Bridge S9+/S10− (C9)'],
          ['S10', 'Right', '9–10', '4 + 5', 'Top', 'Bridge S10+/S11− (C10)', 'Bridge S9+/S10−'],
          ['S11', 'Right', '7–8', '4 + 5', 'Bottom', 'Bridge S10+/S11−', 'Bridge S11+/S12− (C11)'],
          ['S12', 'Right', '5–6', '4 + 5', 'Top', 'Bridge S12+/S13− (C12)', 'Bridge S11+/S12−'],
          ['S13', 'Right', '3–4', '4 + 5', 'Bottom', 'Bridge S12+/S13−', 'Bridge S13+/S14− (C13)'],
          ['S14', 'Right', '1–2', '4 + 5', 'Top', 'Positive terminal (C14)', 'Bridge S13+/S14−'],
        ],
        note: 'Rows count from the connector end; "5 + 4" means 5 cells in the row nearer the connector. The top face is the upper holder\'s side. C0 to C14 are the sense taps. Nobody has written this map down: it comes from the cell and busbar positions in the CAD, where every busbar lands on 9 positive and 9 negative ends with no error, and it matches the PT1 photo.',
        source: at('placements.json', PLACE, 'L24-L33'),
      }],
      questions: [
        q({ id: 'cell-layout', text: 'Does the group map match how PT1 was loaded?', why: 'It\'s worked out from the CAD, not written down by whoever built PT1.', kind: 'choice', options: ['Yes', 'No (say where in the note)'], ask: 'julius' }),
        q({ id: 'cell-insulators', text: 'Did PT1 use insulator rings or fish paper on the cells\' positive ends?', why: 'The can shoulder sits right next to the positive cap; a busbar edge touching it is a short. None appears in any BOM.', kind: 'choice', options: ['Insulator rings', 'Fish paper sheet', 'Both', 'Neither'], ask: 'julius' }),
        q({ id: 'cell-glue', text: 'Are the cells glued in the holders, or held by the fit alone?', why: 'It changes how a bad cell comes out later.', kind: 'choice', options: ['Fit only', 'Glued (say which glue)', 'Other (say how)'], ask: 'julius' }),
      ],
      shots: ['The bottom holder fully loaded, from above, each group\'s polarity marked', 'The upper holder screwed down'],
      images: [tw('HQru-nVXEAEgveM', 'PT1\'s 126 cells in the holder before the busbars: two-row bands, the polarity swapping band to band', S.xCells)],
      zone: 'cells',
      model: { lit: LOADED, adds: [CELL] },
    },

    // Busbars and welding
    {
      id: 'busbars', phase: 'weld', title: 'Prepare the busbars',
      goal: 'Seventeen busbars, walls folded, checked against the drawings, ready to weld.',
      parts: [{ id: BRIDGE, qty: 12 }, { id: CROSS, qty: 1 }, { id: BUS_N, qty: 1 }, { id: BUS_P, qty: 1 }, { id: TERM_N, qty: 1 }, { id: TERM_P, qty: 1 }],
      how: [
        { text: 'A pack takes a negative and a positive terminal, 12 series bridges, one crossover bridge between the halves and two screw-terminal bars.', source: at('Copper order', CU, 'L36-L45') },
        { text: 'They\'re cut from Julius\'s locked DXF set; the files and their checksums are in the PT1 build folder, and changes go in a new build folder, not into these files.', source: at('PT1 build notes', PT1N, 'L11-L15') },
        { text: 'The bridges are ordered laser-cut flat. The same flat part, turned 180°, fits the top and the bottom of the pack, and the tongues bend over the cells during spot welding.', source: S.julius },
        { text: 'The terminals and the crossover come with their walls cut flat: fold the terminals\' 15 mm walls and the crossover\'s 20 mm wall down 90° after cutting.', source: at('Busbar CAD', NT, 'L1-L33') },
        { text: 'Check the laser cutter\'s preview: the DXFs store their circles with a flipped extrusion, and software that ignores it puts the holes outside the part.', source: at('Busbar DXFs', CU, 'L7-L14') },
        { text: 'Every 0.2 mm busbar has a small ear at one end. Worked out from the CAD, each ear lands on a sense-board pad, which makes it the sense tap.', source: at('Bridge CAD', BR1, 'L58-L59') },
        { text: 'The docs and the CAD call the 0.2 mm parts copper; Supro\'s quotation says brass H62 (copper C101 only for the 6 mm bars), and in the PT1 photos the welded busbars look yellow, like brass.', source: at('Copper order', CU, 'L22-L29') },
        { text: 'The 6 mm bars need countersunk mounting holes and four 2.5 mm holes, probably tapped M3; a flat DXF carries neither.', source: at('Terminal bar CAD', T5, 'L1-L37') },
      ],
      tables: [{
        title: 'The busbar kit',
        columns: ['Part', 'A pack', 'Flat blank', 'Quoted metal'],
        rows: [
          ['Negative terminal', '1', '116.6 × 67.3 mm, 0.2 mm', 'Brass H62'],
          ['Positive terminal', '1', '116.6 × 67.3 mm, 0.2 mm', 'Brass H62'],
          ['Series bridge', '12', '116.6 × 77.3 mm, 0.2 mm', 'Brass H62'],
          ['Crossover bridge', '1', '217.7 × 63.3 mm, 0.2 mm', 'Brass H62'],
          ['Screw-terminal bar, negative', '1', '101.1 × 14.6 mm, 6 mm', 'Copper C101'],
          ['Screw-terminal bar, positive', '1', '89.6 × 14.6 mm, 6 mm', 'Copper C101'],
        ],
        note: 'Blank sizes are measured from the locked DXFs; metals are as quoted. The docs and the CAD say copper for the 0.2 mm parts.',
        source: at('Copper order', CU, 'L7-L29'),
      }],
      questions: [
        q({ id: 'busbar-metal', text: 'What metal are the 0.2 mm busbars, as delivered?', why: 'The quote says brass, the docs copper, and the photos look like brass. They weld differently, and the next order copies the BOM.', kind: 'choice', options: ['Brass H62', 'Copper', 'Nickel-plated copper', 'Not sure'], ask: 'julius' }),
        q({ id: 'wall-folding', text: 'How were the terminal and crossover walls folded: what tool, and before or after placing them?', why: 'The blanks come flat and the walls have to be bent 90°.', kind: 'text', ask: 'julius' }),
        q({ id: 'terminal-bar-machining', text: 'Who countersinks the 6 mm bars and taps their holes, and to what thread?', why: 'Neither is in the flat DXF the supplier cuts from.', kind: 'text', ask: 'julius' }),
        q({ id: 'busbar-prep', text: 'Do the busbars need cleaning or flattening before welding?', why: 'Laser-cut sheet can arrive with burrs, oxide or a curl.', kind: 'text', ask: 'julius' }),
      ],
      shots: ['One of each busbar laid out flat beside a ruler', 'The laser software\'s preview with the holes inside the parts', 'The material marking on the delivered busbars, or the packing slip'],
      images: [
        tw('HM-X7U5W4AAQTA1', 'The cell stack with its busbars in Fusion: the crossover\'s folded wall along the near end', S.xDesign),
        repo('engineering/cad/build123d/docs/preview-open.png', 'The build123d model with the covers off: busbars and weld tongues over the cells'),
      ],
      threads: ['L-13'],
      zone: 'busbars',
      model: { lit: BUSBARS, adds: BUSBARS },
    },
    {
      id: 'weld', phase: 'weld', title: 'Weld the busbars',
      goal: 'Every cell is welded at both ends, and every weld holds when tugged.',
      parts: [{ id: BRIDGE, qty: 12 }, { id: CROSS, qty: 1 }, { id: BUS_N, qty: 1 }, { id: BUS_P, qty: 1 }],
      tools: [{ text: 'A spot welder that welds the busbar metal to the cells cleanly, and spare cells for test welds', practice: true }],
      how: [
        { text: 'The pack is designed to be spot welded, with weld access from both sides.', source: S.proposal },
        { text: 'Lay each bridge flat over its two groups; its tongues bend down onto the cells as they\'re welded.', source: S.julius },
        { text: 'In the CAD every cell end gets two 4 mm tongues that reach just past the centre of its terminal: 504 tongues a pack.', source: at('Bridge CAD', BR1, 'L45-L75') },
        { text: 'In the PT1 photos each tongue carries about two to four weld marks, mostly in pairs.', source: S.xBoard },
        { text: 'Weld test strips onto a spare cell first and peel them off: a good weld tears metal out of the strip rather than popping off clean.', practice: true },
        { text: 'Move around the pack rather than welding one spot after another on the same cell, so no cell heats up.', practice: true },
      ],
      checks: [{ text: 'A gentle tug on each tongue doesn\'t lift it, and no weld has burned through.', practice: true }],
      safety: [{ text: 'From the first weld the groups are joined: tools across two busbars now short real energy. Cover finished busbars and keep tools off them.', practice: true }],
      questions: [
        q({ id: 'welder', text: 'Which spot welder and electrodes welded PT1?', why: 'Brass and copper take far more welder than nickel strip; not every hobby welder can do it.', kind: 'text', ask: 'julius' }),
        q({ id: 'weld-setting', text: 'What setting (energy, or pulse time) welds the busbars to the BAK 65E?', why: 'The one number the weld step can\'t be done without.', kind: 'text', hint: 'Capacitor-discharge welders set energy in joules; transformer welders set pulse time in milliseconds.', ask: 'julius' }),
        q({ id: 'weld-spots', text: 'How many weld spots per tongue?', why: 'The PT1 photos show two to four marks a tongue; the guide needs the intended number.', kind: 'number', unit: 'spots', ask: 'julius' }),
        q({ id: 'weld-joggle', text: 'How does each tongue get its 1 mm joggle: the electrode pressing it down, or a forming tool first?', why: 'The CAD shows the bend; nothing says how it\'s made.', kind: 'text', ask: 'julius' }),
        q({ id: 'weld-order', text: 'In what order were the busbars welded?', why: 'The order decides when the pack first becomes live and where the voltage sits while you work.', kind: 'text', ask: 'julius' }),
        q({ id: 'weld-test', text: 'How was a good weld told from a bad one on PT1?', why: 'Brass H62 welds differently from nickel strip; the guide needs a pass or fail test.', kind: 'text', ask: 'julius' }),
        q({ id: 'weld-time', text: 'How long did welding take?', why: 'For planning the next build day.', kind: 'number', unit: 'h', when: 'build', perBuild: true }),
      ],
      shots: ['A peeled test weld', 'The welder\'s settings', 'The finished top side', 'The finished bottom side', 'Welds on one cell, close up'],
      images: [tw('HQrx-51XoAAYwaP', 'PT1\'s bottom face: welded yellow busbars under the clear plate, tongues bent into the cells, weld marks on each', S.xBoard)],
      threads: ['L-13'],
      zone: 'busbars',
      model: { lit: WELDED, adds: BUSBARS },
    },
    {
      id: 'sense-taps', phase: 'weld', title: 'Solder the sense taps and temperature sensors',
      goal: 'Fifteen sense taps soldered to their pads, four temperature sensors on their cells, and every tap reads its group.',
      how: [
        { text: 'The cell voltages reach the sense boards through soldered copper bridges. The pinout and the pad positions must be right.', source: issue(14) },
        { text: 'In the PT1 photo of the bottom face, a busbar\'s ear lies on the pad marked VS_C11.', source: S.xBoard },
        { text: 'Four temperature sensors, one on each board: soldered on with small wires and glued on top of some cells. Their pads sit near the middle of each board.', source: issue(14) },
        { text: 'Then measure from C0 to each tap in turn: every reading should be one group higher than the last.', practice: true },
      ],
      questions: [
        q({ id: 'sense-ear', text: 'Is each busbar\'s ear the sense tap, soldered straight to its pad? With what solder and flux?', why: 'Worked out from the CAD and one photo, not written down.', kind: 'text', ask: 'julius' }),
        q({ id: 'temp-sensor', text: 'Which temperature sensors (part, NTC value), on which cells, and with what glue?', why: 'Four sensors, one a board; where they touch the pack decides what they can see.', kind: 'text', ask: 'julius' }),
      ],
      shots: ['A soldered tap, close up', 'A temperature sensor glued in place'],
      images: [repo(`${WP}/issue-14-voltage-sense-board-reference.jpg`, 'The top face with the plate off: busbar tabs onto the sense boards, labelled C1−, C2+ … C14+')],
      issues: [14],
      zone: 'connector',
      model: { lit: WELDED, adds: VS },
    },

    // Main board and power path
    {
      id: 'sl-board', phase: 'board', title: 'Solder the SL board',
      goal: 'The main board with its fuse terminals, connector, sense fuses and balance header, inspected.',
      parts: [{ id: SL, qty: 1 }, { id: ET60S, qty: 1 }, { id: FUSE, qty: 1 }, { id: SMD_FUSE, qty: 15 }, { id: BALANCE, qty: 1 }],
      how: [
        { text: 'Solder the SL board, then inspect it and check continuity before it goes in.', source: issue(22, 'Solder SL PCB') },
        { text: 'It routes the cells\' power through the main fuse to the ET60S connector, and collects the four sense boards\' lines on a header for the TA3200 charger\'s balance cable.', source: at('SL_PCB README', SLR, 'L5-L11') },
        { text: 'The V1 board carries 15 SMD fuses, one on each sense line; four JST connectors; a 2 × 8 Molex 43045-1612 balance header; CAN pads beside the connector; jumpers JP1 to JP9; and two threaded terminals for the main fuse. On the back: the ET60S and the positive and negative battery contact pads, four holes each.', source: S.xBoard },
        { text: 'The main fuse is an AMXL-200; the AMX-150 the README names also fits.', source: S.julius },
        { text: 'Keep the power path and the sense routing apart, with clear creepage and clearance between them.', source: at('SL_PCB README', SLR, 'L34') },
      ],
      tables: [{
        title: 'Main connector (ET60S) pins',
        columns: ['Pins', 'Net'],
        rows: [['P01–P05', 'Battery −'], ['P06', 'CAN L'], ['P07', 'CAN H'], ['P08–P12', 'Battery +']],
        note: 'From the board\'s KiCad layout in the repository, the only pin data on record. Nothing drives the CAN pins until there\'s a BMS.',
        source: at('SL_PCB KiCad', KICAD),
      }],
      questions: [
        q({ id: 'sl-files', text: 'Where are the SL board\'s V1 KiCad files?', why: 'Promised on Jul 14; the repository still holds the May basic layout.', kind: 'link', ask: 'julius' }),
        q({ id: 'fuse-part', text: 'Which exact AMXL-200 (maker and part number), what bolts and how tight, and which fuse does PT1 run?', why: 'The fuse is the pack\'s only protection.', kind: 'text', ask: 'julius' }),
        q({ id: 'sense-fuse-rating', text: 'What rating are the 15 sense-line fuses?', why: 'Not on record; the replacement has to match.', kind: 'text', ask: 'julius' }),
        q({ id: 'jumpers', text: 'What do jumpers JP1 to JP9 do, and how are they set?', why: 'They\'re on the board and nowhere in the documents.', kind: 'text', ask: 'julius' }),
        q({ id: 'sl-solder-notes', text: 'Anything tricky about soldering it: the ET60S, the heavy pads, the order?', why: 'The heavy connector and pads need more heat than the rest of the board.', kind: 'text', ask: 'julius' }),
      ],
      shots: ['The soldered SL board, both sides'],
      images: [
        tw('HQrx_u6XkAAqI_V', 'PT1\'s SL board: fuse terminals, the 15 sense fuses, four JST connectors and the balance header', S.xBoard),
        tw('HQryAaUXkAA3s8H', 'Its back: the ET60S and the two battery contact pads', S.xBoard),
      ],
      issues: [22, 16],
      threads: ['L-11'],
      zone: 'connector',
      model: { lit: BOARDED, adds: BOARD },
    },
    {
      id: 'balance-map', phase: 'board', title: 'Check the balance pins',
      goal: 'Every balance pin reads its group, in order, on a meter, before anything is plugged into a charger.',
      how: [
        { text: 'The sense pin mapping must be correct before the board is connected to a charger.', source: at('SL_PCB README', SLR, 'L76') },
        { text: 'The TA3200 has a balance port and a separate orange main charge port. Verify the connector series, pin pitch, pin numbers and polarity from the actual charger and cable, not from pictures.', source: at('SL_PCB README', SLR, 'L66-L72') },
        { text: 'Still open in the README: the complete map from the four JST inputs to the TA3200 balance connector, and the final sense-line order from each board.', source: at('SL_PCB README', SLR, 'L102-L108') },
        { text: 'In the CAD the balance header sits behind an opening in the top cover\'s end plate, so the lead plugs in from outside.', source: at('Top cover CAD', TC, 'L545-L561') },
        { text: 'Measure from the pack\'s negative to each balance pin in turn.', practice: true },
      ],
      checks: [{ text: 'Each reading is about one cell\'s voltage above the last, up to the full pack voltage.', practice: true }],
      safety: [
        { text: 'Don\'t take the pin map from pictures; measure it.', source: at('SL_PCB README', SLR, 'L66-L72') },
        { text: 'A wrong pin map can put the whole pack\'s voltage across a charger\'s balance input.', practice: true },
      ],
      questions: [
        q({ id: 'balance-pinmap', text: 'What is the full map from the sense taps to the pins of the TA3200\'s balance cable?', why: 'It isn\'t on record, and it\'s the one wiring mistake that can take out a charger or a cell.', kind: 'text', ask: 'julius' }),
        q({ id: 'balance-connector', text: 'Does the TA3200 balance cable plug straight into the Molex 43045-1612 header?', why: 'The README leaves the balance connector open.', kind: 'choice', options: ['Yes', 'With an adapter (say which)', 'Not sure'], ask: 'julius' }),
        q({ id: 'balance-readings', text: 'What did each balance pin read on this pack?', why: 'The first record of the pack\'s groups, before any charge.', kind: 'text', when: 'build', perBuild: true }),
      ],
      shots: ['The balance header with each pin labelled', 'The meter on a balance pin'],
      images: [
        repo('engineering/electronics/pcbs/SL_PCB/images/ta3200-balancing-cable-reference.jpg', 'The TA3200\'s balance cable'),
        repo('engineering/electronics/pcbs/SL_PCB/images/ta3200-side-view-connector-reference.jpg', 'The TA3200\'s side panel: balance port and orange charge port'),
      ],
      threads: ['L-11'],
      zone: 'connector',
    },
    {
      id: 'power-path', phase: 'board', title: 'Connect the power path and fit the fuse',
      goal: 'The board\'s battery contacts clamped to the terminal walls and the 6 mm bars, and the fuse in last.',
      parts: [{ id: TERM_N, qty: 1 }, { id: TERM_P, qty: 1 }],
      how: [
        { text: 'Worked out from the CAD: at the connector end the board\'s contact pad, the terminal busbar\'s folded wall and the 6 mm screw-terminal bar are clamped together, four screws a side, from the board into the bar. There\'s no power wire.', source: at('Upper holder CAD', UH, 'L63-L71') },
        { text: 'The 6 mm bars sit in two recesses in the upper holder\'s connector-end face, each held by two countersunk screws into M3 inserts.', source: at('Upper holder CAD', UH, 'L63-L71') },
        { text: 'The README asks for the fuse to stay accessible; in the CAD it sits inside the top cover.', source: at('SL_PCB README', SLR, 'L23-L31') },
        { text: 'Fit the fuse last, once the balance pins check out: from then on the connector is live.', practice: true },
      ],
      questions: [
        q({ id: 'terminal-screws', text: 'Which screws clamp the board, the terminal walls and the bars together, how tight, and with any contact compound?', why: 'This joint carries the whole pack current; a loose one heats up under load.', kind: 'text', ask: 'julius' }),
      ],
      shots: ['Both terminal joints, before the cover goes on'],
      images: [att('598a7b20-4b2d-43d3-bad6-7fd478ab27af', 'The back of the SL board in Julius\'s render: the positive and negative battery contact pads', issue(16, undefined, '4969880852'))],
      zone: 'connector',
      model: { lit: POWERED, adds: [TERM_N, TERM_P] },
    },

    // Enclosure
    {
      id: 'enclose', phase: 'enclose', title: 'Close the enclosure',
      goal: 'Plates, side sheets, base and cover screwed up around the pack, and nothing live touching the aluminium.',
      parts: [{ id: BOTTOM_PLATE, qty: 1 }, { id: TOP_PLATE, qty: 1 }, { id: SHEET_L, qty: 1 }, { id: SHEET_R, qty: 1 }, { id: BASE, qty: 1 }, { id: COVER, qty: 1 }],
      how: [
        { text: 'Two 3 mm plates, 234.6 × 285.6 mm, each held by 12 countersunk screws along its long edges.', source: at('Plate CAD', TP, 'L1-L27') },
        { text: 'PT1\'s plates are acrylic: the weight table says so, and so do the build photos and the call notes. The CAD BOM\'s polycarbonate comes only from the part number.', source: S.weights },
        { text: 'Two bent 1 mm aluminium side sheets, left and right: one blank with different hole patterns, not mirror images. Worked out from the CAD, they screw to the holders\' side walls and the base-end face, and their tongues at the connector end take the top cover.', source: at('Side sheet CAD', SH, 'L1-L73') },
        { text: 'The side sheets can come off and be replaced by printed parts if the pack doesn\'t slide into the bay.', source: S.sep22 },
        { text: 'The base mounts with four M3 screws.', source: issue(11) },
        { text: 'The top cover mounts with four M4 into the holders and four M3 through the side sheets.', source: issue(12) },
        { text: 'The proposal\'s target is 220 × 330 × 90 mm inside, at most 11.5 kg, IP54. No seal, gasket or IP test is on record.', source: S.proposal },
        { text: 'Line the side sheets so no busbar edge or tap can reach the aluminium.', practice: true },
      ],
      checks: [{ text: 'No continuity from either terminal to the aluminium sheets.', practice: true }],
      tables: [{
        title: 'Screws the CAD implies',
        columns: ['Where', 'Count', 'Kind'],
        rows: [
          ['Upper holder to bottom holder', '12', 'M3 into inserts'],
          ['Top and bottom plates', '24', 'M3 countersunk into inserts'],
          ['Side sheets, inner web', '12', 'M3 into inserts'],
          ['Side sheets, foot tabs', '8', 'M3 into inserts'],
          ['Base and feet', '4', 'M3 into inserts'],
          ['Screw-terminal bars', '4', 'M3 countersunk into inserts'],
          ['Lugs at the connector end', '3', 'M3 into inserts'],
          ['Top cover, through the side sheets', '4', 'M4 into inserts'],
          ['Top cover end walls and sheet tongues', '4', 'Through holes; what they screw into isn\'t known'],
          ['SL board and terminal walls into the 6 mm bars', '8', 'Probably M3'],
        ],
        note: 'Counted from the holes in the CAD. Lengths and head types can\'t be worked out from it, and the strap, clip and latch fasteners aren\'t counted. A starting point for the screw list #25 asks for.',
        source: at('placements.json', PLACE, 'L1700'),
      }],
      questions: [
        q({ id: 'plate-material', text: 'PT1\'s plates are acrylic. Keep acrylic, or change to polycarbonate?', why: 'The CAD part number says polycarbonate; acrylic cracks where polycarbonate bends.', kind: 'choice', options: ['Keep acrylic', 'Polycarbonate', 'Other (say which)'], ask: 'julius' }),
        q({ id: 'assembly-order', text: 'In what order do the plates, side sheets, base and cover go on?', why: 'Never written down; the CAD only shows the result.', kind: 'text', ask: 'julius' }),
        q({ id: 'insert-torque', text: 'How tight do screws into the printed inserts go?', why: 'Too tight pulls an insert out of the print.', kind: 'number', unit: 'N·m', ask: 'julius' }),
        q({ id: 'cover-nuts', text: 'What do the four M3 through the cover\'s end walls and the sheet tongues screw into: the square-nut traps?', why: 'The CAD has the holes and nut pockets, but no hardware.', kind: 'text', ask: 'julius' }),
        q({ id: 'case-insulation', text: 'What insulates the cells and busbars from the aluminium sheets?', why: 'The sheets are conductive and sit beside live busbars, and no insulation appears in any BOM.', kind: 'text', hint: 'Fish paper or Kapton between the cell block and any metal is common.', ask: 'julius' }),
        q({ id: 'case-sealing', text: 'How is IP54 met: gaskets, sealant, or not yet?', why: 'The proposal sets IP54; nothing on record says how.', kind: 'text', ask: 'julius' }),
      ],
      shots: ['The pack in the base before the cover goes on', 'The closed pack, from every side'],
      images: [
        tw('HQru9kBXwAA4n5o', 'A PT1 test assembly: both holders with the clear top plate screwed along the edges', S.xCells),
        repo('engineering/cad/build123d/docs/preview.png', 'The build123d model, closed: top cover with strap and clip, top plate, side sheets'),
        repo(`${WP}/issue-12-current-top-cover-area.jpg`, 'The connector end, marked with the top cover\'s 4 holder and 4 sheet-metal mounting points'),
      ],
      issues: [25],
      threads: ['L-13'],
      zone: 'enclosure',
      model: { lit: ENCLOSED, adds: CASE },
    },
    {
      id: 'mount', phase: 'enclose', title: 'Fit the strap, latch and feet',
      goal: 'The pack carries on its strap, locks into the bay with the Tattu clip, and stands on its feet.',
      parts: [{ id: CLIP, qty: 1 }, ...STRAP.map((id) => ({ id, qty: id.endsWith('Metal_End') ? 2 : 1 }))],
      how: [
        { text: 'The carrying strap: a rubber handle with two metal end caps, 73 g.', source: S.weights },
        { text: 'The latch is a Tattu 4.0 30 Ah clip, so Longshot locks into Quiver\'s bay the way the Tattu does. No fit check against Quiver\'s slider and connector board is recorded.', source: src('PR #27', `${LS}/pull/27`) },
        { text: 'Four rubber feet bought on Amazon, 22 × 22 mm and 9 mm tall, with a moulded washer; the CAD models printed feet instead.', source: issue(11, undefined, '4727878106') },
      ],
      questions: [
        q({ id: 'feet-part', text: 'Link to the rubber feet', why: 'They\'re in the weight table but not the BOM.', kind: 'link', ask: 'julius' }),
        q({ id: 'strap-source', text: 'Where do the strap and the Tattu clip come from?', why: 'Bought-in parts with no source on record.', kind: 'text', ask: 'julius' }),
        q({ id: 'bay-fit', text: 'Does the pack slide into Quiver\'s bay, lock, and mate with the connector board?', why: 'No fit check is recorded, and the connectors differ: the ET60S against Quiver\'s two Molex.', kind: 'text', when: 'build', perBuild: true }),
      ],
      shots: ['Strap and clip fitted', 'The pack locked into Quiver\'s bay'],
      images: [
        tw('HM-ZTiiW4AAnNY1', 'PT1\'s printed top cover with the strap fitted', S.xPrint),
        att('f0724025-5090-41e8-9a70-f17848e33cc1', 'The strap parts: rubber handle and two metal end caps', issue(20, undefined, '4727847809')),
      ],
      threads: ['Q-18'],
      zone: 'mounting',
      model: { lit: DONE, adds: [...STRAP, CLIP] },
    },

    // Test and record
    {
      id: 'weigh', phase: 'test', title: 'Weigh it and finish the weight table',
      goal: 'The pack\'s weight recorded, and every gram accounted for.',
      how: [
        { text: 'PT1 weighed 11.2 kg complete on Aug 29, about 200 g under the Tattu it replaces.', source: S.weights },
        { text: 'About 364 g isn\'t itemized yet: the main fuse, wiring, screws, temperature sensors, the spring clip and the four rubber feet.', source: S.weights },
      ],
      tables: [{
        title: 'PT1 weight table',
        columns: ['Item', 'Each', 'Qty', 'Total'],
        rows: [
          ['Cell, BAK 65E', '72 g', '126', '9,072 g'],
          ['Top acrylic plate', '250 g', '1', '250 g'],
          ['Bottom acrylic plate', '250 g', '1', '250 g'],
          ['Upper cell holder, with inserts', '240 g', '1', '240 g'],
          ['Bottom cell holder, with inserts', '240 g', '1', '240 g'],
          ['Top cap, with inserts', '170 g', '1', '170 g'],
          ['SL board, with connector, without fuse', '153 g', '1', '153 g'],
          ['Aluminium side piece', '71 g', '2', '142 g'],
          ['Series bridge busbar', '10 g', '12', '120 g'],
          ['Carrying strap with brackets', '73 g', '1', '73 g'],
          ['Base (bottom foot print)', '60 g', '1', '60 g'],
          ['Voltage-sense board', '5 g', '4', '20 g'],
          ['Crossover busbar', '19 g', '1', '19 g'],
          ['Connector plate print', '9 g', '1', '9 g'],
          ['Negative terminal busbar', '9 g', '1', '9 g'],
          ['Positive terminal busbar', '9 g', '1', '9 g'],
          ['Itemized', '', '', '10,836 g'],
          ['Complete pack', '', '', '11,200 g'],
        ],
        note: 'Measured by Julius, kept by Vector. Only one of the four sense boards was weighed, and the 6 mm bars aren\'t in the table. The "connector plate print" matches no part in the CAD.',
        source: S.weights,
      }],
      questions: [
        q({ id: 'pack-weight', text: 'What does the finished pack weigh?', why: 'Weight decides Quiver\'s payload.', kind: 'number', unit: 'kg', when: 'build', perBuild: true }),
        q({ id: 'weight-items', text: 'What do the fuse, wiring, screws, sensors, clip and feet each weigh?', why: 'Closes the 364 g gap in #26.', kind: 'text', when: 'build', perBuild: true }),
        q({ id: 'fuse-in-weight', text: 'Does PT1\'s 11.2 kg include the main fuse?', why: 'The SL board was weighed without it.', kind: 'choice', options: ['Yes', 'No', 'Not sure'], ask: 'julius' }),
      ],
      shots: ['The pack on the scale, reading visible'],
      issues: [26],
      threads: ['L-9'],
      zone: 'builds',
    },
    {
      id: 'first-checks', phase: 'test', title: 'Check it before the first charge',
      goal: 'Pack voltage, every group and the insulation checked, and nothing odd.',
      how: [
        { text: 'The only checks on record are a visual inspection and a continuity check of each board before it goes in, and fit checks of the printed parts.', source: issue(21) },
        { text: 'Quiver\'s side connects spark-free through a pre-charge circuit. The pack has no switch or pre-charge of its own, so a bench load needs its own.', source: S.handbook('L99-L110') },
        { text: 'Measure the pack voltage at the ET60S and each group through the balance header.', practice: true },
        { text: 'Check there\'s no continuity from either terminal to the case\'s metal.', practice: true },
      ],
      questions: [
        q({ id: 'acceptance', text: 'What spread between groups, or what reading, would fail a pack?', why: 'There are no acceptance criteria on record.', kind: 'text', ask: 'julius' }),
        q({ id: 'pack-voltage', text: 'What did the finished pack read?', why: 'The starting point for its first charge.', kind: 'number', unit: 'V', when: 'build', perBuild: true }),
        q({ id: 'group-spread', text: 'How far apart were the highest and lowest groups?', why: 'A big spread before the first charge points at a bad cell or tap.', kind: 'number', unit: 'mV', when: 'build', perBuild: true }),
      ],
      zone: 'testing',
    },
    {
      id: 'first-charge', phase: 'test', title: 'Charge it the first time',
      goal: 'The pack charged to 58.8 V on a Li-ion profile, with someone watching it.',
      how: [
        { text: 'The plan for this dummy board: the main connector carries charge and discharge, and the balance lead goes to the Tattu charger Quiver uses.', source: S.sep22 },
        { text: 'The README instead describes a separate exposed charge connector for the TA3200\'s charge cable; the CAD board has none.', source: at('SL_PCB README', SLR, 'L23-L31') },
        { text: 'Longshot is standard Li-ion, full at 58.8 V (4.2 V a cell). The Tattu 4.0 is LiHV, full at 60.9 V (4.35 V a cell).', source: S.weights },
        { text: 'The TA3200 comes in three versions: standard (4.2 V a cell), HV and UHV. Only the standard one suits Longshot.', source: S.tattu },
        { text: 'Quiver\'s handbook calls for a 14S LiHV charger; that\'s written for the Tattu and doesn\'t carry over.', source: S.handbook('L120') },
        { text: 'Charge on a dry, fire-resistant surface such as concrete, and let a warm pack cool 15 to 30 minutes first, as Quiver\'s handbook asks for the Tattu.', source: S.handbook('L126-L129') },
        { text: 'Stay with the pack for its first charge; check the temperature readings and feel the case.', practice: true },
      ],
      safety: [{ text: 'Never the LiHV profile: charging to 60.9 V overcharges every cell, and there is no BMS to stop it.', source: S.weights }],
      questions: [
        q({ id: 'charge-path', text: 'How does the charge current reach PT1: through the ET60S with an adapter, or a separate port?', why: 'The README and the call notes disagree, and the CAD board has no separate port.', kind: 'text', ask: 'julius' }),
        q({ id: 'charger-version', text: 'Which TA3200 version does Arrow have?', why: 'Only the standard 4.2 V one suits Longshot, and which one Arrow owns isn\'t recorded.', kind: 'choice', options: ['TA3200 (standard, 4.2 V a cell)', 'TA3200HV (4.35 V)', 'TA3200UHV (4.45 V)', 'Not sure'], ask: 'julius' }),
        q({ id: 'charge-current', text: 'What charge current is right for a first charge?', why: 'The guide needs a number, not "carefully".', kind: 'number', unit: 'A', ask: 'julius' }),
        q({ id: 'charge-result', text: 'How long did the first charge take, and how warm did the pack get?', why: 'The first record of how the pack behaves.', kind: 'text', when: 'build', perBuild: true }),
      ],
      images: [repo('engineering/electronics/pcbs/SL_PCB/images/ta3200-side-view-connector-reference.jpg', 'The TA3200\'s balance port and orange charge port')],
      threads: ['L-3', 'L-10'],
      zone: 'charging',
    },
    {
      id: 'capacity', phase: 'test', title: 'Measure what it holds, then fly it',
      goal: 'The pack\'s capacity measured on the bench, and a flight logged against the Tattu.',
      how: [
        { text: 'The README and the proposal say 2,200 to 2,300 Wh; the weight table works out 2,540 Wh usable from the cell test (126 × 20.18 Wh) and about 2,950 Wh nameplate. None of it is measured.', source: S.weights },
        { text: 'Phase 1 asks for the prototype bench tested, flight tested on Quiver, and a flight-test report.', source: S.proposal },
        { text: 'In the air Quiver gets no battery data from a pack without a BMS, so its BMS-count failsafes can\'t act. The draft Pilot\'s Handbook falls back on voltage: return at 46.2 V, land in place at 44.8 V.', source: src('Quiver PR #274', HANDBOOK_DRAFT) },
        { text: 'A bench discharge at a known current down to a safe cut-off gives the real capacity, and its curve shows the weakest group.', practice: true },
      ],
      questions: [
        q({ id: 'capacity-measured', text: 'What capacity did the pack measure on the bench?', why: 'Replaces the worked-out figures with a measurement.', kind: 'number', unit: 'Wh', when: 'build', perBuild: true }),
        q({ id: 'discharge-setup', text: 'How was it discharged: load, current, cut-off voltage?', why: 'So the next pack is measured the same way.', kind: 'text', when: 'build' }),
        q({ id: 'flight-log', text: 'Link to the flight log', why: 'The log Julius had on Sep 29 is the evidence the report needs.', kind: 'link', ask: 'julius', perBuild: true }),
      ],
      threads: ['L-4'],
      zone: 'testing',
    },

    // Label, store and ship
    {
      id: 'label', phase: 'finish', title: 'Label the pack and record it',
      goal: 'The pack carries a label that says what it is, and its build record is complete.',
      how: [
        { text: 'Label every pack: a serial number, Li-ion, nominal and full voltage, capacity and watt-hours, and that it has no BMS.', practice: true },
        { text: 'Export this guide with its answers (the button at the top): it\'s the build record.', practice: true },
      ],
      questions: [
        q({ id: 'serial-scheme', text: 'How are packs numbered?', why: 'So a pack, its build record and its flight logs can be matched.', kind: 'text', ask: 'thomas' }),
      ],
      shots: ['The label on the finished pack'],
      zone: 'builds',
    },
    {
      id: 'store-ship', phase: 'finish', title: 'Store and ship it',
      goal: 'The pack is stored part-charged somewhere safe, and there\'s a plan for moving it.',
      how: [
        { text: 'For the Tattu, Quiver\'s handbook says: store at 3.80 V a cell if unused for 14 days, and a battery dropped from more than 50 cm is unsafe to fly.', source: S.handbook('L131-L135') },
        { text: 'Cells travel as hazardous goods: PT1\'s cell order paid for hazardous-goods shipping and insurance.', source: at('PT1 BOM', PT1BOM, 'L7-L21') },
        { text: 'Store packs part-charged, cool and dry, in a fire-safe place.', practice: true },
        { text: 'A pack this size ships as Class 9 dangerous goods; carriers usually want a UN38.3 test summary, or the rules for prototypes and small production runs.', practice: true },
      ],
      questions: [
        q({ id: 'storage-voltage', text: 'What voltage should a Longshot pack be stored at?', why: 'Full packs age fastest; the handbook\'s 3.80 V is for the Tattu\'s LiHV cells.', kind: 'number', unit: 'V', hint: 'Around 3.6 to 3.8 V a cell is common for Li-ion storage: about 50 to 53 V for 14S.', ask: 'julius' }),
        q({ id: 'ship-plan', text: 'How will finished packs ship to whoever flies them?', why: 'Moving a finished pack is a dangerous-goods question that needs an answer before the first one leaves.', kind: 'text', ask: 'thomas' }),
      ],
      zone: 'safety',
    },
  ],
};
