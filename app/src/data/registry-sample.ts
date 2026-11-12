// The registry's demo people: the invented sample from the onboarding mockups
// (prototypes/registry-onboarding, PEOPLE and NOTES), in the database's shape.
// Sample people, not real: every name, place, handle and note here is made up
// (the team's first names sign the notes). Only the demo build reads this, and
// the demo's People pages say so with SAMPLE_LABEL.

/** Shown wherever the demo lists these people. */
export const SAMPLE_LABEL = 'Sample people, not real';
import type { BuildOption, Lane, MapPrecision, NoteKind, OutreachStatus, Tool, Want } from '../lib/registry';

export interface SamplePerson {
  id: string;
  name: string;
  /** Null for someone the team added who has no account yet. */
  joined: string | null;
  added?: { by: string; on: string; how: string };
  discord: string | null;
  github: string | null;
  email?: string;
  city: string | null;
  country: string;
  lat: number;
  lng: number;
  tz: string;
  map: MapPrecision;
  source: string;
  ref: string | null;
  wantsToBuild?: string;
  lanes?: Lane[];
  can: string[];
  learn: string[];
  guess?: string[];
  tools: Tool[];
  build: BuildOption[];
  hours?: string;
  when?: string;
  travel?: string;
  wants: Want[];
  blurb?: string;
  story?: string;
  callOk: boolean;
  status: OutreachStatus;
  owner?: string;
  goodFor?: string[];
  next?: string;
  introQueue?: boolean;
}

/** The core team in the demo, by the names the mockups use. */
export const SAMPLE_TEAM: { id: string; name: string; role: 'core' | 'lead' }[] = [
  { id: 'u-thomas', name: 'Thomas', role: 'lead' },
  { id: 'u-erick', name: 'Erick', role: 'lead' },
  { id: 'u-julius', name: 'Julius', role: 'core' },
  { id: 'u-alperen', name: 'Alperen', role: 'core' },
  { id: 'u-gavin', name: 'Gavin', role: 'core' },
];

export const SAMPLE_PEOPLE: SamplePerson[] = [
  { id: 'maya', name: 'Maya Okafor', joined: '2026-11-04', discord: 'maya.builds', github: 'mokafor', city: 'Houston', country: 'United States', lat: 29.76, lng: -95.37, tz: 'America/Chicago', map: 'city',
    source: 'X · Longshot pack teardown', ref: 'x-longshot-teardown', wantsToBuild: 'A Longshot pack for my own Quiver first, then packs for other people\'s', lanes: ['hardware', 'engineer'],
    can: ['Electrical', 'Power', 'Assembly'], learn: ['Firmware'], tools: ['solder', 'spot', 'scope', 'fdm'], build: ['own', 'day'], hours: '5–10 h/wk', when: 'Weekday evenings', travel: 'up to 300 km',
    wants: ['learning', 'paid', 'own'], callOk: true, status: 'talked', owner: 'u-thomas',
    next: 'Invite to the Longshot PT2 build weekend; intro to Julius', goodFor: ['Longshot pack build', 'Harness and wiring'],
    blurb: 'Utility field tech in Houston. Built a 14S e-bike pack from salvaged cells. Here to build Longshot packs.',
    story: 'I built a 48 V, 14S5P e-bike pack from salvaged laptop cells. My first capacitor spot welder kept blowing through the nickel strip, so I rebuilt it around a car battery and a timed relay. The first pack ran three months, then a sense lead chafed through on the frame and took the BMS with it. Pack two has fused sense leads and strain relief on every wire. It is at 4,000 km now.' },
  { id: 'jake', name: 'Jake Whitfield', joined: '2026-11-09', discord: 'jwhitfield', github: null, city: 'San Antonio', country: 'United States', lat: 29.42, lng: -98.49, tz: 'America/Chicago', map: 'city',
    source: 'Word of mouth', ref: 'discord-welcome', wantsToBuild: 'Machined parts for Quiver and Spearhead that fit the first time', lanes: ['hardware'],
    can: ['Machining', 'Assembly', '3D Printing'], learn: ['Composites'], tools: ['lathe', 'mill', 'weld', 'fdm'], build: ['parts', 'day'], hours: '5–10 h/wk', when: 'Weekends', travel: 'anywhere in Texas',
    wants: ['mission', 'paid'], callOk: true, status: 'new', introQueue: true,
    blurb: 'Machinist, 20 years in oilfield tooling. Lathe, mill and a TIG welder in the garage.',
    story: 'I turned a set of spindle adapters for a 1940s South Bend lathe when nobody made them anymore. The first set chattered because I trusted the old ways and skipped indicating the chuck; the second set runs true to two tenths. I like parts that have to fit something that already exists.' },
  { id: 'diego', name: 'Diego Ramírez', joined: '2026-11-08', discord: 'diegofpv', github: 'dramirez-fpv', city: 'Monterrey', country: 'Mexico', lat: 25.69, lng: -100.32, tz: 'America/Monterrey', map: 'city',
    source: 'Discord', ref: 'discord-welcome', wantsToBuild: 'A flight-test program for Quiver: logs, checklists, the boring parts', lanes: ['fly'],
    can: ['Piloting', 'Flight Test', 'Maintenance'], learn: ['Telemetry'], tools: ['field', 'aircraft', 'solder'], build: ['fly'], hours: '10+ h/wk', when: 'Flexible', travel: 'up to 1,000 km',
    wants: ['paid', 'job'], callOk: true, status: 'new', introQueue: true,
    blurb: 'Ag-spray drone pilot. 900 hours on 25 kg-class aircraft. Looking for flight test work.',
    story: 'I fly a 30 L spray drone for orange growers. Last season a motor ESC browned out mid-field and I landed on five motors; afterwards I logged every flight and found the ESC ran 20 C hotter on the side facing the sun. We moved it under the frame and it never happened again.' },
  { id: 'hannah', name: 'Hannah Lee', joined: '2026-11-02', discord: 'hannah.lee', github: null, city: 'Auckland', country: 'New Zealand', lat: -36.85, lng: 174.76, tz: 'Pacific/Auckland', map: 'city',
    source: 'X', ref: 'x-spearhead-wing-test', wantsToBuild: 'Spearhead\'s wing skins, in carbon', lanes: ['hardware'],
    can: ['Composites', 'Assembly'], learn: ['Aerodynamics'], tools: ['composite', 'fdm'], build: ['parts'], hours: '5–10 h/wk', when: 'Weekday evenings', travel: 'Auckland only',
    wants: ['learning', 'mission'], callOk: true, status: 'new', introQueue: true,
    blurb: 'Boatbuilder turned composites tech. Vacuum bagging, moulds, carbon layups.',
    story: 'I built the moulds for a 6 m racing dinghy foil. The first foil delaminated at the root because the core was too cold when we laid up; now I heat the shop overnight before any layup and log humidity.' },
  { id: 'tomasz', name: 'Tomasz Wiśniewski', joined: '2026-10-30', discord: 'tomwis', github: 'twisniewski', city: 'Gdańsk', country: 'Poland', lat: 54.35, lng: 18.65, tz: 'Europe/Warsaw', map: 'city',
    source: 'GitHub · project-quiver', ref: 'gh-quiver', wantsToBuild: 'A parametric Spearhead structure in build123d', lanes: ['engineer'],
    can: ['CAD', 'Mechanical'], learn: ['Composites'], tools: ['cnc', 'fdm'], build: ['parts'], hours: '2–5 h/wk', when: 'Weekends', travel: 'Europe',
    wants: ['learning'], callOk: true, status: 'invited', owner: 'u-alperen',
    blurb: 'Mechanical engineer, ship systems. build123d convert.', story: 'Rebuilt a 3D-printer frame in build123d so every bracket regenerates from three numbers.' },
  { id: 'noor', name: 'Noor Haddad', joined: '2026-10-28', discord: 'noorh', github: 'noorhaddad', city: 'Amman', country: 'Jordan', lat: 31.95, lng: 35.93, tz: 'Asia/Amman', map: 'city',
    source: 'X · Spearhead wing test', ref: 'x-spearhead-wing-test', wantsToBuild: 'A better wing for Spearhead PT2', lanes: ['engineer'],
    can: ['Aerodynamics', 'Simulation'], learn: ['CAD'], tools: [], build: [], hours: '5–10 h/wk', when: 'Weekday days', travel: 'no',
    wants: ['learning', 'paid'], callOk: true, status: 'booked', owner: 'u-thomas',
    blurb: 'Aero grad, OpenFOAM and XFLR5. Wants a real wing to work on.', story: 'Wrote my thesis on low-Reynolds airfoils for small UAVs and ran the wind tunnel myself.' },
  { id: 'omar', name: 'Omar Farouk', joined: '2026-10-26', discord: 'ofarouk', github: 'ofarouk', city: 'Austin', country: 'United States', lat: 30.27, lng: -97.74, tz: 'America/Chicago', map: 'city',
    source: 'GitHub · quiver-sdk', ref: 'gh-quiver', wantsToBuild: 'CAN telemetry from the BMS to QuiverHub', lanes: ['code', 'engineer'],
    can: ['Firmware', 'Controls'], learn: ['Autonomy'], tools: ['solder', 'scope', 'fdm'], build: ['day'], hours: '2–5 h/wk', when: 'Weekday evenings', travel: 'up to 300 km',
    wants: ['paid'], callOk: true, status: 'talked', owner: 'u-thomas',
    blurb: 'Embedded engineer. CAN, STM32, too many logic analysers.', story: 'Wrote a CAN bootloader that survived a brownout test of 10,000 power cycles on the second try.' },
  { id: 'aiko', name: 'Aiko Tanaka', joined: '2026-10-12', discord: 'aiko.t', github: 'aikotanaka', city: 'Osaka', country: 'Japan', lat: 34.69, lng: 135.5, tz: 'Asia/Tokyo', map: 'city',
    source: 'X · QuiverHub demo', ref: 'x-quiverhub', wantsToBuild: 'Obstacle avoidance that doesn\'t see ghosts', lanes: ['code'],
    can: ['Software', 'Autonomy'], learn: ['Simulation'], tools: ['fdm'], build: [], hours: '5–10 h/wk', when: 'Weekends', travel: 'no',
    wants: ['learning', 'mission'], callOk: false, status: 'active', owner: 'u-erick',
    blurb: 'ROS 2 and path planning by day. QuiverHub contributor.', story: 'Built an obstacle-avoidance stack for a warehouse robot that kept seeing ghosts in reflective tape.' },
  { id: 'samuel', name: 'Samuel Kiprono', joined: '2026-09-30', discord: 'skiprono', github: null, city: 'Nairobi', country: 'Kenya', lat: -1.29, lng: 36.82, tz: 'Africa/Nairobi', map: 'city',
    source: 'Word of mouth', ref: null, wantsToBuild: 'Medical delivery routes to clinics upcountry in Kenya', lanes: ['fly', 'dao'],
    can: ['Missions', 'Business Development', 'Regulatory'], learn: ['Piloting'], tools: [], build: ['host'], hours: '5–10 h/wk', when: 'Flexible', travel: 'East Africa',
    wants: ['business'], callOk: false, status: 'active', owner: 'u-thomas',
    blurb: 'Medical-supply logistics. Exploring drone delivery routes upcountry.', story: 'Ran cold-chain vaccine delivery for county clinics on motorbikes.' },
  { id: 'lena', name: 'Lena Hofmann', joined: '2026-11-03', discord: 'lenah', github: null, city: 'Munich', country: 'Germany', lat: 48.14, lng: 11.58, tz: 'Europe/Berlin', map: 'city',
    source: 'arrowair.com', ref: 'site-get-involved', wantsToBuild: 'A ground station people enjoy holding', lanes: ['story', 'engineer'],
    can: ['Industrial', 'Interface'], learn: ['Composites'], tools: ['laser', 'fdm'], build: [], hours: '2–5 h/wk', when: 'Weekday evenings', travel: 'Europe',
    wants: ['mission'], callOk: false, status: 'new',
    blurb: 'Industrial designer, consumer hardware. Would love to design a ground station.', story: 'Designed a handheld meter that passed a 1.5 m drop test on the fourth housing.' },
  { id: 'priya', name: 'Priya Raman', joined: '2026-09-14', discord: 'priya.r', github: 'priyaraman', city: null, country: 'India', lat: 22.5, lng: 79.0, tz: 'Asia/Kolkata', map: 'country',
    source: 'YouTube', ref: null, wantsToBuild: 'Guides a first-time builder can follow', lanes: ['story'],
    can: ['Documentation', 'Media'], learn: ['CAD'], tools: [], build: [], hours: '2–5 h/wk', when: 'Weekends', travel: 'no',
    wants: ['learning'], callOk: false, status: 'quiet', owner: 'u-gavin',
    blurb: 'Technical writer. Turns build logs into guides.', story: 'Wrote the assembly guide for a kit telescope that cut support emails in half.' },
  { id: 'rafael', name: 'Rafael Costa', joined: '2026-11-01', discord: 'rcosta', github: null, city: 'São José dos Campos', country: 'Brazil', lat: -23.18, lng: -45.88, tz: 'America/Sao_Paulo', map: 'city',
    source: 'LinkedIn', ref: null, wantsToBuild: 'A certification path for Spearhead', lanes: ['engineer'],
    can: ['Certification', 'Safety', 'Aerodynamics'], learn: ['Regulatory'], tools: [], build: [], hours: '2–5 h/wk', when: 'Weekday evenings', travel: 'no',
    wants: ['mission'], callOk: true, status: 'invited', owner: 'u-thomas',
    blurb: 'Certification engineer, 12 years on business jets.', story: 'Led the compliance plan for a cabin change that needed 31 test reports.' },
  // Added by the team: no account yet. Their skills are the team's guess, never "said".
  { id: 'ade', name: 'Ade Bankole', joined: null, added: { by: 'u-julius', on: '2026-11-05', how: 'Answers BMS questions in #longshot' }, discord: 'ade.b', github: null,
    city: 'Dallas', country: 'United States', lat: 32.78, lng: -96.8, tz: 'America/Chicago', map: 'off', source: 'Answers BMS questions in #longshot (Discord, right-click)', ref: null,
    can: [], learn: [], guess: ['Electrical', 'Power'], tools: [], build: [], wants: [], callOk: false, status: 'new', owner: 'u-julius',
    goodFor: ['Longshot BMS', 'Pack build day'], next: 'Thomas or Julius: invite to a call', introQueue: true },
  { id: 'rosa', name: 'Rosa Delgado', joined: null, added: { by: 'u-thomas', on: '2026-11-03', how: 'Met at a build day in Austin' }, discord: null, github: null, email: 'rosa@example.com',
    city: 'Waco', country: 'United States', lat: 31.55, lng: -97.15, tz: 'America/Chicago', map: 'off', source: 'Met at a build day in Austin', ref: null,
    can: [], learn: [], guess: ['Machining', 'Sourcing', 'Quality'], tools: ['cnc', 'mill', 'laser', 'weld'], build: [], wants: [], callOk: false, status: 'invited', owner: 'u-thomas',
    goodFor: ['Longshot enclosure plates', 'Quiver arm brackets'], next: 'Follow up Nov 15 if no answer' },
  { id: 'kenji', name: 'Kenji Mori', joined: null, added: { by: 'u-erick', on: '2026-10-30', how: '3 merged PRs in project-quiver, never on Discord' }, discord: null, github: 'kmori',
    city: 'Sapporo', country: 'Japan', lat: 43.06, lng: 141.35, tz: 'Asia/Tokyo', map: 'off', source: 'Repo suggestions: 3 merged PRs in project-quiver', ref: null,
    can: [], learn: [], guess: ['Software', 'Telemetry'], tools: [], build: [], wants: [], callOk: false, status: 'new', owner: 'u-erick',
    goodFor: ['QuiverHub telemetry'], next: 'Erick: email about QuiverHub telemetry' },
];

/** Team notes, newest first: [kind, author, date, body]. */
export const SAMPLE_NOTES: Record<string, [NoteKind, string, string, string][]> = {
  maya: [
    ['call', 'u-thomas', '2026-11-06', '20 minutes. Field tech at a utility, evenings free. Wants a pack for her own Quiver first, then to build packs for others. Straight about what she doesn\'t know. Next: invite her to the Longshot PT2 build weekend, and intro to Julius.'],
    ['review', 'u-julius', '2026-11-05', 'Watched her pack build video. Welds are even, sense leads fused and strain-relieved. I would trust her assembling a Longshot pack from the guide. Not BMS design yet, and she says so herself.'],
  ],
  omar: [['call', 'u-thomas', '2026-11-07', 'Great with CAN; ask him about BMS telemetry. Wants paid work, small chunks.'], ['note', 'u-erick', '2026-10-29', 'Opened a clean PR to quiver-sdk (docs only). Responsive in review.']],
  aiko: [['note', 'u-erick', '2026-11-02', 'Owns the QuiverHub obstacle-avoidance thread now. Reliable; ships on weekends.'], ['review', 'u-erick', '2026-10-20', 'Second PR merged. Tests included without being asked.'], ['call', 'u-thomas', '2026-10-15', 'Wants to learn simulation. Point her at the SITL setup.']],
  tomasz: [['note', 'u-alperen', '2026-11-01', 'His build123d bracket PR is good. Invited him to talk about Spearhead PT2 structure.']],
  noor: [['note', 'u-thomas', '2026-10-30', 'Call booked for Thu. Ask about the Spearhead wing test data.']],
  samuel: [['review', 'u-thomas', '2026-11-05', 'Route survey doc is excellent. Retro candidate.'], ['note', 'u-gavin', '2026-10-22', 'Would write a community solution post about the route survey.'], ['note', 'u-thomas', '2026-10-20', 'Introduced to KBM for the Kenya CAA question.'], ['call', 'u-thomas', '2026-10-02', 'Serious about delivery routes. Needs aircraft and regulatory help, not money.']],
  priya: [['note', 'u-gavin', '2026-10-01', 'Did a great first pass on the Quiver pilot handbook, then went quiet. Check in?']],
  ade: [['note', 'u-julius', '2026-11-05', 'Answers cell-matching and BMS questions in #longshot, better than our guide does. Says he works at a battery recycler in Dallas. Worth a call.']],
  rosa: [['note', 'u-thomas', '2026-11-03', 'Met her at the Austin build day. Runs a five-person machine shop in Waco: a mini mill, a fiber laser, a press brake. Quotes parts for robotics teams. Wants paid parts work, not volunteering. Gave me her email.']],
  kenji: [['note', 'u-erick', '2026-10-30', 'Three good PRs to project-quiver last spring (telemetry docs, a parameter fix, mission examples), then nothing. Never on Discord. QuiverHub telemetry needs someone like this.']],
};

/** Skill checks: [discipline, verdict, by, date]. */
export const SAMPLE_SKILLS: Record<string, [string, 'seen_work' | 'talked' | 'tested', string, string][]> = {
  maya: [['Electrical', 'seen_work', 'u-julius', '2026-11-05'], ['Assembly', 'seen_work', 'u-julius', '2026-11-05']],
};
