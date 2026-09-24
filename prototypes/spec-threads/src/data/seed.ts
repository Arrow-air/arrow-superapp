// Seed data for the demo backend.
//
// EVERYTHING HERE IS ILLUSTRATIVE. The people are fictional personas, the token balances
// are made up, and the engineering numbers in the positions are placeholders written to make
// the threads feel real. None of it is an Arrow decision or a Spearhead or Quiver specification.
//
// Spearhead is the live case from the 2026-09-23 call: PT1 is being built, PT2 is in
// discussion with a freeze date, PT3 exists to defer into. One PT2 thread is already resolved
// so the register is not empty. The Quiver power-budget thread is arranged so that weighting
// changes the winner: the crowd's favourite position is not the one the domain expert, the
// builder, and the lead prefer. Quiver Mini is empty on purpose: it is the re-run of the earlier
// experiment, waiting for threads (possibly seeded by Vector from the repos).

import { DEFAULT_WEIGHTS } from '../lib/weights';
import type {
  BuilderIntent,
  Comment,
  Decision,
  Grant,
  Member,
  Position,
  Project,
  ProjectRole,
  Thread,
  Vote,
} from '../lib/types';

export interface DemoState {
  actingAs: string | null;
  projects: Project[];
  members: Member[];
  roles: ProjectRole[];
  threads: Thread[];
  positions: Position[];
  votes: Vote[];
  intents: BuilderIntent[];
  comments: Comment[];
  decisions: Decision[];
  grants: Grant[];
}

const t = (day: number, hour: number) => new Date(Date.UTC(2026, 8, day, hour)).toISOString();
const weights = () => ({ ...DEFAULT_WEIGHTS, roleMultiplier: { ...DEFAULT_WEIGHTS.roleMultiplier } });

export function seedState(): DemoState {
  const members: Member[] = [
    { id: 'm-lena', handle: 'lena-lead', displayName: 'Lena (Quiver lead)', tokenBalance: 40_000, expertise: ['airframe', 'systems'], location: 'Texas, US', bio: 'Persona: project lead on Quiver and Quiver Mini.' },
    { id: 'm-omar', handle: 'omar-spear', displayName: 'Omar (Spearhead lead)', tokenBalance: 25_000, expertise: ['airframe', 'propulsion'], location: 'Istanbul, TR', bio: 'Persona: project lead on Spearhead. Building PT1, reading the PT2 threads.' },
    { id: 'm-jun', handle: 'jun-pcb', displayName: 'Jun (PCB expert)', tokenBalance: 6_000, expertise: ['pcb', 'power', 'firmware'], location: 'Munich, DE', bio: 'Persona: electronics contributor with domain expertise.' },
    { id: 'm-rosa', handle: 'rosa-ranch', displayName: 'Rosa (operator, will build)', tokenBalance: 12_000, expertise: ['operations', 'propulsion'], location: 'New Mexico, US', bio: 'Persona: runs a workshop and intends to build and fly this.' },
    { id: 'm-whale', handle: 'big-holder', displayName: 'Big Holder', tokenBalance: 900_000, expertise: [], location: 'Singapore', bio: 'Persona: large token holder, not hands-on.' },
    { id: 'm-ade', handle: 'ade-new', displayName: 'Ade (new member)', tokenBalance: 0, expertise: ['design'], location: 'Lagos, NG', bio: 'Persona: enthusiastic newcomer.' },
    { id: 'm-kim', handle: 'kim-sw', displayName: 'Kim (software)', tokenBalance: 2_500, expertise: ['firmware', 'sdk'], location: 'Seoul, KR', bio: 'Persona: SDK contributor.' },
    { id: 'm-sam', handle: 'sam-member', displayName: 'Sam (member)', tokenBalance: 300, expertise: [], location: 'Leeds, UK', bio: 'Persona: casual community member.' },
  ];

  const projects: Project[] = [
    {
      id: 'spearhead',
      name: 'Spearhead',
      weights: weights(),
      systems: ['airframe', 'propulsion', 'avionics', 'power', 'payload', 'software'],
      versions: [
        { id: 'sh-pt1', name: 'PT1', state: 'building', order: 1 },
        { id: 'sh-pt2', name: 'PT2', state: 'discussing', order: 2, freezeTarget: '2026-11-15' },
        { id: 'sh-pt3', name: 'PT3', state: 'planned', order: 3 },
      ],
    },
    {
      id: 'quiver',
      name: 'Quiver',
      weights: weights(),
      systems: ['airframe', 'attachments', 'avionics', 'power', 'software'],
      versions: [
        { id: 'qv-1', name: 'v1', state: 'building', order: 1 },
        { id: 'qv-2', name: 'v2', state: 'discussing', order: 2, freezeTarget: '2026-12-01' },
        { id: 'qv-3', name: 'v3', state: 'planned', order: 3 },
      ],
    },
    {
      id: 'quiver-mini',
      name: 'Quiver Mini',
      weights: weights(),
      systems: ['airframe', 'propulsion', 'avionics', 'software'],
      versions: [
        { id: 'qm-1', name: 'Mini v1', state: 'discussing', order: 1 },
        { id: 'qm-2', name: 'Mini v2', state: 'planned', order: 2 },
      ],
    },
  ];

  const roles: ProjectRole[] = [
    { projectId: 'spearhead', memberId: 'm-omar', role: 'lead' },
    { projectId: 'spearhead', memberId: 'm-jun', role: 'core' },
    { projectId: 'spearhead', memberId: 'm-rosa', role: 'core' },
    { projectId: 'quiver', memberId: 'm-lena', role: 'lead' },
    { projectId: 'quiver', memberId: 'm-jun', role: 'core' },
    { projectId: 'quiver', memberId: 'm-kim', role: 'core' },
    { projectId: 'quiver-mini', memberId: 'm-lena', role: 'lead' },
  ];

  const threads: Thread[] = [
    {
      id: 'n-engine',
      projectId: 'spearhead',
      versionId: 'sh-pt2',
      system: 'propulsion',
      title: 'Gasoline engine integration: what does the engine PCB have to do?',
      body: [
        'PT2 gets a gasoline engine. PT1 flew electric, so nothing on the current avionics talks to an ignition, a throttle servo, or a fuel sender. Before anyone lays out a board we should agree what it carries.',
        '',
        'If this thread does its job, the freeze turns it straight into a grant for an electrical engineer, with the spec already written here.',
        '',
        '**Reply with a position:** inputs, outputs, buses, power, mass. Say what it serves and what it leaves out.',
        '',
        '_Illustrative thread. The numbers in the replies are placeholders, not Spearhead specifications._',
      ].join('\n'),
      tags: ['pcb', 'propulsion', 'power'],
      authorId: 'm-omar',
      status: 'open',
      createdAt: t(19, 15),
      deferrals: [],
    },
    {
      id: 'n-avionics',
      projectId: 'spearhead',
      versionId: 'sh-pt2',
      system: 'avionics',
      title: 'Avionics carrier for PT2: what goes on the board?',
      body: [
        'PT1 flies on a hand-wired carrier. PT2 should get a proper avionics carrier board. Before anyone lays it out we should agree what it carries: flight controller interface, power distribution, CAN, telemetry, payload breakouts.',
        '',
        '**Reply with a position.** A short expert hint is welcome too, for example "run two CAN buses and here is why."',
        '',
        '_Illustrative thread._',
      ].join('\n'),
      tags: ['pcb', 'firmware'],
      authorId: 'm-omar',
      status: 'open',
      createdAt: t(16, 9),
      deferrals: [],
    },
    {
      id: 'n-payload',
      projectId: 'spearhead',
      versionId: 'sh-pt2',
      system: 'payload',
      title: 'Payload bay for PT2: fixed mounts or modular rails?',
      body: [
        'PT1 has one payload bolted in. PT2 will carry different payloads on different days. Fixed mounts are light and rigid; rails cost mass and add a failure point but let an operator swap in the field.',
        '',
        '_Illustrative thread. Not much discussion yet; a candidate for deferral to PT3._',
      ].join('\n'),
      tags: ['airframe', 'payload'],
      authorId: 'm-rosa',
      status: 'open',
      createdAt: t(21, 17),
      deferrals: [],
    },
    {
      id: 'n-wingspan',
      projectId: 'spearhead',
      versionId: 'sh-pt2',
      system: 'airframe',
      title: 'PT2 wingspan: stay under 3 m so it fits a trailer?',
      body: [
        'Every metre of span buys endurance and costs transport. PT1 is 2.6 m and fits in the ranch trailer. PT2 is heavier and wants more wing.',
        '',
        '_Illustrative thread, already resolved by the lead as a requirement._',
      ].join('\n'),
      tags: ['airframe'],
      authorId: 'm-omar',
      status: 'resolved',
      createdAt: t(12, 10),
      resolution: {
        kind: 'spec',
        decisionId: 'd-wingspan',
        positionId: 's-span-3',
        weightedRankAtResolution: 1,
        rawRankAtResolution: 1,
        byMemberId: 'm-omar',
        at: t(20, 9),
      },
      deferrals: [],
    },
    {
      id: 'n-power',
      projectId: 'quiver',
      versionId: 'qv-2',
      system: 'attachments',
      title: 'Attachment interface: how much power should it supply?',
      body: [
        'Attachments (sprayers, cameras, droppers) all draw from the attachment interface. The power budget has to be fixed before the next interface board revision.',
        '',
        'Different workshops want different things. A spray rig wants a lot of continuous current. A camera gimbal wants clean low-noise rails. Every watt we reserve costs battery and harness weight for everyone.',
        '',
        '**Reply with a position:** voltage rails, continuous and peak current, connector, protection. Say who it serves and who it leaves out.',
        '',
        '_Illustrative thread. Numbers in the replies are placeholders, not Quiver specifications._',
      ].join('\n'),
      tags: ['power', 'pcb'],
      authorId: 'm-lena',
      status: 'open',
      createdAt: t(14, 15),
      deferrals: [],
    },
  ];

  const positions: Position[] = [
    // Engine PCB (Spearhead PT2)
    {
      id: 's-ecu',
      threadId: 'n-engine',
      authorId: 'm-jun',
      body: [
        '### One engine interface board, DroneCAN to the flight controller',
        '',
        '- Input 6S to 12S (22 V to 50 V) from the main bus, reverse-polarity and surge protected',
        '- Ignition: CDI trigger output, 5 V PWM, galvanically isolated from the logic side',
        '- Engine RPM from a Hall sensor, 0 to 12 kHz',
        '- Throttle servo: PWM 50 Hz, 1000 to 2000 µs, with a hardware failsafe to idle',
        '- Fuel level: 0 to 5 V analog sender input',
        '- CHT and EGT: two K-type thermocouple inputs',
        '- One DroneCAN bus to the flight controller; no second bus on this board',
        '- Mass under 25 g, board under 60 × 40 mm',
        '',
        'Serves: any single gasoline engine with CDI ignition and a servo throttle. Leaves out: EFI engines, which bring their own ECU and would talk to this board over CAN.',
        '',
        '_Placeholder figures._',
      ].join('\n'),
      createdAt: t(19, 18),
    },
    {
      id: 's-ots',
      threadId: 'n-engine',
      authorId: 'm-sam',
      body: [
        '### Buy an off-the-shelf ECU and make an adapter',
        '',
        '- Use a hobby ECU with its own ignition and RPM handling',
        '- Our board is only a level shifter and a connector adapter',
        '',
        'Serves: getting PT2 flying sooner. Leaves out: telemetry into the flight controller, which most hobby ECUs do not expose.',
      ].join('\n'),
      createdAt: t(20, 8),
    },
    {
      id: 's-kill',
      threadId: 'n-engine',
      authorId: 'm-rosa',
      body: [
        '### Hint: whatever the board is, it must have a hardware kill input',
        '',
        'An engine kill line straight from the RC link, independent of the flight controller. If the FC hangs, you still stop the engine on the ground. Costs one opto-isolated input.',
      ].join('\n'),
      createdAt: t(20, 14),
    },
    // Avionics carrier (Spearhead PT2)
    {
      id: 's-can',
      threadId: 'n-avionics',
      authorId: 'm-jun',
      body: [
        '### Hint: run two CAN buses',
        '',
        'Put flight-critical nodes (ESCs, GPS, airspeed) on one bus and payload plus telemetry on the other. A chatty or faulty payload then cannot starve the flight-critical bus. It costs one more transceiver and a connector.',
      ].join('\n'),
      createdAt: t(16, 13),
    },
    // Payload bay (Spearhead PT2)
    {
      id: 's-rails',
      threadId: 'n-payload',
      authorId: 'm-ade',
      body: [
        '### Modular rails, 15 mm spacing',
        '',
        'Two rails along the bay so any payload plate slides in and locks with two thumb screws.',
      ].join('\n'),
      createdAt: t(21, 19),
    },
    // Wingspan (Spearhead PT2, resolved)
    {
      id: 's-span-3',
      threadId: 'n-wingspan',
      authorId: 'm-omar',
      body: [
        '### Cap the span at 3.0 m',
        '',
        '- Fits the ranch trailer and a pickup bed with the tailgate down',
        '- Endurance target is met with the gasoline engine, so the extra wing is not required',
      ].join('\n'),
      createdAt: t(12, 11),
    },
    {
      id: 's-span-4',
      threadId: 'n-wingspan',
      authorId: 'm-rosa',
      body: [
        '### Go to 4.0 m with a two-piece wing',
        '',
        'More endurance and a gentler stall. A two-piece wing keeps it transportable.',
      ].join('\n'),
      createdAt: t(13, 9),
    },
    // Attachment power (Quiver v2)
    {
      id: 's-max',
      threadId: 'n-power',
      authorId: 'm-sam',
      body: [
        '### Go big: one high-power rail',
        '',
        '- Single battery-voltage rail, **30 A continuous**',
        '- One large connector for everything',
        '- Let each attachment regulate its own voltages',
        '',
        'Serves: every attachment anyone could imagine. Nobody gets told no.',
      ].join('\n'),
      createdAt: t(14, 18),
    },
    {
      id: 's-tiered',
      threadId: 'n-power',
      authorId: 'm-jun',
      body: [
        '### Two tiers: regulated low-power plus switched high-power',
        '',
        '- **Tier 1:** regulated 12 V at 3 A and 5 V at 3 A, always present, low noise. Covers cameras, sensors, droppers.',
        '- **Tier 2:** switched battery-voltage rail, 15 A continuous, 25 A peak for 2 s, enabled by the flight controller only after the attachment identifies itself.',
        '- Electronic fuse on each rail, current telemetry on tier 2.',
        '- Keyed connector so tier 1 attachments cannot be plugged into tier 2 pins.',
        '',
        'Serves: gimbals and sensors get clean rails without carrying regulators. Spray rigs get real current. Leaves out: anything over 15 A continuous, which should bring its own battery anyway.',
        '',
        'Cost: about 14 g of board and harness over the single-rail option, from my layout estimate. _Placeholder figure._',
      ].join('\n'),
      createdAt: t(15, 8),
    },
    {
      id: 's-min',
      threadId: 'n-power',
      authorId: 'm-ade',
      body: [
        '### Keep it light: low-power only',
        '',
        '- 12 V at 2 A, 5 V at 2 A',
        '- High-power attachments carry their own battery',
        '',
        'Serves: most attachments today. Saves weight for everyone who never flies a sprayer.',
      ].join('\n'),
      createdAt: t(15, 11),
    },
  ];

  const votes: Vote[] = [
    // Engine PCB: the expert's full spec leads on weight; the crowd is split with the shortcut.
    { positionId: 's-ecu', memberId: 'm-jun', value: 1, castAt: t(19, 18) },
    { positionId: 's-ecu', memberId: 'm-rosa', value: 1, castAt: t(20, 14) },
    { positionId: 's-ecu', memberId: 'm-omar', value: 1, castAt: t(20, 20) },
    { positionId: 's-ecu', memberId: 'm-kim', value: 1, castAt: t(21, 7) },
    { positionId: 's-ots', memberId: 'm-sam', value: 1, castAt: t(20, 8) },
    { positionId: 's-ots', memberId: 'm-ade', value: 1, castAt: t(20, 9) },
    { positionId: 's-ots', memberId: 'm-whale', value: 1, castAt: t(20, 12) },
    { positionId: 's-ots', memberId: 'm-jun', value: -1, castAt: t(20, 15) },
    { positionId: 's-kill', memberId: 'm-omar', value: 1, castAt: t(20, 20) },
    { positionId: 's-kill', memberId: 'm-jun', value: 1, castAt: t(20, 21) },
    // Avionics carrier
    { positionId: 's-can', memberId: 'm-omar', value: 1, castAt: t(17, 8) },
    { positionId: 's-can', memberId: 'm-kim', value: 1, castAt: t(17, 9) },
    // Payload bay
    { positionId: 's-rails', memberId: 'm-kim', value: 1, castAt: t(22, 8) },
    // Wingspan (resolved)
    { positionId: 's-span-3', memberId: 'm-omar', value: 1, castAt: t(12, 11) },
    { positionId: 's-span-3', memberId: 'm-jun', value: 1, castAt: t(13, 10) },
    { positionId: 's-span-3', memberId: 'm-sam', value: 1, castAt: t(13, 12) },
    { positionId: 's-span-4', memberId: 'm-rosa', value: 1, castAt: t(13, 9) },
    // Attachment power: crowd likes "go big". The expert, the builder, and the lead prefer "two tiers".
    { positionId: 's-max', memberId: 'm-whale', value: 1, castAt: t(14, 20) },
    { positionId: 's-max', memberId: 'm-ade', value: 1, castAt: t(14, 21) },
    { positionId: 's-max', memberId: 'm-sam', value: 1, castAt: t(14, 22) },
    { positionId: 's-max', memberId: 'm-kim', value: 1, castAt: t(15, 7) },
    { positionId: 's-tiered', memberId: 'm-jun', value: 1, castAt: t(15, 8) },
    { positionId: 's-tiered', memberId: 'm-rosa', value: 1, castAt: t(15, 14) },
    { positionId: 's-tiered', memberId: 'm-lena', value: 1, castAt: t(15, 16) },
    { positionId: 's-min', memberId: 'm-ade', value: 1, castAt: t(15, 11) },
    { positionId: 's-min', memberId: 'm-rosa', value: -1, castAt: t(15, 14) },
  ];

  const intents: BuilderIntent[] = [
    { threadId: 'n-power', memberId: 'm-rosa' },
    { threadId: 'n-engine', memberId: 'm-rosa' },
  ];

  const comments: Comment[] = [
    { id: 'c-e1', positionId: 's-ecu', authorId: 'm-omar', body: 'Add a kill-switch input from the RC link, independent of the flight controller. See Rosa\'s hint below; it belongs on this board.', createdAt: t(20, 20) },
    { id: 'c-e2', positionId: 's-ecu', authorId: 'm-rosa', body: 'I run a DLE-35 class engine; RPM tops out near 9 kHz, so the 12 kHz margin is fine. I would build this.', createdAt: t(20, 14) },
    { id: 'c-e3', positionId: 's-ots', authorId: 'm-jun', body: 'Hobby ECUs give you no RPM or temperature on the bus. We would be flying blind on the engine.', createdAt: t(20, 15) },
    { id: 'c-1', positionId: 's-max', authorId: 'm-jun', body: 'A 30 A rail means 30 A wiring and a 30 A connector on every airframe, including the ones that only ever carry a camera. That weight is paid by everyone.', createdAt: t(15, 8) },
    { id: 'c-2', positionId: 's-tiered', authorId: 'm-rosa', body: 'This covers my spray rig. 15 A continuous is enough with the pump I use. I would build this.', createdAt: t(15, 14) },
    { id: 'c-3', positionId: 's-min', authorId: 'm-rosa', body: 'A second battery on the sprayer is a second thing to charge and balance in the field. Hard no from me.', createdAt: t(15, 14) },
  ];

  const decisions: Decision[] = [
    {
      id: 'd-wingspan',
      projectId: 'spearhead',
      versionId: 'sh-pt2',
      threadId: 'n-wingspan',
      positionId: 's-span-3',
      question: 'PT2 wingspan: stay under 3 m so it fits a trailer?',
      chosen: 'Cap the span at 3.0 m',
      weightedRankAtDecision: 1,
      rawRankAtDecision: 1,
      byMemberId: 'm-omar',
      at: t(20, 9),
      status: 'decided',
    },
  ];

  const grants: Grant[] = [];

  return { actingAs: 'm-omar', projects, members, roles, threads, positions, votes, intents, comments, decisions, grants };
}
