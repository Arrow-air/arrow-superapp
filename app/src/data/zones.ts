// Working zones: the places work happens. Gavin's frame puts them in the
// sidebar; any zone can hold threads, votes and decisions. Each zone also
// says what already exists for it in the repositories, so the page opens on
// real work rather than an empty room.

export interface Zone {
  id: string;
  /** One or two sentences: what this zone is for, in Quiver's own terms. */
  summary: string;
  tasks?: string[];
  issues?: number[];
  prs?: number[];
  parts?: string[];
  links?: { label: string; url: string }[];
  /** Attachment catalog entry shown at the top of the zone. */
  attachment?: string;
  /** A zone-specific card under the summary. */
  card?: 'longshot';
}

const PS = 'https://github.com/Arrow-air/payload-systems';
const PQ = 'https://github.com/Arrow-air/project-quiver';
const SDK = 'https://github.com/Arrow-air/quiver-sdk';

export const zones: Zone[] = [
  // Attachments
  {
    id: 'interface',
    summary: 'The standard every attachment builds against: three quick-release ports, what power, network and signals each one carries, and the mechanical mate. Changes here affect every payload.',
    issues: [234],
    parts: ['2112', '3331'],
    links: [
      { label: 'Interface Control Document (ICD 1.0-draft)', url: `${PS}/blob/main/interface/ICD.md` },
      { label: 'Payload template', url: `${PS}/tree/main/payloads/_template` },
    ],
  },
  {
    id: 'dev-guide',
    summary: 'The one document a third party reads to build a Quiver attachment: connect it physically, power it without browning out the aircraft, and talk to the flight controller and QuiverHub.',
    tasks: ['T-05'],
    prs: [270],
    links: [{ label: 'Quiver SDK developer guide', url: `${PQ}/blob/main/docs/Develop-Attachments-Software/Quiver-SDK-Developer-Guide.md` }],
  },
  { id: 'payload-latch', attachment: 'payload-latch', summary: 'Servo-driven cargo hook for slung loads on the bottom port. V1 flew at the August meetup; V2 opens when the V1 note lands.', tasks: ['T-07', 'T-11'] },
  { id: 'multispectral', attachment: 'multispectral', summary: 'Fixed nadir mount for the MAPIR Survey3 RGN camera, triggered by the flight controller. V1 flew at the August meetup; V2 opens when the V1 note lands.', tasks: ['T-06', 'T-11'] },
  { id: 'ram-ball', attachment: 'ram-ball', summary: 'One printed part that puts a 1.5" RAM Size-C ball on any port, so anything in the RAM ecosystem can hang off Quiver.' },
  { id: 'spreader', attachment: 'spreader', summary: 'An adapter board for the JMRRC FS2516 granular spreader, as a DroneCAN reference design. It is also where the payload power limit was hit in practice.', issues: [233, 234] },
  {
    id: 'concepts',
    summary: 'Attachments with requirements already written, waiting for someone to pick them up: cargo container, aerial LiDAR, machine vision, a magnification camera, a stabilized sensor carrier, and a flood light.',
    links: [
      { label: 'Payload concepts in payload-systems', url: `${PS}#payload-concepts` },
      { label: 'Detailed attachment requirements', url: `${PQ}/tree/main/task-grant-bounty/equipment/attachment/0002-detailed_attachment_requirement_for_bounty` },
    ],
  },
  {
    id: 'attachment-ideas',
    summary: 'The best payload is the one you actually need. Propose an attachment here before it has requirements; the ones that gather support become concepts.',
    links: [{ label: 'Possible attachments list', url: `${PQ}/blob/main/task-grant-bounty/equipment/attachment/0001-possible_attachment_list/information-note.md` }],
  },

  // Software
  {
    id: 'sdk',
    summary: 'A Python SDK so developers can control the vehicle, the camera and attachments without thinking about MAVLink: one pip install, offline-first, runs on the onboard Pi or a ground laptop.',
    links: [
      { label: 'quiver-sdk repository', url: SDK },
      { label: 'Planning document', url: `${SDK}/blob/main/PLANNING.md` },
      { label: 'Examples: takeoff, battery monitor, photo, spray mission', url: `${SDK}/tree/main/examples` },
    ],
  },
  {
    id: 'quiverhub',
    summary: 'The companion-computer software on the onboard Raspberry Pi. V1 shipped; the next scope is written after it runs on the Houston unit.',
    tasks: ['T-18', 'T-12'],
  },
  {
    id: 'ground-station',
    summary: 'What the operator sees and presses in the field: the RC remote, the ground station, and the video and telemetry link. Interface improvements for operators go here.',
    parts: ['3280', '3230', '3240'],
  },
  {
    id: 'autonomy',
    summary: 'Obstacle avoidance with the 360° LiDAR and forward radar, return-to-launch, and autonomous missions. QGB-02 tests, tunes and documents obstacle avoidance.',
    issues: [203],
    prs: [247, 246],
    parts: ['3210', '3290'],
  },
  {
    id: 'parameters',
    summary: 'The flight-controller parameter card, failsafes, and the Lua scripts that run on the flight controller. Changes that deviate from the baseline get their own pull request.',
    tasks: ['T-01'],
    prs: [222],
  },
  {
    id: 'flight-data',
    summary: 'Flight logs and test campaigns: the tracking platform at flights.arrowair.com, the endurance study, the flight test campaign, and the reliability numbers built from them.',
    tasks: ['T-14', 'T-17', 'T-03'],
    links: [
      { label: 'flights.arrowair.com', url: 'https://flights.arrowair.com' },
      { label: '20-hour flight plan', url: `${PQ}/blob/main/flight-test/20hr-flight-plan.md` },
    ],
  },

  // Aircraft
  {
    id: 'airframe',
    summary: 'Frame, plates, arms and the sealed cockpit.',
    parts: ['1111', '1112'],
    prs: [266],
  },
  {
    id: 'gps-rf',
    summary: 'GNSS placement and everything that interferes with it. The M9N loses satellites with the Ethernet switches installed; diagnosing the cause (T-13, the spectrum analyzer) and choosing the fix both happen here.',
    tasks: ['T-13'],
    issues: [191],
    prs: [267],
    parts: ['3250', '3251', '2331', '3313'],
  },
  {
    id: 'propulsion',
    summary: 'Motors, ESCs and propellers: four Hobbywing X6 Plus units on folding arms, 24-inch props.',
    parts: ['3111', '3112', '3122', '1411', '1412'],
  },
  {
    id: 'power',
    card: 'longshot',
    summary: 'The big goal here: integrate Longshot, Arrow\'s own 14S9P battery pack, as a drop-in replacement for the Tattu 4.0 30 Ah. It should fit the same bay, but the connector, BMS telemetry, failsafe values and charging all need checking, and then it needs testing in flight.',
    issues: [248, 188],
    parts: ['3410', '3320', '2211'],
    links: [
      { label: 'project-longshot', url: 'https://github.com/Arrow-air/project-longshot' },
      { label: 'Longshot specs and weight (LS #26)', url: 'https://github.com/Arrow-air/project-longshot/issues/26' },
      { label: 'Longshot build123d model (LS PR #27)', url: 'https://github.com/Arrow-air/project-longshot/pull/27' },
    ],
  },
  {
    id: 'avionics',
    summary: 'Flight controller, companion computer, Ethernet switches and the onboard network every device and attachment shares.',
    parts: ['3312', '3313', '3201'],
  },
  {
    id: 'harness',
    summary: 'The wiring that ties it all together: the busbars and the 28 harnesses (HAR-0001 to HAR-0028) for ESC power and signal, payload ports, sensors, radios and GNSS, with their connectors. Built from the Harness Manufacturing Guide.',
    parts: ['4010', 'HAR-0004', 'HAR-0008', 'HAR-0012', 'HAR-0014', 'HAR-0021'],
    issues: [147, 119, 110, 95],
    prs: [235],
    links: [{ label: 'Harness Manufacturing Guide', url: `${PQ}/blob/main/docs/Manufacturing/Harness-Manufacturing-Guide.mdx` }],
  },
  {
    id: 'pilots-handbook',
    summary: 'The Pilot\'s Handbook, field edition: what the logs cannot say.',
    tasks: ['T-04'],
    links: [{ label: 'Pilot\'s Handbook', url: `${PQ}/blob/main/docs/Operations/Pilot-Handbook.md` }],
  },
  {
    id: 'maintenance',
    summary: 'Keeping units flying: inspections, wear parts, and repairs in the field.',
    links: [{ label: 'Maintenance guide', url: `${PQ}/blob/main/docs/Operations/Maintenance-Guide.md` }],
  },

  // Build
  {
    id: 'assembly',
    summary: 'Assembly and manufacturing guides: what a new builder follows to put a Quiver together.',
    issues: [179],
    prs: [223],
    links: [{ label: 'Assembly guides', url: 'https://arrowair.com/quiver/category/manufacturing/' }],
  },
  {
    id: 'config-guide',
    summary: 'The Initial Configuration Guide: a builder who has never seen the first unit configures a new aircraft from it alone.',
    tasks: ['T-02', 'T-16'],
    prs: [232],
  },
  {
    id: 'case',
    summary: 'The transport case, its foam inserts, and getting a finished unit to a customer.',
  },
  {
    id: 'manufacturers',
    summary: 'Quiver is open hardware (CERN-OHL-S). Bringing on more manufacturers: what a new builder needs to get started, and how what one learns selling carries over to the others.',
  },
  {
    id: 'suppliers',
    summary: 'Where the parts come from and what a unit costs to build, from the BOM.',
  },

  // Selling
  {
    id: 'road-to-selling',
    summary: 'What stands between Quiver and US sales, as Thomas listed it on the Sep 29 call.',
  },
  { id: 'where-we-sell', summary: 'The Arrow store, a local page, or both. Thomas wants sales to be the Quiver focus for the coming months.' },
  { id: 'who-we-sell-to', summary: 'Who buys a Quiver and what they use it for: integrators, attachment developers, operators, and local customers.' },
  { id: 'pricing', summary: 'What a unit, a dev kit and the attachments cost to buy.' },
  { id: 'sales-page', summary: 'The arrowair.com sales page refresh, scoped at the October checkpoint once the marketing discovery is filed.', tasks: ['T-15'] },
  { id: 'dao-return', summary: 'Every sale runs through the Arrow store process and pays back to the DAO. How much, and how, is not written down yet.' },
];

export const zoneById = (id: string | undefined) => zones.find((z) => z.id === id);
