import type { Call } from '../../data/calls';

// Longshot's call notes: the Longshot items from the Spearhead calls, which
// is where Longshot's battery and BMS work gets discussed. Taken from the
// notes published on the Spearhead wiki, in plain words; "who" is who the
// notes name for an item, nothing more. The Sep 29 Caribou call has no
// published notes, so its items come from Vector's reading of the HearHear
// transcript and link to it.
const W09 = 'https://github.com/Arrow-air/project-spearhead/wiki/2026%E2%80%9009';
const W10 = 'https://github.com/Arrow-air/project-spearhead/wiki/2026%E2%80%9010';
const NOTES = 'From the notes published on the Spearhead wiki: the Longshot items only, in plain words. The recording and the full transcript are not in the app.';

export const longshotCalls: Call[] = [
  {
    id: 'ls-sep22',
    project: 'longshot',
    title: 'Longshot battery and BMS call',
    date: 'Sep 22',
    lede: NOTES,
    url: `${W09}#september-22-2026--longshot-battery--bms-call`,
    named: ['alperen', 'julius', 'erick', 'kbm'],
    items: [
      { id: 'ls-sep22-1', kind: 'update', who: [], zone: 'on-spearhead', text: 'Spearhead flies a Profuse 12S 22 Ah semi-solid pack (3.7 kg). Longshot weighs about the same as the Tattu with almost twice the energy, so a Longshot about a third the size fits Spearhead.' },
      { id: 'ls-sep22-2', kind: 'agreement', who: ['alperen', 'julius'], zone: 'on-spearhead', thread: 'L-6', text: 'Sizing, line by line: 14S3P with 6.5 Ah cells, 19.5 Ah, about 3.9 kg, called 4 kg. A desk estimate with buffers; several items are not measured yet.' },
      { id: 'ls-sep22-3', kind: 'agreement', who: ['erick'], zone: 'on-spearhead', text: 'Spearhead moves to 14S: the ESCs and motors run at 14S and everything else is regulated, so Quiver PCB components can be reused.' },
      { id: 'ls-sep22-4', kind: 'agreement', who: [], zone: 'connector', text: 'Spearhead\'s Longshot uses an AS150U connector, which has four signal pins. QS8 was rejected as too hard to handle in the field.' },
      { id: 'ls-sep22-5', kind: 'update', who: ['julius', 'alperen'], zone: 'cells', text: 'Julius puts the cells for the Spearhead pack at about $250, against $450 to $500 for today\'s battery and about $700 for a Tattu. Cheaper cells would halve that but hold only 5.5 to 6 Ah; Alperen prefers to keep the weight budget.' },
      { id: 'ls-sep22-6', kind: 'update', who: ['julius'], zone: 'bms', thread: 'L-1', text: 'Longshot has no BMS yet. Julius has reserved a bounty in the Longshot budget and is reaching out to experienced freelancers; the design then gets copied into the Spearhead variant. The BMS is top priority.' },
      { id: 'ls-sep22-7', kind: 'proposal', who: ['alperen'], zone: 'bms', thread: 'L-2', text: 'Make the BMS a shared asset: 18S for Caribou, 12S or 14S for Quiver and Spearhead, 24S for Feather.' },
      { id: 'ls-sep22-8', kind: 'update', who: ['kbm', 'alperen'], zone: 'bms', thread: 'L-1', text: 'AI-assisted design: KBM found GPT-6\'s PCB traces poor but its component selection good. Alperen will try Astra for component selection and placement, with traces by a freelancer or a community bounty.' },
      { id: 'ls-sep22-9', kind: 'agreement', who: [], zone: 'on-spearhead', thread: 'L-6', text: 'Build the Spearhead battery without a BMS first and add the BMS when it\'s ready; the board is easy to swap. If no contractor finishes in about two weeks, the dummy version is the November fallback.' },
      { id: 'ls-sep22-10', kind: 'proposal', who: [], zone: 'bms', thread: 'L-2', text: 'Generator cut-off, disconnecting the generator input when the battery is full, goes into the general Longshot and Quiver BMS spec.' },
      { id: 'ls-sep22-11', kind: 'agreement', who: [], zone: 'charging', text: 'Two battery PCB iterations. The first, a dummy, charges and discharges through the main connector, with a balance-lead output that plugs into the Tattu charger used for Quiver. The second has the BMS and needs no external balance leads.' },
      { id: 'ls-sep22-12', kind: 'update', who: [], zone: 'safety', thread: 'L-10', text: 'Charging from a voltage-limited generator without a BMS is possible but not recommended: overcharge risk, and a damaged battery could mean an in-flight fire on a wooden airframe.' },
      { id: 'ls-sep22-13', kind: 'agreement', who: ['erick'], zone: 'bms', thread: 'L-2', text: 'On Spearhead the BMS sits on the battery connector PCB as a small header-mounted daughterboard (power, CAN, maybe temperature), swappable if it gives trouble. Erick adds the provision and the AS150U, designed for 14S.' },
      { id: 'ls-sep22-14', kind: 'update', who: ['alperen'], zone: 'budget', text: 'Alperen offered that Spearhead could share the BMS bounty if Longshot\'s budget falls short.' },
    ],
  },
  {
    id: 'ls-sep25',
    project: 'longshot',
    title: 'Spearhead call',
    date: 'Sep 25',
    lede: NOTES,
    url: `${W09}#september-25-2026`,
    named: ['alperen', 'erick', 'zeynep'],
    items: [
      { id: 'ls-sep25-1', kind: 'agreement', who: ['alperen', 'erick', 'zeynep'], zone: 'on-spearhead', text: 'In the electric configuration a second Longshot replaces the gas tank, in the same bay, wired straight to the pusher. Alperen\'s proposal, agreed by Erick and Zeynep.' },
      { id: 'ls-sep25-2', kind: 'proposal', who: ['alperen', 'erick'], zone: 'on-spearhead', thread: 'L-7', text: 'Alperen: charge the second battery through a power port and a balance port on the skin, with a normal balance charger and no extra BMS. Erick: a battery charged through a BMS needs its own; worth checking whether one BMS can serve both if they charge one at a time.' },
      { id: 'ls-sep25-3', kind: 'update', who: ['alperen', 'erick'], zone: 'can', text: 'Alperen asked for a CAN port for the second battery\'s telemetry. Erick: Longshot has no BMS, so there is nothing to talk to; the pusher\'s voltage and current can come from its ESC. Not added for now.' },
      { id: 'ls-sep25-4', kind: 'update', who: ['erick'], zone: 'connector', text: 'Erick lays out the battery connector PCB last, after the tail and main boards, so Julius has more time on the BMS and the board can be designed around it.' },
    ],
  },
  {
    id: 'ls-sep28',
    project: 'longshot',
    title: 'Spearhead call',
    date: 'Sep 28',
    lede: NOTES,
    url: `${W09}#september-28-2026`,
    named: ['julius', 'erick'],
    items: [
      { id: 'ls-sep28-1', kind: 'update', who: ['julius'], zone: 'bms', thread: 'L-1', text: 'The BMS software is set up and Julius is waiting on hardware. Next he wires it up and tests it, and if it works, moves it onto the PCB.' },
      { id: 'ls-sep28-2', kind: 'update', who: ['erick', 'julius'], zone: 'connector', text: 'Erick and Julius haven\'t talked about the BMS yet; Erick wants to get further on his PCBs first.' },
    ],
  },
  {
    id: 'ls-sep29',
    project: 'longshot',
    title: 'Caribou call',
    date: 'Sep 29',
    lede: 'No notes were published for this call. These Longshot items are Vector\'s reading of the HearHear transcript, linked here, which only Arrow Discord members can open.',
    url: 'https://discord.com/channels/853833144037277726/1478778896361980035/1554521669400526873',
    named: ['julius', 'alperen', 'kbm', 'thomas'],
    items: [
      { id: 'ls-sep29-1', kind: 'update', who: ['julius', 'alperen'], zone: 'bms', thread: 'L-1', text: 'Julius has a palm-sized BMS development board, "the planned BMS for Longshot". He\'ll test it, then copy its schematic into Arrow\'s own design. Alperen agreed a dev board is fine for the first prototype.' },
      { id: 'ls-sep29-2', kind: 'update', who: ['julius'], zone: 'testing', thread: 'L-4', text: 'Julius planned another Longshot flight within the hour, and has the log from the last one.' },
      { id: 'ls-sep29-3', kind: 'agreement', who: ['julius'], zone: 'on-spearhead', thread: 'L-6', text: 'For Spearhead, a square layout of about 18 × 18 cm works best; Julius will make it as small as possible. Spearhead PT2 will likely carry two batteries of the same capacity.' },
      { id: 'ls-sep29-4', kind: 'update', who: ['thomas', 'kbm', 'julius'], zone: 'cells', thread: 'L-5', text: 'Thomas is sourcing cells for a build in Texas and will send Julius options to approve. KBM: 6.5 Ah 21700 cells come only from BAK and FEB and cost about twice as much as 5.0 Ah cells. Julius is fine with 6.5 Ah for now; 5.8 Ah cells would make a cheaper pack.' },
    ],
  },
  {
    id: 'ls-oct2',
    project: 'longshot',
    title: 'Spearhead call',
    date: 'Oct 2',
    lede: NOTES,
    url: `${W10}#october-2-2026`,
    named: ['erick', 'alperen'],
    items: [
      { id: 'ls-oct2-1', kind: 'update', who: ['erick'], zone: 'connector', text: 'The battery connector PCB is the last Spearhead board and the one that most needs Julius\'s input; Erick will talk to him next week.' },
      { id: 'ls-oct2-2', kind: 'question', who: ['alperen', 'erick'], zone: 'can', text: 'Alperen: if the battery connector PCB needs extra connections to the main PCB (BMS, second-battery charging status), decide now so the main PCB isn\'t redone. Erick expects no conflicts: the CAN architecture is Quiver\'s, and anything else can go through reused Phoenix connectors.' },
    ],
  },
  {
    id: 'ls-oct5',
    project: 'longshot',
    title: 'Spearhead call',
    date: 'Oct 5',
    lede: NOTES,
    url: `${W10}#october-5-2026`,
    named: ['erick', 'julius', 'alperen'],
    items: [
      { id: 'ls-oct5-1', kind: 'update', who: ['erick', 'julius'], zone: 'bms', thread: 'L-1', text: 'Erick hasn\'t laid out the battery PCB yet, only picked connectors and components; he\'ll talk to Julius this week. Julius has no BMS updates yet.' },
      { id: 'ls-oct5-2', kind: 'agreement', who: ['erick', 'julius'], zone: 'on-spearhead', text: 'Timeline: the Spearhead PCB designs done and ordered in about 1.5 months (late November). Longshot\'s customization for Spearhead plus the BMS: about a month.' },
      { id: 'ls-oct5-3', kind: 'proposal', who: ['julius'], zone: 'builds', text: 'Julius suggested building the physical Longshot layout in Texas with Thomas, ordering the PCB shortly after, and teaching Thomas to build Longshot batteries so he can build Spearhead\'s before the Spearhead build.' },
    ],
  },
];
