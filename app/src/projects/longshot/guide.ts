// How to build a Longshot pack: PT1, step by step, from the record. Every
// line says where it comes from (the repository, its issues, the PT1 BOM and
// build notes, the call notes); lines marked `practice` are common practice
// for spot-welded 21700 packs, not Longshot's spec. What the record doesn't
// say is asked as a question in the step that needs it, for whoever knows
// (mostly Julius) to answer in the app, or for the next build to measure.
// Question ids are stored with their answers: never rename one once used.
import type { Guide, GuideQuestion } from '../../modules/guide/types';
import { COPPER_QUOTE, HANDBOOK_DRAFT, LS, PROPOSAL, SEP29, TATTU_TA3200, W09, W10, src } from './sources';

// Sources.
const PT1_BOM = `${LS}/blob/main/engineering/builds/PT1/BOM.md`;
const PT1_NOTES = `${LS}/blob/main/engineering/builds/PT1/README.md`;
const BOM_CSV = `${LS}/blob/main/engineering/cad/build123d/BOM.csv`;
const SL_README = `${LS}/blob/main/engineering/electronics/pcbs/SL_PCB/README.md`;
const issue = (n: number, title?: string) => src(`#${n}${title ? ` ${title}` : ''}`, `${LS}/issues/${n}`);
const S = {
  bom: src('PT1 BOM', PT1_BOM),
  cells: src('PT1 BOM', `${PT1_BOM}#cell-selection-rationale`),
  buy: src('PT1 BOM', `${PT1_BOM}#battery-cells`),
  copper: src('PT1 BOM', `${PT1_BOM}#copper-busbars`),
  notes: src('PT1 build notes', PT1_NOTES),
  csv: src('BOM.csv', BOM_CSV),
  sl: src('SL_PCB README', SL_README),
  slCharge: src('SL_PCB README', `${SL_README}#charger-connectors`),
  slSense: src('SL_PCB README', `${SL_README}#cell-voltage-sensing-interface`),
  weights: issue(26),
  quote: src('Copper order', COPPER_QUOTE),
  pr27: src('PR #27', `${LS}/pull/27`),
  proposal: src('Proposal', PROPOSAL),
  tattu: src('Tattu TA3200', TATTU_TA3200),
  sep22: src('Sep 22 notes', `${W09}#september-22-2026--longshot-battery--bms-call`),
  sep29: src('Sep 29 call', SEP29),
  oct5: src('Oct 5 notes', `${W10}#october-5-2026`),
  handbook: src('Quiver PR #274', HANDBOOK_DRAFT),
};

// Parts, by their build123d BOM number.
const CELL = 'PW-CELL-001-21700';
const UPPER = 'EN-CELL-001-Upper_Cell_Holder';
const BOTTOM = 'EN-CELL-001-Bottom_Cell_Holder';
const BUS_N = 'PW-BUS-001-N_Terminal';
const BUS_P = 'PW-BUS-002-P_Terminal';
const BRIDGE = 'PW-BUS-003-Bridge_1';
const MID = 'PW-BUS-004-Bridge_2';
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
const AMT = 'AMT0450003DB0000G';
const CONN_TH = 'CONN-TH_430451612';
const JST = 'CONN-SMD_SM7B-GHS-TB-LF-SN';

// The pack as it goes together, for the 3D view.
const BUSBARS = [BRIDGE, MID, BUS_N, BUS_P];
const LOADED = [BOTTOM, CELL, UPPER];
const WELDED = [...LOADED, ...BUSBARS];
const SENSED = [...WELDED, ...VS, SMD_FUSE, JST];
const BOARDED = [...SENSED, SL, ET60S, FUSE, AMT, CONN_TH];
const POWERED = [...BOARDED, TERM_N, TERM_P];
const CASE = [BOTTOM_PLATE, SHEET_R, SHEET_L, BASE, COVER, TOP_PLATE, INSERT_M3, INSERT_M4];
const ENCLOSED = [...POWERED, ...CASE];
const DONE = [...ENCLOSED, ...STRAP, CLIP];

const q = (x: Omit<GuideQuestion, 'when'> & { when?: GuideQuestion['when'] }): GuideQuestion => ({ when: 'before', ...x });

export const longshotGuide: Guide = {
  id: 'longshot-pt1',
  project: 'longshot',
  title: 'How to build a Longshot pack',
  subject: 'PT1 · 14S9P · 126 cells',
  intro:
    'Building Longshot PT1, the 14S9P pack of 126 BAK 21700 cells that flies on Quiver, from bare parts to a charged, weighed pack. Each step says what the project\'s record says, with the source. Where the record is silent the step asks: answer what you know here, and the next build answers the rest, with photos from the shot list.',
  variantNote:
    'Spearhead\'s 14S3P pack (42 cells, about 18 × 18 cm) is planned to follow the same process; its layout isn\'t drawn yet, so its counts, busbars and enclosure will differ.',
  sources: [src('project-longshot', LS), S.notes, S.bom, S.csv, S.sl, src('Call notes', W09)],
  builds: [
    { id: 'next', label: 'Next build' },
    { id: 'pt1', label: 'PT1' },
  ],
  phases: [
    { id: 'prepare', title: 'Before you start', summary: 'PT1 has no BMS: once cells are joined, nothing in the pack stops a short, an overcharge or a hot cell except one fuse. Set the bench up for that, and have every part counted before the first cell comes out of its box.' },
    { id: 'print', title: 'Print the parts', summary: 'The cell holders, the base and the top cover are 3D printed, and take heat-set inserts. Printing first means the cells never wait on a printer.' },
    { id: 'cells', title: 'Cells', summary: 'Every cell is checked, then the 126 go into the holders in 14 groups of 9.' },
    { id: 'weld', title: 'Busbars and welding', summary: 'Laser-cut busbars, spot-welded to the cells, turn 126 loose cells into one 14S9P pack. From the first weld the groups are live.' },
    { id: 'electronics', title: 'Sense boards and power path', summary: 'Four voltage-sense boards bring every group\'s voltage and temperature to the SL board, which carries the power through the fuse to the connector. There is no BMS: the SL board is a dummy that only routes power and sense lines.' },
    { id: 'enclose', title: 'Enclosure', summary: 'Plates, aluminium side sheets and the printed base and cover close the pack; the strap and the Tattu clip make it carry and lock like the Tattu it replaces.' },
    { id: 'test', title: 'Test and record', summary: 'Weigh it, check it, charge it the first time on the right charger profile, and measure what it holds.' },
    { id: 'finish', title: 'Label, store and ship', summary: 'What leaves the bench: a labelled pack, stored safely, and a plan for shipping lithium.' },
  ],
  steps: [
    // Before you start
    {
      id: 'bench', phase: 'prepare', title: 'Set up a safe bench',
      goal: 'A clear, non-conductive bench with fire kit at hand, and everyone at it knows the pack has no protection.',
      how: [
        { text: 'PT1 has no over-voltage, under-voltage, over-current or over-temperature cut-off; the fuse is the only protection in the power path.', source: S.sl },
        { text: 'Work on a non-conductive mat, take off rings and watches, and use insulated tools: a dropped spanner across two busbars is a dead short.', practice: true },
        { text: 'Keep a fire extinguisher and a metal bucket of dry sand by the bench, and never leave cells or a pack charging unattended.', practice: true },
        { text: 'Keep cells in their packaging until they go into the holder, and cover finished busbars as you go.', practice: true },
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
        { text: 'A 3D printer for the holders, base and top cover', practice: true },
        { text: 'A multimeter, and an internal-resistance meter for the cells', practice: true },
        { text: 'Insulated hand tools, Kapton tape, and insulator rings for the cells\' positive ends', practice: true },
      ],
      how: [
        { text: 'Check everything against the bill of materials: 32 lines from the build123d model. Screws and wiring aren\'t in it.', source: S.csv },
        { text: 'PT1\'s cells were bought as 140 BAK 21700 65E for the 126 in the pack, from Shenzhen Vapcell through Alibaba, about $7.00 a cell landed.', source: S.buy },
        { text: 'The busbars were laser cut by Supro Manufacturing in one order for three packs.', source: S.quote },
      ],
      questions: [
        q({ id: 'screw-list', text: 'Which screws does a pack take, and how many of each?', why: 'Screws aren\'t in the BOM; #25 only says to order them.', kind: 'text', ask: 'julius' }),
        q({ id: 'wire-list', text: 'Which wire (gauge, length, insulation) does a pack need, for the power path and the sense leads?', why: 'Wiring isn\'t in the BOM either, and the power path carries the whole pack current.', kind: 'text', ask: 'julius' }),
        q({ id: 'spare-cells', text: 'How many spare cells should a build order?', why: 'PT1\'s order was 140 cells for the 126 in the pack; a build that runs short stops.', kind: 'number', unit: 'cells', ask: 'julius' }),
      ],
      shots: ['Every part laid out and labelled, before the build'],
      issues: [25],
      zone: 'sourcing',
    },

    // Print the parts
    {
      id: 'print-holders', phase: 'print', title: 'Print the cell holders',
      goal: 'An upper and a bottom cell holder, printed, cleaned up, and a test cell sits in each without force.',
      parts: [{ id: UPPER, qty: 1 }, { id: BOTTOM, qty: 1 }],
      tools: [{ text: 'A 3D printer and the holder print files', source: S.csv }],
      how: [
        { text: 'Print the upper and the bottom cell holder: two prints.', source: issue(23, 'Print battery holders') },
        { text: 'Each holder weighs about 240 g.', source: S.weights },
        { text: 'Test-fit a few cells in each holder: firm, but no force needed. A holder that pinches will crack around the cells later.', practice: true },
      ],
      questions: [
        q({ id: 'holder-material', text: 'What material were PT1\'s holders printed in?', why: 'Holders sit against the cells for the life of the pack: heat and creep matter.', kind: 'choice', options: ['PETG', 'ASA', 'ABS', 'PLA', 'PA (nylon) or composite', 'Other (say in the note)'], ask: 'julius' }),
        q({ id: 'holder-settings', text: 'Which print settings: nozzle, layer height, walls, infill?', why: 'So the next printer gets the same part.', kind: 'text', ask: 'julius' }),
        q({ id: 'holder-print-time', text: 'How long does each holder take to print?', why: 'The longest print sets when cells can go in.', kind: 'number', unit: 'h', ask: 'julius' }),
        q({ id: 'holder-fit', text: 'Did the cells fit straight off the printer, or was the hole size tuned?', why: 'A different printer may need a different hole size.', kind: 'text', when: 'build', perBuild: true }),
      ],
      shots: ['Both holders off the printer', 'A cell seated in a holder, close up'],
      issues: [23],
      zone: 'cells',
      model: { lit: [UPPER, BOTTOM], adds: [UPPER, BOTTOM] },
    },
    {
      id: 'print-case', phase: 'print', title: 'Print the base and top cover',
      goal: 'The printed base and top cover, ready for inserts.',
      parts: [{ id: BASE, qty: 1 }, { id: COVER, qty: 1 }],
      how: [
        { text: 'Print the top cap and the base of the casing.', source: issue(24, 'Print top cap and base') },
        { text: 'The build123d model\'s top cover is approximate: 18 of 19 parts match Julius\'s Fusion design, and the cover is the one that doesn\'t.', source: S.pr27 },
        { text: 'So print the cover from the Fusion design, not from the build123d model.', practice: true },
      ],
      questions: [
        q({ id: 'cover-file', text: 'Where is the print file for the top cover, from the Fusion design?', why: 'The build123d cover is only approximate, so it isn\'t the one to print.', kind: 'link', ask: 'julius' }),
        q({ id: 'case-material', text: 'What material and settings were the base and cover printed in?', why: 'The case carries the strap load and takes screws.', kind: 'text', ask: 'julius' }),
      ],
      shots: ['Base and top cover off the printer'],
      issues: [24],
      zone: 'enclosure',
      model: { lit: [BASE, COVER], adds: [BASE, COVER] },
    },
    {
      id: 'inserts', phase: 'print', title: 'Set the heat-set inserts',
      goal: 'Every insert is in, square and flush.',
      parts: [{ id: INSERT_M3, qty: 67 }, { id: INSERT_M4, qty: 4 }],
      tools: [{ text: 'A soldering iron with a heat-set insert tip', practice: true }],
      how: [
        { text: 'The pack takes 67 M3 (ruthex RX-M3x5.7) and 4 M4 (ruthex RX-M4x8.1) heat-set inserts, in the holders, base and top cover.', source: S.csv },
        { text: 'Press each one in square to the surface with the iron and stop when it\'s flush; let it cool before loading it.', practice: true },
      ],
      questions: [
        q({ id: 'insert-map', text: 'Which part takes how many inserts, and where do the 4 M4s go?', why: 'The BOM gives the totals only.', kind: 'text', ask: 'julius' }),
        q({ id: 'insert-temp', text: 'What iron temperature sets the inserts cleanly in this material?', why: 'Too hot and the plastic flows; too cold and the insert goes in crooked.', kind: 'number', unit: '°C', ask: 'julius' }),
      ],
      shots: ['A row of set inserts, close up'],
      zone: 'enclosure',
      model: { lit: [UPPER, BOTTOM, BASE, COVER, INSERT_M3, INSERT_M4], adds: [INSERT_M3, INSERT_M4] },
    },

    // Cells
    {
      id: 'check-cells', phase: 'cells', title: 'Check every cell',
      goal: 'Every cell measured and recorded, damaged or odd ones set aside.',
      parts: [{ id: CELL, qty: 126 }],
      tools: [{ text: 'A multimeter and an internal-resistance meter', practice: true }],
      how: [
        { text: 'PT1 uses BAK 21700 65E: 6.5 Ah, 3.6 V nominal, 25 A continuous, 72 g each; 9,072 g for all 126.', source: S.bom },
        { text: 'Julius tested 11 cells; the 65E gave the most energy, 20.18 Wh to 2.8 V at 10 A.', source: S.cells },
        { text: 'Measure every cell\'s voltage and internal resistance before it goes in, and write them down: it\'s the only time each cell can be measured on its own.', practice: true },
        { text: 'Set aside any cell with a dent, a torn wrap or a damaged top insulator.', practice: true },
      ],
      checks: [{ text: 'Every cell has a voltage and a resistance on the sheet; the outliers are out of the build.', practice: true }],
      questions: [
        q({ id: 'cell-voltage-window', text: 'How close in voltage did the cells have to be before welding?', why: 'Cells joined in parallel at different voltages push current into each other the moment they touch.', kind: 'number', unit: 'mV', hint: 'A common target is every cell within a few tens of millivolts of the rest before assembly.', ask: 'julius' }),
        q({ id: 'cell-ir-limit', text: 'What internal resistance did the cells measure, and what reading would reject one?', why: 'A high-resistance cell heats more and fades first, and drags its group with it.', kind: 'text', hint: 'Measured with a 1 kHz AC meter; reject cells well above the rest of the batch.', ask: 'julius' }),
        q({ id: 'cell-arrival-voltage', text: 'What voltage did the cells arrive at?', why: 'Shipping charge varies by supplier and batch.', kind: 'number', unit: 'V', when: 'build', perBuild: true }),
        q({ id: 'cell-rejects', text: 'How many cells were set aside, and why?', why: 'Tells the next order how many spares to buy.', kind: 'text', when: 'build', perBuild: true }),
      ],
      shots: ['Cells being measured, meter visible', 'The filled-in measurement sheet'],
      zone: 'cells',
      model: { lit: [CELL], adds: [CELL] },
    },
    {
      id: 'load-cells', phase: 'cells', title: 'Load the cells into the holders',
      goal: '126 cells sit between the holders in 14 groups of 9, every cell in its group facing the same way, and the upper holder closes over them.',
      parts: [{ id: CELL, qty: 126 }, { id: BOTTOM, qty: 1 }, { id: UPPER, qty: 1 }],
      how: [
        { text: 'PT1 is 14S9P: 14 groups in series, each of 9 cells in parallel.', source: S.proposal },
        { text: 'Load the bottom holder group by group. All nine cells in a group face the same way; neighbouring groups face opposite ways, so one busbar can join the top of one group to the top of the next.', practice: true },
        { text: 'Check each group\'s polarity with a meter before the upper holder goes on: it\'s the last moment a reversed cell is easy to fix.', practice: true },
      ],
      checks: [{ text: 'Every group faces the way the busbar layout expects, and no cell is reversed.', practice: true }],
      questions: [
        q({ id: 'cell-layout', text: 'Is there a drawing of which way each group faces, and where group 1 starts?', why: 'The busbars and the sense taps only work with one layout.', kind: 'link', ask: 'julius' }),
        q({ id: 'cell-insulators', text: 'Did PT1 use insulator rings or fish paper on the cells\' positive ends?', why: 'The can shoulder sits right next to the positive cap; a busbar edge touching it is a short.', kind: 'choice', options: ['Insulator rings', 'Fish paper sheet', 'Both', 'Neither'], ask: 'julius' }),
      ],
      shots: ['The bottom holder fully loaded, from above, each group\'s polarity marked', 'Upper holder in place'],
      zone: 'cells',
      model: { lit: LOADED, adds: [CELL, UPPER] },
    },

    // Busbars and welding
    {
      id: 'busbars', phase: 'weld', title: 'Prepare the busbars',
      goal: 'All 17 busbars on the bench, the right way round for where they go.',
      parts: [{ id: BRIDGE, qty: 12 }, { id: MID, qty: 1 }, { id: BUS_N, qty: 1 }, { id: BUS_P, qty: 1 }, { id: TERM_N, qty: 1 }, { id: TERM_P, qty: 1 }],
      how: [
        { text: 'Seventeen busbars: twelve series bridges, one across the middle of the pack, the negative and positive terminals, and their two 6 mm screw-terminal bars.', source: S.csv },
        { text: 'One flat pattern serves every series bridge, turned 180° for the top or the bottom of the pack.', source: S.csv },
        { text: 'Laser cut from 0.2 mm sheet by Supro Manufacturing, $108.57 a pack delivered.', source: S.copper },
        { text: 'The README and the CAD BOM say copper, but the supplier\'s quotation lists brass H62 for the 0.2 mm parts and copper C101 for the 6 mm terminals.', source: S.quote },
      ],
      questions: [
        q({ id: 'busbar-metal', text: 'What metal are the 0.2 mm busbars, as delivered?', why: 'Copper and brass weld very differently, and the next order copies whatever the BOM says.', kind: 'choice', options: ['Copper', 'Brass H62', 'Nickel-plated copper', 'Not sure'], ask: 'julius' }),
        q({ id: 'busbar-prep', text: 'Do the busbars need cleaning, flattening or forming before welding?', why: 'Laser-cut sheet can arrive with burrs, oxide or a curl.', kind: 'text', ask: 'julius' }),
      ],
      shots: ['One of each busbar laid out flat beside a ruler', 'The material marking on the delivered busbars, or the packing slip'],
      threads: ['L-13'],
      zone: 'busbars',
      model: { lit: BUSBARS, adds: BUSBARS },
    },
    {
      id: 'weld', phase: 'weld', title: 'Weld the busbars',
      goal: 'Every cell is welded to its busbar at both ends, and every weld holds when tugged.',
      parts: [{ id: BRIDGE, qty: 12 }, { id: MID, qty: 1 }, { id: BUS_N, qty: 1 }, { id: BUS_P, qty: 1 }],
      tools: [{ text: 'A spot welder that welds the busbar metal to the cells in one clean pulse, and spare cells for test welds', practice: true }],
      how: [
        { text: 'Lay each busbar over its groups. The bridges\' tongues bend down onto the cells as they\'re welded.', source: S.csv },
        { text: 'Weld test strips onto a spare cell first and peel them off: a good weld tears metal out of the strip rather than popping off clean.', practice: true },
        { text: 'Move around the pack rather than welding one spot after another on the same cell, so no cell heats up.', practice: true },
      ],
      checks: [{ text: 'A gentle tug on each tongue doesn\'t lift it, and no weld has burned through.', practice: true }],
      safety: [
        { text: 'From the first weld the groups are joined: tools across two busbars now short real energy. Cover finished busbars and keep tools off them.', practice: true },
      ],
      questions: [
        q({ id: 'welder', text: 'Which spot welder and electrodes welded PT1?', why: 'Thin copper takes far more welder than nickel strip; not every hobby welder can do it.', kind: 'text', ask: 'julius' }),
        q({ id: 'weld-setting', text: 'What setting (energy, or pulse time) welds the busbars to the BAK 65E?', why: 'The one number the weld step can\'t be done without.', kind: 'text', hint: 'Capacitor-discharge welders set energy in joules; transformer welders set pulse time in milliseconds.', ask: 'julius' }),
        q({ id: 'weld-spots', text: 'How many weld spots per cell end?', why: 'More spots carry more current, but each one heats the cell.', kind: 'number', unit: 'spots', ask: 'julius' }),
        q({ id: 'weld-order', text: 'In what order were the busbars welded?', why: 'The order decides when the pack first becomes live and where the high voltage sits while you work.', kind: 'text', ask: 'julius' }),
        q({ id: 'weld-time', text: 'How long did welding take?', why: 'For planning the next build day.', kind: 'number', unit: 'h', when: 'build', perBuild: true }),
      ],
      shots: ['A peeled test weld', 'The welder\'s settings', 'The finished top side', 'The finished bottom side', 'Welds on one cell, close up'],
      threads: ['L-13'],
      zone: 'busbars',
      model: { lit: WELDED, adds: BUSBARS },
    },

    // Sense boards and power path
    {
      id: 'sense-boards', phase: 'electronics', title: 'Solder and fit the voltage-sense boards',
      goal: 'Four sense boards soldered, fitted, each tap on its group and each temperature sensor on its cells.',
      parts: VS.map((id) => ({ id, qty: 1 })),
      how: [
        { text: 'Solder the four voltage-sense boards.', source: issue(21, 'Solder VS PCBs') },
        { text: 'Four boards, top and bottom, left and right. Each has 3 or 4 cell taps, a ground and a temperature sensor, and plugs into the SL board through a JST connector. 5 g each.', source: S.slSense },
      ],
      questions: [
        q({ id: 'sense-attach', text: 'How do the sense taps attach to the busbars: soldered, welded, or a tab?', why: 'Each tap carries a group\'s voltage to the charger; a loose one unbalances the pack.', kind: 'text', ask: 'julius' }),
        q({ id: 'temp-sensor', text: 'Which temperature sensor is fitted, and where does each one sit?', why: 'Four sensors, one per board; where they touch the pack decides what they can see.', kind: 'text', ask: 'julius' }),
        q({ id: 'sense-files', text: 'Where are the sense board\'s KiCad files?', why: 'They were to follow when #14 closed; without them nobody else can make the board.', kind: 'link', ask: 'julius' }),
      ],
      shots: ['A soldered sense board, both sides', 'A sense board fitted on the pack'],
      issues: [21, 14],
      threads: ['L-11'],
      zone: 'connector',
      model: { lit: SENSED, adds: [...VS, SMD_FUSE, JST] },
    },
    {
      id: 'sl-board', phase: 'electronics', title: 'Solder the SL board',
      goal: 'The SL board with its fuse, main connector and charge and balance connectors, ready to fit.',
      parts: [{ id: SL, qty: 1 }, { id: ET60S, qty: 1 }, { id: FUSE, qty: 1 }],
      how: [
        { text: 'Solder the SL board.', source: issue(22, 'Solder SL PCB') },
        { text: 'It carries the main power path through an AMXL-200 fuse (an AMX-150 also fits) to the ET60S-D06 connector, plus a charge connector for the TA3200 charge cable and a balance connector that mates with its balance cable. 153 g without the fuse.', source: S.sl },
        { text: 'It is a dummy board on purpose: no MOSFETs, no balancing, no firmware.', source: S.sl },
      ],
      questions: [
        q({ id: 'sl-files', text: 'Where are the SL board\'s KiCad files, as built?', why: 'The repository holds only its basic layout.', kind: 'link', ask: 'julius' }),
        q({ id: 'sl-solder-notes', text: 'Anything tricky about soldering it: the ET60S, the heavy pads, the order?', why: 'The heavy connectors need more heat than the rest of the board.', kind: 'text', ask: 'julius' }),
      ],
      shots: ['The soldered SL board, both sides'],
      issues: [22, 16],
      threads: ['L-11'],
      zone: 'connector',
      model: { lit: BOARDED, adds: [SL, ET60S, FUSE, AMT, CONN_TH] },
    },
    {
      id: 'balance-map', phase: 'electronics', title: 'Wire the sense leads and check the balance pins',
      goal: 'Every balance pin reads its group, in order, on a meter, before anything is plugged into a charger.',
      how: [
        { text: 'The SL_PCB README leaves open which part the balance connector is and the full map from the four sense boards to its pins, and warns not to rely on photos for pin mapping.', source: S.slCharge },
        { text: 'Measure from the pack\'s negative to each balance pin in turn: each should read one group\'s voltage more than the last.', practice: true },
      ],
      checks: [{ text: 'Each reading is about one cell\'s voltage above the last, up to the full pack voltage.', practice: true }],
      safety: [
        { text: 'Don\'t take the pin map from photos; measure it.', source: S.sl },
        { text: 'A wrong pin map can put the whole pack\'s voltage across a charger\'s balance input.', practice: true },
      ],
      questions: [
        q({ id: 'balance-pinmap', text: 'What is the full map from the sense-board taps to the balance connector pins?', why: 'It isn\'t on record, and it\'s the one wiring mistake that can take out a charger or a cell.', kind: 'text', ask: 'julius' }),
        q({ id: 'balance-connector', text: 'Which connector part mates with the TA3200 balance cable?', why: 'The README leaves it open.', kind: 'text', ask: 'julius' }),
        q({ id: 'balance-readings', text: 'What did each balance pin read on this pack?', why: 'The first record of the pack\'s groups, before any charge.', kind: 'text', when: 'build', perBuild: true }),
      ],
      shots: ['The balance connector with each pin labelled', 'The meter on a balance pin'],
      threads: ['L-11'],
      zone: 'connector',
    },
    {
      id: 'power-path', phase: 'electronics', title: 'Connect the power path',
      goal: 'The pack\'s terminals reach the SL board through the screw-terminal bars, tight and insulated.',
      parts: [{ id: TERM_N, qty: 1 }, { id: TERM_P, qty: 1 }],
      how: [
        { text: 'The negative and positive terminal busbars each have a 6 mm screw-terminal bar.', source: S.csv },
        { text: 'Fit the fuse last, and only once the balance pins check out.', practice: true },
      ],
      questions: [
        q({ id: 'power-wire', text: 'What joins the terminal bars to the SL board: wire gauge, length, lugs?', why: 'It carries the whole pack current; it isn\'t in the BOM.', kind: 'text', ask: 'julius' }),
        q({ id: 'terminal-torque', text: 'What torque for the terminal screws?', why: 'Loose terminals heat up under load.', kind: 'number', unit: 'N·m', ask: 'julius' }),
      ],
      shots: ['Both terminals connected, before the case closes'],
      zone: 'connector',
      model: { lit: POWERED, adds: [TERM_N, TERM_P] },
    },

    // Enclosure
    {
      id: 'enclose', phase: 'enclose', title: 'Close the enclosure',
      goal: 'Plates, side sheets, base and cover screwed up around the pack, nothing live touching the aluminium.',
      parts: [{ id: BOTTOM_PLATE, qty: 1 }, { id: TOP_PLATE, qty: 1 }, { id: SHEET_L, qty: 1 }, { id: SHEET_R, qty: 1 }, { id: BASE, qty: 1 }, { id: COVER, qty: 1 }],
      how: [
        { text: 'The case: top and bottom plates, aluminium reinforcement sheets left and right, and the printed base and top cover, sized to slide into Quiver\'s battery bay like the Tattu.', source: S.csv },
        { text: 'The plates are 3 mm and 250 g each: polycarbonate in the CAD BOM, acrylic in the weight table.', source: S.weights },
        { text: 'The proposal set the target: 220 × 330 × 90 mm inside, at most 11.5 kg, IP54.', source: S.proposal },
        { text: 'Line the side sheets so no busbar edge or tap can reach the aluminium.', practice: true },
      ],
      checks: [{ text: 'No continuity from either terminal to the aluminium sheets.', practice: true }],
      questions: [
        q({ id: 'plate-material', text: 'Are PT1\'s plates polycarbonate or acrylic?', why: 'Acrylic cracks where polycarbonate bends; the next build copies the BOM.', kind: 'choice', options: ['Polycarbonate', 'Acrylic'], ask: 'julius' }),
        q({ id: 'case-insulation', text: 'What insulates the cells and busbars from the aluminium sheets?', why: 'The sheets are conductive and sit beside live busbars.', kind: 'text', hint: 'Fish paper or Kapton between the cell block and any metal is common.', ask: 'julius' }),
        q({ id: 'case-sealing', text: 'How is IP54 met: gaskets, sealant, or not yet?', why: 'The proposal sets IP54; nothing on record says how.', kind: 'text', ask: 'julius' }),
      ],
      shots: ['The pack in the base before the cover goes on', 'The closed pack, from every side'],
      threads: ['L-13'],
      zone: 'enclosure',
      model: { lit: ENCLOSED, adds: CASE },
    },
    {
      id: 'mount', phase: 'enclose', title: 'Fit the strap, clip and feet',
      goal: 'The pack carries on its strap and locks into the bay with the Tattu clip.',
      parts: [{ id: CLIP, qty: 1 }, ...STRAP.map((id) => ({ id, qty: id.endsWith('Metal_End') ? 2 : 1 }))],
      how: [
        { text: 'A rubber carrying strap on metal brackets, 73 g.', source: S.weights },
        { text: 'The Tattu 4.0 30 Ah clip, so Longshot locks into Quiver\'s bay the way the Tattu does. No fit check against Quiver\'s slider and connector board is recorded.', source: S.pr27 },
        { text: 'Four rubber feet and a top-cap clip are in the weight table but not itemized.', source: S.weights },
      ],
      questions: [
        q({ id: 'feet-part', text: 'Which rubber feet, and where do they go?', why: 'They\'re in the weight but not the BOM.', kind: 'text', ask: 'julius' }),
        q({ id: 'bay-fit', text: 'Does the pack slide into Quiver\'s bay, lock, and mate with the connector board?', why: 'No fit check is recorded; the connectors differ (ET60S against Quiver\'s two Molex).', kind: 'text', when: 'build', perBuild: true }),
      ],
      shots: ['Strap and clip fitted', 'The pack locked into Quiver\'s bay'],
      threads: ['Q-18'],
      zone: 'mounting',
      model: { lit: DONE, adds: [...STRAP, CLIP] },
    },

    // Test and record
    {
      id: 'weigh', phase: 'test', title: 'Weigh it and finish the weight table',
      goal: 'The pack\'s weight recorded, and every gram in the weight table accounted for.',
      how: [
        { text: 'PT1 weighed 11.2 kg complete, about 200 g under the Tattu it replaces.', source: S.weights },
        { text: '364 g weren\'t itemized: the fuse, wiring, screws, temperature sensors, the top-cap clip and four rubber feet.', source: S.weights },
      ],
      questions: [
        q({ id: 'pack-weight', text: 'What does the finished pack weigh?', why: 'Weight decides Quiver\'s payload.', kind: 'number', unit: 'kg', when: 'build', perBuild: true }),
        q({ id: 'weight-items', text: 'What do the fuse, wiring, screws, sensors, clip and feet each weigh?', why: 'Closes the 364 g gap in #26.', kind: 'text', when: 'build', perBuild: true }),
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
        { text: 'Measure the pack voltage at the ET60S and at the charge connector, and each group through the balance connector.', practice: true },
        { text: 'Check there is no continuity from either terminal to the case\'s metal.', practice: true },
      ],
      questions: [
        q({ id: 'pack-voltage', text: 'What did the finished pack read?', why: 'The starting point for its first charge.', kind: 'number', unit: 'V', when: 'build', perBuild: true }),
        q({ id: 'group-spread', text: 'How far apart were the highest and lowest groups?', why: 'A big spread before the first charge points at a bad cell or tap.', kind: 'number', unit: 'mV', when: 'build', perBuild: true }),
      ],
      zone: 'testing',
    },
    {
      id: 'first-charge', phase: 'test', title: 'Charge it the first time',
      goal: 'The pack charged to 58.8 V on a Li-ion profile, with someone watching it.',
      how: [
        { text: 'Charge only on the TA3200, through the balance connector, on a Li-ion profile, never LiHV.', source: S.weights },
        { text: 'Longshot is standard Li-ion, full at 58.8 V (4.2 V a cell). The Tattu 4.0 is LiHV, full at 60.9 V (4.35 V a cell).', source: S.weights },
        { text: 'The TA3200 comes in three versions: standard (4.2 V a cell), HV and UHV. Only the standard one suits Longshot.', source: S.tattu },
        { text: 'Stay with the pack for its first charge; check the temperature readings and feel the case.', practice: true },
      ],
      safety: [{ text: 'Never the LiHV profile: charging to 60.9 V overcharges every cell in the pack, and there is no BMS to stop it.', source: S.weights }],
      questions: [
        q({ id: 'charger-version', text: 'Which TA3200 version does Arrow have?', why: 'Only the standard 4.2 V one suits Longshot, and which one Arrow owns isn\'t recorded.', kind: 'choice', options: ['TA3200 (standard, 4.2 V a cell)', 'TA3200HV (4.35 V)', 'TA3200UHV (4.45 V)', 'Not sure'], ask: 'julius' }),
        q({ id: 'charge-current', text: 'What charge current is safe for a first charge?', why: 'The guide needs a number, not "carefully".', kind: 'number', unit: 'A', ask: 'julius' }),
        q({ id: 'charge-result', text: 'How long did the first charge take, and how warm did the pack get?', why: 'The first record of how the pack behaves.', kind: 'text', when: 'build', perBuild: true }),
      ],
      threads: ['L-3', 'L-10'],
      zone: 'charging',
    },
    {
      id: 'capacity', phase: 'test', title: 'Measure what it holds, then fly it',
      goal: 'The pack\'s capacity measured on the bench, and a flight logged against the Tattu.',
      how: [
        { text: 'About 2,540 Wh usable is worked out from the cell test (126 × 20.18 Wh), not measured on the pack; about 2,950 Wh nameplate.', source: S.weights },
        { text: 'PT1 has flown at least once; the flight-test report Phase 1 promised isn\'t written yet.', source: S.sep29 },
        { text: 'In the air Quiver gets no battery data from a pack without a BMS; the draft Pilot\'s Handbook falls back on voltage: return at 46.2 V, land in place at 44.8 V.', source: S.handbook },
        { text: 'A bench discharge at a known current down to a safe cut-off gives the real capacity, and its curve shows the weakest group.', practice: true },
      ],
      questions: [
        q({ id: 'capacity-measured', text: 'What capacity did the pack measure on the bench?', why: 'Replaces the worked-out 2,540 Wh with a measurement.', kind: 'number', unit: 'Wh', when: 'build', perBuild: true }),
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
        { text: 'Cells travel as hazardous goods: the PT1 cell order paid €145.13 for shipping and €24.22 for insurance.', source: S.buy },
        { text: 'Store packs part-charged, cool and dry, away from anything that burns.', practice: true },
        { text: 'A pack this size ships as Class 9 dangerous goods; carriers usually want a UN38.3 test summary, or the rules for prototypes and small production runs.', practice: true },
      ],
      questions: [
        q({ id: 'storage-voltage', text: 'What voltage should a pack be stored at?', why: 'Full packs age fastest; empty ones can drop too low.', kind: 'number', unit: 'V', hint: 'Around 3.6 to 3.8 V a cell is common for storage, about 50 to 53 V for 14S.', ask: 'julius' }),
        q({ id: 'ship-plan', text: 'How will finished packs ship to whoever flies them?', why: 'Moving a finished pack is a dangerous-goods question that needs an answer before the first one leaves.', kind: 'text', ask: 'thomas' }),
      ],
      zone: 'safety',
    },
  ],
};
