import type { Kind } from './weights';
import { issueUrl, prUrl } from '../../data/quiver';

// Quiver's open questions, seeded from the Sep 29 call notes and the
// repository. Every position says where it came from: a person named in the
// call notes, or an issue or pull request. Nobody has voted; votes, replies,
// new threads and decisions made in the demo stay in this browser.

export type ThreadType = 'question' | 'proposal' | 'idea';

export interface SourceRef {
  kind: 'call' | 'issue' | 'pr';
  /** Call item id, or the issue / PR number. */
  ref: string;
  label: string;
  url?: string;
}

export interface Position { id: string; text: string; authorId?: string; source?: SourceRef; at: string }
export interface Reply { id: string; text: string; authorId?: string; source?: SourceRef; at: string }
export interface Settled {
  positionId: string;
  byId: string;
  at: string;
  override: boolean;
  note: string;
  /** Register number, D-001 upward, as T-09 asks. */
  decision: string;
}

export interface Thread {
  id: string;
  /** The working zone this thread lives in. */
  zone: string;
  /** The tab the zone sits under, for the Discussion filters. */
  context: string;
  title: string;
  body: string;
  kind: Kind;
  type: ThreadType;
  /** Matched against a voter's expertise. */
  system: string;
  version: string;
  authorId?: string;
  source?: SourceRef;
  raisedAt: string;
  activeAt: string;
  positions: Position[];
  votes: { memberId: string; positionId: string; value: 1 | -1 }[];
  replies: Reply[];
  objections: number;
  settled?: Settled;
}

export const callSource = (ref: string): SourceRef => ({ kind: 'call', ref, label: 'Sep 29 call' });
export const issueSource = (n: number): SourceRef => ({ kind: 'issue', ref: String(n), label: `#${n}`, url: issueUrl(n) });
export const prSource = (n: number): SourceRef => ({ kind: 'pr', ref: String(n), label: `PR #${n}`, url: prUrl(n) });

const CALL = '2026-09-29T11:30:00-05:00';
const PR267 = '2026-09-18T23:09:00-05:00';
const I234 = '2026-07-09T21:38:00-05:00';
const I248 = '2026-09-09T15:59:00-05:00';
const NEXT = 'Next';

export const threads: Thread[] = [
  {
    id: 'Q-1', zone: 'road-to-selling', context: 'overview', kind: 'technical', type: 'question', system: 'selling', version: 'Dev Kit',
    title: 'What else has to be true before Quiver ships in the US?',
    body: 'On the call Thomas named the blockers: FAA approval to sell, the foam case inserts (waiting on a CNC router), obstacle avoidance, and the GPS interference. He wants the last two resolved before units ship. Is anything missing from that list?',
    authorId: 'thomas', source: callSource('sep29-3'), raisedAt: CALL, activeAt: CALL,
    positions: [], votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-2', zone: 'road-to-selling', context: 'overview', kind: 'technical', type: 'proposal', system: 'selling', version: 'Dev Kit',
    title: 'Make sales the Quiver focus for the coming months',
    body: 'Quiver has cost a lot to build and needs to earn revenue. Once the blockers are cleared, the project shifts from design and engineering to selling as many units as it can.',
    authorId: 'thomas', source: callSource('sep29-4'), raisedAt: CALL, activeAt: CALL,
    positions: [
      { id: 'p1', text: 'Make sales the focus of the Quiver project for the coming months.', authorId: 'thomas', source: callSource('sep29-4'), at: CALL },
    ],
    votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-3', zone: 'gps-rf', context: 'design', kind: 'technical', type: 'question', system: 'gps', version: NEXT,
    title: 'GPS interference: move the GPS, shield the switches, or revise the PCB?',
    body: 'The M9N loses satellites with the two Ethernet switches installed, on the Houston unit and the West Texas unit (T-13). Erick is learning the spectrum analyzer to confirm the switches are the source, and Julius is flying the Ethernet build this week. Thomas wants this fixed before units ship.',
    authorId: 'thomas', source: callSource('sep29-10'), raisedAt: CALL, activeAt: CALL,
    positions: [
      { id: 'p1', text: 'Give the M9N a longer cable and mount it somewhere else, with an updated cradle. A PCB update would be more pain than anything.', authorId: 'erick', source: callSource('sep29-10'), at: CALL },
      { id: 'p2', text: 'If the spectrum analyzer shows the switches are the source, shield them and add standoffs. Keep the modifications as small as possible.', authorId: 'erick', source: callSource('sep29-10'), at: CALL },
      { id: 'p3', text: 'If the fix needs a PCB revision, start it sooner rather than later.', authorId: 'thomas', source: callSource('sep29-10'), at: CALL },
    ],
    votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-4', zone: 'gps-rf', context: 'design', kind: 'technical', type: 'proposal', system: 'gps', version: NEXT,
    title: 'Primary GPS: offer the Here4 and the Holybro NEO-F9P, retire the Wren Mini',
    body: 'PR #267 adds the CubePilot Here4 and the Holybro H-RTK NEO-F9P Rover as primary GPS options in the CAD and the BOM, and retires the Wren Mini. It is a draft, stacked on the mechanical sync in PR #266.',
    authorId: 'thomas', source: prSource(267), raisedAt: PR267, activeAt: PR267,
    positions: [
      { id: 'p1', text: 'Support both the Here4 and the NEO-F9P Rover as primary GPS alternatives. The Wren Mini is retired, not a third option.', authorId: 'thomas', source: prSource(267), at: PR267 },
    ],
    votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-5', zone: 'payload', context: 'design', kind: 'technical', type: 'question', system: 'payload', version: NEXT,
    title: 'Attachment power: the 12 V payload rail is about 13 W, shared by three ports',
    body: 'The attachment interface is sized for logic-level payloads. Floodlights, spreaders, larger gimbals and heaters want 20 to 100 W or more, so each one grows its own battery pigtail today (#233). The issue asks for a direction for the next main PCB and attach PCB revision.',
    source: issueSource(234), raisedAt: I234, activeAt: I234,
    positions: [
      { id: 'p1', text: 'A dedicated payload 12 V system: a separate converter sized for payloads (100 W class), with per-port switching and fusing.', source: issueSource(234), at: I234 },
      { id: 'p2', text: 'Expose switched, fused battery voltage on the attachment interface and let attachments regulate locally. Needs a pogo contact current check and a hot-mate arcing plan.', source: issueSource(234), at: I234 },
      { id: 'p3', text: 'No board change: publish one blessed high-power pigtail pattern (connector, fuse, switch).', source: issueSource(234), at: I234 },
    ],
    votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-6', zone: 'power', context: 'design', kind: 'technical', type: 'question', system: 'battery', version: 'Dev Kit',
    title: 'Battery failsafe: approve the BMS capacity values?',
    body: 'T-01 proposes triggering the battery failsafe from the pack\'s BMS count instead of ESC voltage: warn at 7,500 mAh left (25 percent), land at 4,500 mAh left (15 percent). Julius owns the battery PCB and the pack integration, so it is his call to check. A no comes with the number he would use instead.',
    source: issueSource(248), raisedAt: I248, activeAt: CALL,
    positions: [
      { id: 'p1', text: 'Yes: BATT2_LOW_MAH 7500 and BATT2_CRT_MAH 4500 go into the next parameter card, and the Handbook and the guide drop their "proposed" marker.', source: issueSource(248), at: I248 },
    ],
    votes: [],
    replies: [
      { id: 'r1', text: 'Asked Julius on the call for his input on the cutoffs, now that the Tattu BMS is available.', authorId: 'erick', source: callSource('sep29-15'), at: CALL },
      { id: 'r2', text: 'I will write something on GitHub.', authorId: 'julius', source: callSource('sep29-15'), at: CALL },
    ],
    objections: 0,
  },
  {
    id: 'Q-7', zone: 'power', context: 'design', kind: 'technical', type: 'question', system: 'battery', version: 'Dev Kit',
    title: 'Refuse to arm below 30 percent remaining?',
    body: 'The second T-01 question, judged on its own. BATT2_ARM_MAH 9000 would refuse arming with less than 30 percent left. Because the BMS count persists across boots, a pack installed half used would be caught. The lead has not adopted it yet.',
    source: issueSource(248), raisedAt: I248, activeAt: I248,
    positions: [
      { id: 'p1', text: 'Yes: add BATT2_ARM_MAH 9000 to the same parameter card revision.', source: issueSource(248), at: I248 },
    ],
    votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-8', zone: 'where-we-sell', context: 'market', kind: 'technical', type: 'question', system: 'sales', version: 'Dev Kit',
    title: 'Where do we sell Quiver: the Arrow store, a local page, or both?',
    body: 'Thomas will sell locally through his business out here, and wonders whether that should run through the Arrow store or a landing page tailored to what customers here care about. Either way the sale runs through the Arrow store process and pays back to the DAO. What is learned selling in Texas should carry over to other manufacturers selling elsewhere.',
    authorId: 'thomas', source: callSource('sep29-5'), raisedAt: CALL, activeAt: CALL,
    positions: [
      { id: 'p1', text: 'Both: a page tailored to local customers, and the Arrow store running a standard online sales funnel.', authorId: 'thomas', source: callSource('sep29-5'), at: CALL },
    ],
    votes: [],
    replies: [
      { id: 'r1', text: 'It would not hurt to have two sales pages: one for the DAO that we advertise, and one Thomas uses locally. This needs input from the whole DAO.', authorId: 'erick', source: callSource('sep29-5'), at: CALL },
    ],
    objections: 0,
  },
  {
    id: 'Q-9', zone: 'who-we-sell-to', context: 'market', kind: 'technical', type: 'proposal', system: 'sales', version: 'Dev Kit',
    title: 'Aim the online funnel at integrators, attachment developers and dev-kit buyers',
    body: 'There is a lot of wisdom in running a good online sales funnel. Thomas suggests pointing it at the people who would build on Quiver.',
    authorId: 'thomas', source: callSource('sep29-6'), raisedAt: CALL, activeAt: CALL,
    positions: [
      { id: 'p1', text: 'Target integrators, attachment developers, and people who would want the dev kit.', authorId: 'thomas', source: callSource('sep29-6'), at: CALL },
    ],
    votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-10', zone: 'who-we-sell-to', context: 'market', kind: 'technical', type: 'idea', system: 'sales', version: 'Dev Kit',
    title: 'Do local customers want a seller nearby who supports them?',
    body: 'Thomas\'s hypothesis: at least some customers will want a local feel, where they get good support close by. Worth testing before it shapes the sales pages.',
    authorId: 'thomas', source: callSource('sep29-7'), raisedAt: CALL, activeAt: CALL,
    positions: [],
    votes: [],
    replies: [
      { id: 'r1', text: 'Especially ranchers. They want to know they can call someone, or get someone close by to help.', authorId: 'erick', source: callSource('sep29-7'), at: CALL },
    ],
    objections: 0,
  },
  {
    id: 'Q-11', zone: 'airframe', context: 'design', kind: 'technical', type: 'question', system: 'structure', version: NEXT,
    title: 'Structure and enclosure: what should the next revision change?',
    body: 'KBM asked whether there is a plan to improve the enclosure or the structure, and offered structural advice. There is no list yet. Erick is preparing easy wins for the Thursday call, and what it takes to make them. Add candidates here as positions.',
    authorId: 'kbm', source: callSource('sep29-20'), raisedAt: CALL, activeAt: CALL,
    positions: [], votes: [], replies: [], objections: 0,
  },
  {
    id: 'Q-12', zone: 'config-guide', context: 'docs', kind: 'technical', type: 'question', system: 'docs', version: 'Dev Kit',
    title: 'One large docs sync, or separate pull requests?',
    body: 'Erick has a batch of local changes to sync: configuration guide, harness, Pilot\'s Handbook, SDK notes. Some flight-controller parameters deviate from the baseline on GitHub.',
    authorId: 'erick', source: callSource('sep29-18'), raisedAt: CALL, activeAt: CALL,
    positions: [
      { id: 'p1', text: 'Put the flight-controller parameter changes in their own pull request so Zeynep can review and merge them. Sync the rest separately.', authorId: 'erick', source: callSource('sep29-18'), at: CALL },
    ],
    votes: [],
    replies: [
      { id: 'r1', text: 'Okay, sounds good.', authorId: 'zeynep', source: callSource('sep29-18'), at: CALL },
    ],
    objections: 0,
  },
];
