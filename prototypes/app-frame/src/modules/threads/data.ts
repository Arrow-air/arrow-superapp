import type { Kind, Role, Voter } from './weights';
import type { Sel } from '../model/model';

// Example threads for the module. People are the fictional example-workspace
// cast from specs.arrowair.com; the questions are the real Spearhead ones.

export interface Member extends Voter { id: string; name: string; initials: string; hue: 'indigo' | 'jade' | 'plum' | 'amber' | 'sky' | 'red' }
export type ThreadType = 'question' | 'proposal' | 'idea';
export type Context = 'design' | 'building' | 'manufacturing' | 'testing' | 'store';

export interface Position { id: string; text: string; authorId: string; at: string }
export interface Reply { id: string; authorId: string; text: string; at: string }
export interface Thread {
  id: string;
  /** The page this thread lives on (tab/item), when it belongs to one. */
  page?: string;
  title: string;
  body: string;
  kind: Kind;
  type: ThreadType;
  context: Context;
  system: string;
  anchor: { kind: 'model' | 'call'; label: string };
  /** The part of the aircraft model this thread is about, when it is about one. */
  part?: Sel;
  version: string;
  authorId: string;
  raised: string;
  active: string;
  positions: Position[];
  votes: { memberId: string; positionId: string; value: 1 | -1 }[];
  replies: Reply[];
  objections: number;
  settled?: { positionId: string; byId: string; at: string; override: boolean; note: string };
}

export const members: Member[] = [
  { id: 'nadia', name: 'Nadia Park', initials: 'NP', hue: 'indigo', role: 'lead', tokenBalance: 42000, expertise: ['airframe', 'propulsion', 'payload'], builder: true },
  { id: 'mara', name: 'Mara Quinn', initials: 'MQ', hue: 'jade', role: 'core', tokenBalance: 8000, expertise: ['airframe', 'avionics'], builder: true },
  { id: 'ravi', name: 'Ravi Menon', initials: 'RM', hue: 'amber', role: 'core', tokenBalance: 15000, expertise: ['propulsion', 'power'], builder: false },
  { id: 'dev', name: 'Dev Okafor', initials: 'DO', hue: 'sky', role: 'member', tokenBalance: 600, expertise: ['airframe'], builder: true },
  { id: 'lin', name: 'Lin Takeda', initials: 'LT', hue: 'plum', role: 'member', tokenBalance: 2500, expertise: ['power', 'payload'], builder: false },
  { id: 'sofia', name: 'Sofia Reyes', initials: 'SR', hue: 'red', role: 'member', tokenBalance: 120000, expertise: [], builder: false },
  { id: 'tom', name: 'Tom Hale', initials: 'TH', hue: 'amber', role: 'member', tokenBalance: 300, expertise: [], builder: false },
  { id: 'ana', name: 'Ana Silva', initials: 'AS', hue: 'jade', role: 'member', tokenBalance: 900, expertise: [], builder: false },
];

/** You, in this prototype. The role is switchable from the module's "View as". */
export const me: Omit<Member, 'role'> = {
  id: 'me', name: 'Sleety', initials: 'S', hue: 'plum', tokenBalance: 1440, expertise: ['airframe', 'power'], builder: true,
};

export const memberById = (id: string) => (id === 'me' ? { ...me, role: 'core' as Role } : members.find((m) => m.id === id));

export const threads: Thread[] = [
  {
    id: 'ARW-18', page: 'design/airframe', part: { group: 'restored_rear_landing_gear' }, title: 'Are the recovered rear landing gear bodies the current design?',
    body: 'The recovered gear bodies on the model look older than the PT1.5 build photos. If they are stale, the gear loads in the spec are off too.',
    kind: 'technical', type: 'question', context: 'design', system: 'airframe', anchor: { kind: 'model', label: 'Rear landing gear' }, version: 'PT 2.0',
    authorId: 'ravi', raised: 'Sep 28', active: '2h', positions: [], votes: [], objections: 0,
    replies: [{ id: 'r1', authorId: 'dev', text: 'I have the build photos from the Lisbon workshop, will post them tonight.', at: '1h' }],
  },
  {
    id: 'ARW-16', page: 'design/wings-tail', part: { group: 'inferred_starboard_outer_wing' }, title: 'Is the starboard outer wing really a mirror of port?',
    body: 'The model mirrors the port outer wing, but the pitot only lives on port. Mirroring puts a pitot cutout in the starboard skin.',
    kind: 'technical', type: 'question', context: 'design', system: 'airframe', anchor: { kind: 'model', label: 'Starboard outer wing' }, version: 'PT 2.0',
    authorId: 'dev', raised: 'Sep 27', active: '1d',
    positions: [
      { id: 'p1', text: 'The pitot lives on the port wing only, so the starboard skin should not have that cutout. Make starboard its own part.', authorId: 'dev', at: 'Sep 27' },
      { id: 'p2', text: 'Keep them mirrored for one set of moulds, and fill the unused cutout on starboard with a blanking plate.', authorId: 'lin', at: 'Sep 27' },
    ],
    votes: [
      { memberId: 'dev', positionId: 'p1', value: 1 }, { memberId: 'mara', positionId: 'p1', value: 1 },
      { memberId: 'lin', positionId: 'p2', value: 1 }, { memberId: 'tom', positionId: 'p2', value: 1 },
    ],
    objections: 1, replies: [],
  },
  {
    id: 'ARW-14', page: 'design/airframe', part: { group: 'fuselage', component: 'fuselage:1+fuselage_body:1+bulkheads:1', part: 'sta2' }, title: 'Bulkhead STA2 needs a pass-through for the pusher battery harness',
    body: 'The pusher battery harness has no route past bulkhead STA2 in the PT2 layout. It needs a hole, and where it goes affects the longerons.',
    kind: 'technical', type: 'proposal', context: 'design', system: 'airframe', anchor: { kind: 'model', label: 'Fuselage › Bulkheads › STA2' }, version: 'PT 2.0',
    authorId: 'mara', raised: 'Sep 26', active: '2h',
    positions: [
      { id: 'p1', text: 'A 20 mm grommeted hole low on the port side keeps it clear of the longerons. I can cut a test piece this week.', authorId: 'mara', at: 'Sep 26' },
      { id: 'p2', text: 'Route over the top through the existing lightening hole instead. No new hole in a load path.', authorId: 'tom', at: 'Sep 27' },
    ],
    votes: [
      { memberId: 'mara', positionId: 'p1', value: 1 }, { memberId: 'nadia', positionId: 'p1', value: 1 }, { memberId: 'dev', positionId: 'p1', value: 1 },
      { memberId: 'tom', positionId: 'p2', value: 1 }, { memberId: 'ana', positionId: 'p2', value: 1 }, { memberId: 'sofia', positionId: 'p2', value: 1 }, { memberId: 'lin', positionId: 'p2', value: 1 },
    ],
    objections: 0,
    replies: [
      { id: 'r1', authorId: 'dev', text: 'The lightening hole is already tight with the elevator cable through it.', at: '5h' },
      { id: 'r2', authorId: 'nadia', text: 'Agree with Dev. Mara, send the test piece photos when you have them.', at: '2h' },
    ],
  },
  {
    id: 'ARW-11', page: 'design/avionics', title: 'Confirm the main-board interfaces for both propulsion options',
    body: 'Raised on the Sep 25 call: the main board has to serve both the electric and the hybrid pusher until PT2 freezes.',
    kind: 'technical', type: 'question', context: 'design', system: 'avionics', anchor: { kind: 'call', label: 'Sep 25 call' }, version: 'PT 2.0',
    authorId: 'mara', raised: 'Sep 25', active: '3h',
    positions: [
      { id: 'p1', text: 'Six PWM servo outputs, a temperature input per motor, switched ignition, and CAN for the ESC telemetry.', authorId: 'mara', at: 'Sep 25' },
      { id: 'p2', text: 'Split it: a main board with PWM and CAN, and a small daughterboard for the hybrid-only signals.', authorId: 'ravi', at: 'Sep 26' },
    ],
    votes: [
      { memberId: 'mara', positionId: 'p1', value: 1 }, { memberId: 'dev', positionId: 'p1', value: 1 }, { memberId: 'ana', positionId: 'p1', value: 1 },
      { memberId: 'ravi', positionId: 'p2', value: 1 }, { memberId: 'lin', positionId: 'p2', value: 1 }, { memberId: 'sofia', positionId: 'p2', value: 1 },
    ],
    objections: 0, replies: [],
  },
  {
    id: 'ARW-20', title: 'Fund PT2 wing moulds: aluminium or printed?',
    body: 'The PT2 wings need moulds before the freeze. This is a budget call for the project treasury, so it is token-weighted.',
    kind: 'funding', type: 'proposal', context: 'manufacturing', system: 'airframe', anchor: { kind: 'call', label: 'Sep 23 call' }, version: 'PT 2.0',
    authorId: 'nadia', raised: 'Sep 23', active: '6h',
    positions: [
      { id: 'p1', text: 'Machined aluminium moulds, about $3,200. They last for PT3 and beyond.', authorId: 'nadia', at: 'Sep 23' },
      { id: 'p2', text: '3D-printed and sealed moulds, about $900. Good for ten to fifteen pulls, then reprint.', authorId: 'dev', at: 'Sep 24' },
    ],
    votes: [
      { memberId: 'nadia', positionId: 'p1', value: 1 }, { memberId: 'sofia', positionId: 'p1', value: 1 },
      { memberId: 'dev', positionId: 'p2', value: 1 }, { memberId: 'mara', positionId: 'p2', value: 1 }, { memberId: 'lin', positionId: 'p2', value: 1 }, { memberId: 'ana', positionId: 'p2', value: 1 },
    ],
    objections: 1, replies: [],
  },
  {
    id: 'ARW-09', page: 'design/wings-tail', part: { group: 'main_wing' }, title: 'Carbon skin or Oracover for the next wings?',
    body: 'Raised on the Sep 10 call. Weight, cost and repairability pull in different directions.',
    kind: 'technical', type: 'question', context: 'design', system: 'airframe', anchor: { kind: 'call', label: 'Sep 10 call' }, version: 'PT 2.0',
    authorId: 'dev', raised: 'Sep 10', active: 'Sep 25',
    positions: [
      { id: 'p1', text: 'Oracover now over a carbon D-box leading edge; revisit full carbon for PT3 once the wing is proven.', authorId: 'dev', at: 'Sep 11' },
      { id: 'p2', text: 'Full carbon skins now. We will need the stiffness for transition loads anyway.', authorId: 'ravi', at: 'Sep 12' },
    ],
    votes: [
      { memberId: 'dev', positionId: 'p1', value: 1 }, { memberId: 'mara', positionId: 'p1', value: 1 }, { memberId: 'nadia', positionId: 'p1', value: 1 }, { memberId: 'lin', positionId: 'p1', value: 1 },
      { memberId: 'ravi', positionId: 'p2', value: 1 },
    ],
    objections: 0, replies: [],
    settled: { positionId: 'p1', byId: 'nadia', at: 'Sep 25', override: false, note: 'Oracover over a carbon D-box for PT2. Full carbon is back on the table for PT3.' },
  },
  {
    id: 'ARW-07', title: 'XT90 or AS150 for the main battery connector?',
    body: 'Current draw in hover is close to the XT90 continuous rating.',
    kind: 'technical', type: 'question', context: 'building', system: 'power', anchor: { kind: 'model', label: 'Power › Main harness' }, version: 'PT 1.5',
    authorId: 'lin', raised: 'Sep 4', active: 'Sep 18',
    positions: [
      { id: 'p1', text: 'Stay on XT90. Everyone has them and the margin is fine for PT1.5 hover times.', authorId: 'tom', at: 'Sep 4' },
      { id: 'p2', text: 'AS150 anti-spark. Hover current is too close to the XT90 limit for comfort.', authorId: 'lin', at: 'Sep 5' },
    ],
    votes: [
      { memberId: 'tom', positionId: 'p1', value: 1 }, { memberId: 'ana', positionId: 'p1', value: 1 }, { memberId: 'sofia', positionId: 'p1', value: 1 }, { memberId: 'dev', positionId: 'p1', value: 1 },
      { memberId: 'lin', positionId: 'p2', value: 1 }, { memberId: 'ravi', positionId: 'p2', value: 1 },
    ],
    objections: 0, replies: [],
    settled: { positionId: 'p2', byId: 'nadia', at: 'Sep 18', override: true, note: 'Going with AS150 against the vote: bench logs show 92% of the XT90 rating in a long hover.' },
  },
  // Payload bay (Design › Payload bay). Fictional, like the cast.
  {
    id: 'ARW-24', page: 'design/payload', title: 'Should the payload bay get its own switched power bus?',
    body: 'Payloads currently tap the avionics rail. A camera gimbal browning out the flight controller on the bench is what prompted this.',
    kind: 'technical', type: 'question', context: 'design', system: 'payload', anchor: { kind: 'model', label: 'Payload bay › Power' }, version: 'PT 2.0',
    authorId: 'lin', raised: 'Sep 29', active: '40m', positions: [], votes: [], objections: 0,
    replies: [
      { id: 'r1', authorId: 'mara', text: 'Yes from me. Separate bus, separate fuse, and a relay the autopilot can drop in a failsafe.', at: '1h' },
      { id: 'r2', authorId: 'ravi', text: 'Worth sizing it first. What is the heaviest payload draw anyone has actually measured?', at: '40m' },
    ],
  },
  {
    id: 'ARW-22', page: 'design/payload', title: 'Standard payload rail pitch: 20 mm or 15 mm?',
    body: 'Every payload mount so far is a one-off. A rail standard lets people build payloads without touching the airframe CAD.',
    kind: 'technical', type: 'proposal', context: 'design', system: 'payload', anchor: { kind: 'model', label: 'Payload bay › Rails' }, version: 'PT 2.0',
    authorId: 'mara', raised: 'Sep 24', active: '3h',
    positions: [
      { id: 'p1', text: 'A 20 mm pitch, matching the common aluminium extrusion. Cheap, and people already own the brackets.', authorId: 'mara', at: 'Sep 24' },
      { id: 'p2', text: 'A 15 mm pitch. The bay is narrow and 20 mm wastes a full slot on each side.', authorId: 'dev', at: 'Sep 25' },
    ],
    votes: [
      { memberId: 'mara', positionId: 'p1', value: 1 }, { memberId: 'nadia', positionId: 'p1', value: 1 }, { memberId: 'lin', positionId: 'p1', value: 1 },
      { memberId: 'dev', positionId: 'p2', value: 1 }, { memberId: 'tom', positionId: 'p2', value: 1 },
    ],
    objections: 0,
    replies: [{ id: 'r1', authorId: 'dev', text: 'If we go 20 mm I would want the bay 6 mm wider in PT2.', at: '3h' }],
  },
  {
    id: 'ARW-23', page: 'design/payload', title: 'Maximum payload mass for PT2: 1.5 kg or 2 kg?',
    body: 'The number goes in the spec and drives the bay floor, the rails and the CG envelope.',
    kind: 'technical', type: 'question', context: 'design', system: 'payload', anchor: { kind: 'call', label: 'Sep 22 call' }, version: 'PT 2.0',
    authorId: 'nadia', raised: 'Sep 22', active: '5h',
    positions: [
      { id: 'p1', text: '1.5 kg. It keeps hover endurance above 18 minutes on the current pack.', authorId: 'nadia', at: 'Sep 22' },
      { id: 'p2', text: '2 kg. Most survey cameras people have asked about are 1.7 to 1.9 kg with the gimbal.', authorId: 'sofia', at: 'Sep 23' },
      { id: 'p3', text: 'Rate it at 1.5 kg, but design the floor for 2 kg so PT3 can raise it without new parts.', authorId: 'lin', at: 'Sep 23' },
    ],
    votes: [
      { memberId: 'nadia', positionId: 'p3', value: 1 }, { memberId: 'mara', positionId: 'p3', value: 1 }, { memberId: 'lin', positionId: 'p3', value: 1 },
      { memberId: 'sofia', positionId: 'p2', value: 1 }, { memberId: 'ana', positionId: 'p2', value: 1 }, { memberId: 'tom', positionId: 'p2', value: 1 },
      { memberId: 'dev', positionId: 'p1', value: 1 },
    ],
    objections: 1,
    replies: [
      { id: 'r1', authorId: 'ravi', text: 'Option C is what we did on the motor mounts and it paid off.', at: '6h' },
      { id: 'r2', authorId: 'sofia', text: 'Fine with C if the spec says 2 kg is the design load, not a promise.', at: '5h' },
    ],
  },
  {
    id: 'ARW-25', page: 'design/payload', title: 'Fund a reference camera payload for flight tests',
    body: 'Testing payload mounts with a dummy mass misses vibration and cabling. A real camera would catch both. Budget call, so token-weighted.',
    kind: 'funding', type: 'proposal', context: 'design', system: 'payload', anchor: { kind: 'call', label: 'Sep 22 call' }, version: 'PT 2.0',
    authorId: 'ravi', raised: 'Sep 22', active: '1d',
    positions: [
      { id: 'p1', text: 'Buy a mid-range mapping camera and gimbal, about $1,100. It stays with the test fleet.', authorId: 'ravi', at: 'Sep 22' },
      { id: 'p2', text: 'Borrow one from a workshop for each test campaign instead. No spend.', authorId: 'ana', at: 'Sep 23' },
    ],
    votes: [
      { memberId: 'ravi', positionId: 'p1', value: 1 }, { memberId: 'nadia', positionId: 'p1', value: 1 },
      { memberId: 'ana', positionId: 'p2', value: 1 }, { memberId: 'tom', positionId: 'p2', value: 1 }, { memberId: 'dev', positionId: 'p2', value: 1 },
    ],
    objections: 0, replies: [],
  },
  {
    id: 'ARW-21', page: 'design/payload', title: 'Payload quick-release latch: printed or off the shelf?',
    body: 'Swapping payloads in the field needs a latch that survives a hard landing.',
    kind: 'technical', type: 'question', context: 'design', system: 'payload', anchor: { kind: 'model', label: 'Payload bay › Latch' }, version: 'PT 2.0',
    authorId: 'dev', raised: 'Sep 12', active: 'Sep 20',
    positions: [
      { id: 'p1', text: 'Off-the-shelf camera quick-release plate. Proven, cheap, and replaceable anywhere.', authorId: 'nadia', at: 'Sep 12' },
      { id: 'p2', text: 'A printed latch designed around the rail, so it is one part fewer.', authorId: 'dev', at: 'Sep 13' },
    ],
    votes: [
      { memberId: 'nadia', positionId: 'p1', value: 1 }, { memberId: 'mara', positionId: 'p1', value: 1 }, { memberId: 'lin', positionId: 'p1', value: 1 }, { memberId: 'ravi', positionId: 'p1', value: 1 },
      { memberId: 'dev', positionId: 'p2', value: 1 },
    ],
    objections: 0, replies: [],
    settled: { positionId: 'p1', byId: 'nadia', at: 'Sep 20', override: false, note: 'Off-the-shelf plate for PT2. A printed latch can come back once the rail standard is settled.' },
  },
];
