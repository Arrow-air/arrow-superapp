// Seed data for the demo backend.
//
// EVERYTHING HERE IS ILLUSTRATIVE. The people are fictional personas, the token balances
// are made up, and the engineering numbers in the positions are placeholders written to make
// the threads feel real. None of it is an Arrow decision or a Quiver specification.
//
// The first thread is arranged so that weighting changes the winner: the crowd's favourite
// position is not the one the domain expert, the builder, and the lead prefer. That is the
// situation the experiment exists to look at.

import { DEFAULT_WEIGHTS } from '../lib/weights';
import type {
  BuilderIntent,
  Comment,
  Member,
  Thread,
  Project,
  ProjectRole,
  Position,
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
}

const t = (day: number, hour: number) => new Date(Date.UTC(2026, 8, day, hour)).toISOString();

export function seedState(): DemoState {
  const members: Member[] = [
    { id: 'm-lena', handle: 'lena-lead', displayName: 'Lena (Quiver lead)', tokenBalance: 40_000, expertise: ['airframe', 'systems'], location: 'Texas, US', bio: 'Persona: project lead on Quiver.' },
    { id: 'm-jun', handle: 'jun-pcb', displayName: 'Jun (PCB expert)', tokenBalance: 6_000, expertise: ['pcb', 'power', 'firmware'], location: 'Munich, DE', bio: 'Persona: electronics contributor with domain expertise.' },
    { id: 'm-rosa', handle: 'rosa-ranch', displayName: 'Rosa (operator, will build)', tokenBalance: 12_000, expertise: ['operations'], location: 'New Mexico, US', bio: 'Persona: runs a workshop and intends to build and fly this.' },
    { id: 'm-whale', handle: 'big-holder', displayName: 'Big Holder', tokenBalance: 900_000, expertise: [], location: 'Singapore', bio: 'Persona: large token holder, not hands-on.' },
    { id: 'm-ade', handle: 'ade-new', displayName: 'Ade (new member)', tokenBalance: 0, expertise: ['design'], location: 'Lagos, NG', bio: 'Persona: enthusiastic newcomer.' },
    { id: 'm-kim', handle: 'kim-sw', displayName: 'Kim (software)', tokenBalance: 2_500, expertise: ['firmware', 'sdk'], location: 'Seoul, KR', bio: 'Persona: SDK contributor.' },
    { id: 'm-sam', handle: 'sam-member', displayName: 'Sam (member)', tokenBalance: 300, expertise: [], location: 'Leeds, UK', bio: 'Persona: casual community member.' },
    { id: 'm-omar', handle: 'omar-spear', displayName: 'Omar (Spearhead lead)', tokenBalance: 25_000, expertise: ['airframe', 'propulsion'], location: 'Istanbul, TR', bio: 'Persona: project lead on Spearhead.' },
  ];

  const projects: Project[] = [
    { id: 'quiver', name: 'Quiver', weights: { ...DEFAULT_WEIGHTS, roleMultiplier: { ...DEFAULT_WEIGHTS.roleMultiplier } } },
    { id: 'spearhead', name: 'Spearhead', weights: { ...DEFAULT_WEIGHTS, roleMultiplier: { ...DEFAULT_WEIGHTS.roleMultiplier } } },
  ];

  const roles: ProjectRole[] = [
    { projectId: 'quiver', memberId: 'm-lena', role: 'lead' },
    { projectId: 'quiver', memberId: 'm-jun', role: 'core' },
    { projectId: 'quiver', memberId: 'm-kim', role: 'core' },
    { projectId: 'spearhead', memberId: 'm-omar', role: 'lead' },
    { projectId: 'spearhead', memberId: 'm-jun', role: 'core' },
  ];

  const threads: Thread[] = [
    {
      id: 'n-power',
      projectId: 'quiver',
      title: 'Attachment interface: how much power should it supply?',
      body: [
        'Attachments (sprayers, cameras, droppers) all draw from the attachment interface. We thread to fix a power budget before the next interface board revision.',
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
    },
    {
      id: 'n-avionics',
      projectId: 'spearhead',
      title: 'Spearhead avionics carrier: what goes on the board?',
      body: [
        'Spearhead threads an avionics carrier board. Before anyone lays it out we thread agreement on what it carries: flight controller interface, power distribution, CAN, telemetry, payload breakouts.',
        '',
        '**Reply with a position.** A short expert hint is welcome too, for example "run two CAN buses and here is why."',
        '',
        '_Illustrative thread._',
      ].join('\n'),
      tags: ['pcb', 'firmware'],
      authorId: 'm-omar',
      status: 'open',
      createdAt: t(16, 9),
    },
  ];

  const positions: Position[] = [
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
  ];

  // Crowd likes "go big". The expert, the builder, and the lead prefer "two tiers".
  const votes: Vote[] = [
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

  const intents: BuilderIntent[] = [{ threadId: 'n-power', memberId: 'm-rosa' }];

  const comments: Comment[] = [
    { id: 'c-1', positionId: 's-max', authorId: 'm-jun', body: 'A 30 A rail means 30 A wiring and a 30 A connector on every airframe, including the ones that only ever carry a camera. That weight is paid by everyone.', createdAt: t(15, 8) },
    { id: 'c-2', positionId: 's-tiered', authorId: 'm-rosa', body: 'This covers my spray rig. 15 A continuous is enough with the pump I use. I would build this.', createdAt: t(15, 14) },
    { id: 'c-3', positionId: 's-min', authorId: 'm-rosa', body: 'A second battery on the sprayer is a second thing to charge and balance in the field. Hard no from me.', createdAt: t(15, 14) },
  ];

  return { actingAs: 'm-lena', projects, members, roles, threads, positions, votes, intents, comments };
}
