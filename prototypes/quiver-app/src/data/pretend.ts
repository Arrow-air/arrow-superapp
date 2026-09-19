// Everything in this file is pretend. It exists so the demo can be clicked.
// Rules: no real person is given words, votes, or tokens. Personas are generic roles.
// Decision questions and their options are quoted from real issues; the votes on them are not real.
import { reactive, watch } from 'vue';

export interface Persona { id: string; label: string; blurb: string; signal: number; signalWhy: string[]; tokens: number }
export const personas: Persona[] = [
  { id: 'builder', label: 'Attachment builder', blurb: 'Has built and flown one attachment', signal: 3.2, signalWhy: ['Flown an attachment on the interface +1.2', 'Merged design files +1.0', 'Base 1.0'], tokens: 1200 },
  { id: 'operator', label: 'Operator', blurb: '40 logged flight hours on a Quiver', signal: 2.6, signalWhy: ['Logged flight hours +1.6', 'Base 1.0'], tokens: 300 },
  { id: 'electrical', label: 'Electrical reviewer', blurb: 'Reviews board changes', signal: 3.8, signalWhy: ['Named reviewer on this subsystem +2.0', 'Merged board work +0.8', 'Base 1.0'], tokens: 800 },
  { id: 'holder', label: 'Token holder', blurb: 'Holds $ARROW, has not built or flown', signal: 1.3, signalWhy: ['Token term, capped +0.3', 'Base 1.0'], tokens: 25000 },
  { id: 'newcomer', label: 'Newcomer', blurb: 'Arrived this week', signal: 1.0, signalWhy: ['Base 1.0'], tokens: 0 },
];

export interface Position { id: string; label: string; text: string }
export interface Decision {
  id: string; title: string; kind: 'engineering' | 'money';
  source: { label: string; url: string }; question: string; decider: string; deciderNote: string;
  positions: Position[]; parts: string[]; tasks: string[];
  dependsOn: { id: string; why: string }[]; // links drawn by the demo, not stated in the repo
  seedVotes: Record<string, string>; // personaId -> positionId, pretend
  objections: { position: string; by: string; text: string; answered: boolean }[];
}

const gh = 'https://github.com/Arrow-air/project-quiver/issues/';
export const decisions: Decision[] = [
  {
    id: 'attach-power', kind: 'engineering',
    title: 'Attachment interface power path',
    source: { label: '#234', url: gh + '234' },
    question: 'The 12 V payload rail is about 13 W shared across three ports. Which direction for the next main PCB and attachment PCB revision?',
    decider: 'Project lead', deciderNote: 'Issue #234 asks for a direction decision. Nobody is named as decider there yet.',
    positions: [
      { id: 'A', label: 'A. Bigger dedicated payload 12 V', text: 'A separate high-voltage to 12 V converter sized for payloads, about 100 W class, independent of the 30 W avionics rail, with switching and fusing per port.' },
      { id: 'B', label: 'B. Switched, fused battery voltage on the interface', text: 'Attachments regulate locally. Highest power ceiling and no converter mass. Open: pogo contact current rating, arcing on hot-mate at about 58.8 V, exposed pads, compatibility with V1.4 boards in the field.' },
      { id: 'C', label: 'C. Status quo plus a documented pigtail standard', text: 'No board changes. One blessed connector, fuse and switch pattern published as the high-power recipe. Gives up single-interface hot-swap for high-power payloads.' },
    ],
    parts: ['3331', '3310', '2112'], tasks: ['T-05', 'T-06', 'T-07'],
    dependsOn: [{ id: 'failsafe', why: 'More payload draw changes consumed capacity, which the failsafe values are set against.' }],
    seedVotes: { builder: 'B', operator: 'C', holder: 'A' },
    objections: [{ position: 'B', by: 'electrical', text: 'Not before the pogo contact datasheet check. The issue lists it as ask 2, and it bounds this option.', answered: false }],
  },
  {
    id: 'failsafe', kind: 'engineering',
    title: 'Battery failsafe posture',
    source: { label: 'T-01 · #248', url: gh + '248' },
    question: 'Approve the BMS capacity based low and critical values (7500 / 4500 mAh)? Judged separately: approve the arming block?',
    decider: 'Julius', deciderNote: 'Named as owner in T-01, as owner of the battery PCB and pack integration. His answer is not recorded here. Only the issue is the record.',
    positions: [
      { id: 'yes', label: 'Yes to the proposed values', text: 'Bat2, the pack BMS, becomes the primary failsafe source on consumed capacity. Low at 25 percent remaining, critical at 15 percent.' },
      { id: 'no', label: 'No, with a different number', text: 'T-01 requires a no to come with the number you would use instead and why.' },
    ],
    parts: ['3410', '3320'], tasks: ['T-01', 'T-03'],
    dependsOn: [{ id: 'endurance', why: 'The endurance study (T-03) measures the usable capacity these thresholds cut into.' }],
    seedVotes: { operator: 'yes' }, objections: [],
  },
  {
    id: 'retro-split', kind: 'money',
    title: 'Flight Test Campaign pool: how flying gets paid',
    source: { label: 'T-17 · #263', url: gh + '263' },
    question: 'T-17 says the 10,000 $ARROW pool has sat untouched for five months while 23 validated flights were logged. Flat rate per validated flight, or flat rate with a campaign multiplier?',
    decider: 'Token holders', deciderNote: 'In the repo this is Erick\'s task to write, not a vote. Shown as a money vote to illustrate token weighting on funds flow.',
    positions: [
      { id: 'flat', label: 'Flat rate per validated flight', text: 'One number. Simplest to compute and explain.' },
      { id: 'mult', label: 'Flat rate plus one campaign multiplier', text: 'Campaign flights (obstacle avoidance, endurance, an attachment test) pay more than free flights. T-17 asks for at most one multiplier.' },
    ],
    parts: [], tasks: ['T-17', 'T-03'], dependsOn: [],
    seedVotes: { holder: 'mult', operator: 'mult', builder: 'flat' }, objections: [],
  },
];
export const decisionById = new Map(decisions.map((d) => [d.id, d]));

// Pretend "what people built" for the spec-writing mock. Roles, not people.
export const specDraft = {
  title: 'New task: weatherproof housing for the V1 multispectral camera',
  note: 'An invented task, written the way the real board writes them, to show co-authoring. It is not on the Quiver board.',
  blocks: [
    { id: 'b1', by: 'builder', text: 'Done when: the housing has flown on the attachment interface in light rain with a logged flight, and its design files are merged.', kind: 'text' },
    { id: 'b2', by: 'electrical', text: 'Add: stays under the 13 W shared payload rail, measured on the bench. Until #234 is decided this is a hard limit.', kind: 'amendment' },
    { id: 'b3', by: 'operator', text: 'Hint: a sealed lens fogs on a cold dawn flight. A vent matters more than a seal.', kind: 'hint' },
    { id: 'b4', by: 'builder', text: 'Milestone 0, priced at $100: a one page scope with parts, print plan, bench test and flight test, plus a price for the build.', kind: 'text' },
  ],
};

// ---- local state: persona, votes, pins. Browser only. ----
const KEY = 'quiver-app-demo-v1';
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; } })();
export const state = reactive({
  persona: (saved.persona as string) ?? 'builder',
  votes: (saved.votes as Record<string, string>) ?? {},          // decisionId -> positionId, for the current persona only
  pins: (saved.pins as { anchor: string; text: string; persona: string }[]) ?? [],
  claims: (saved.claims as string[]) ?? [],
});
watch(state, (s) => localStorage.setItem(KEY, JSON.stringify(s)), { deep: true });
export const me = () => personas.find((p) => p.id === state.persona)!;
export const resetDemo = () => { state.votes = {}; state.pins = []; state.claims = []; };

export function tally(d: Decision) {
  const votes: Record<string, string> = { ...d.seedVotes };
  if (state.votes[d.id]) votes[state.persona] = state.votes[d.id];
  const rows = d.positions.map((p) => {
    const voters = personas.filter((x) => votes[x.id] === p.id);
    // engineering: signal weight. money: square root of tokens, so holdings always count but never linearly.
    const weight = voters.reduce((a, x) => a + (d.kind === 'money' ? Math.sqrt(x.tokens) : x.signal), 0);
    return { position: p, voters, heads: voters.length, weight };
  });
  const total = rows.reduce((a, r) => a + r.weight, 0) || 1;
  return rows.map((r) => ({ ...r, share: r.weight / total }));
}
