// The people in each project's material. Everything said about them here is
// backed by the task board, the call notes or the repository, and names its
// source; nobody has an account in the demo, so nobody has votes, weight or
// history they did not make themselves. Roles and holdings are not recorded
// until people join.

import { longshotPeople } from '../projects/longshot/people';

export type Hue = 'indigo' | 'jade' | 'plum' | 'amber' | 'sky' | 'red';

export interface Person {
  id: string;
  name: string;
  initials: string;
  hue: Hue;
  github?: string;
  /** Account avatar, for signed-in members. */
  avatar?: string;
  discord?: string;
  /** What the repository or the call notes say they do. Each line names its source, and links it when it can. */
  does: { text: string; source: string; url?: string; project?: string }[];
  /** The projects whose People page lists them (Quiver when absent). */
  projects?: string[];
}

export const people: Person[] = [
  {
    id: 'erick', name: 'Erick', initials: 'E', hue: 'sky', github: 'errrks', discord: 'errrks.eth', projects: ['quiver', 'longshot'],
    does: [
      { text: 'Project lead: flies the lead flights and reviews the Attachment Developer Guide', source: 'T-03, T-05', project: 'quiver' },
      { text: 'Author of the Initial Configuration Guide', source: 'T-02', project: 'quiver' },
      { text: 'Champion for the V1 payload latch and multispectral camera', source: 'payload-systems V1 notes', project: 'quiver' },
      { text: 'Runs the obstacle avoidance tests and the spectrum analyzer work', source: 'Sep 29 call', project: 'quiver' },
      { text: 'Closed Quiver #188 once the custom pack became Project Longshot', source: 'Quiver #188', url: 'https://github.com/Arrow-air/project-quiver/issues/188', project: 'longshot' },
      { text: 'Owns Spearhead\'s electrical system: adds the BMS daughterboard header and the AS150U to its battery connector PCB', source: 'Sep 22 notes', url: 'https://github.com/Arrow-air/project-spearhead/wiki/2026%E2%80%9009#september-22-2026--longshot-battery--bms-call', project: 'longshot' },
    ],
  },
  {
    id: 'thomas', name: 'Thomas', initials: 'T', hue: 'amber', github: 'thomasgarrison', discord: 'thomasg', projects: ['quiver', 'longshot'],
    does: [
      { text: 'Accepts the configuration guide', source: 'T-02', project: 'quiver' },
      { text: 'Building units to sell; waiting on FAA approval', source: 'Sep 29 call', project: 'quiver' },
      { text: 'Sourcing cells for a Longshot build in Texas, with options for Julius to approve', source: 'Sep 29 call', url: 'https://discord.com/channels/853833144037277726/1478778896361980035/1554521669400526873', project: 'longshot' },
    ],
  },
  {
    id: 'julius', name: 'Julius', initials: 'J', hue: 'jade', github: 'Julius-eng', discord: 'far1no', projects: ['quiver', 'longshot'],
    does: [
      { text: 'Owns the battery PCB and the pack integration', source: 'T-01', project: 'quiver' },
      { text: 'Project lead in the Longshot proposal: architecture, bounties, flight testing', source: 'Proposal', url: 'https://dao.arrowair.com/t/project-longshot-proposal-discussion/154', project: 'longshot' },
      { text: 'Designed the voltage-sense boards and the SL board (V1) in July', source: 'LS #14, #16', url: 'https://github.com/Arrow-air/project-longshot/issues/16', project: 'longshot' },
      { text: 'Measured PT1 for the weight table: 11.2 kg, complete on Aug 29', source: 'LS #26', url: 'https://github.com/Arrow-air/project-longshot/issues/26', project: 'longshot' },
      { text: 'Sized the Spearhead variant with Alperen, and reserved a BMS bounty in the Longshot budget', source: 'Sep 22 notes', url: 'https://github.com/Arrow-air/project-spearhead/wiki/2026%E2%80%9009#september-22-2026--longshot-battery--bms-call', project: 'longshot' },
      { text: 'Testing a BMS development board to copy into Arrow\'s design', source: 'Sep 29 call', url: 'https://discord.com/channels/853833144037277726/1478778896361980035/1554521669400526873', project: 'longshot' },
      { text: 'Flies the Ethernet switch build to check the M9N', source: 'T-13', project: 'quiver' },
    ],
  },
  {
    id: 'zeynep', name: 'Zeynep', initials: 'Z', hue: 'plum', discord: 'zeynepb5793',
    does: [
      { text: 'Obstacle avoidance parameters; reviews flight-controller parameter changes', source: 'Sep 29 call' },
    ],
  },
  {
    id: 'kbm', name: 'KBM', initials: 'K', hue: 'red', github: 'DowFisherKBM', discord: 'kbmollysuh', projects: ['quiver', 'longshot'],
    does: [
      { text: 'Endurance metrics study', source: 'T-03', project: 'quiver' },
      { text: 'Offered structural advice for the next revision', source: 'Sep 29 call', project: 'quiver' },
      { text: 'Cell market: 6.5 Ah 21700s come only from BAK and FEB', source: 'Sep 29 call', url: 'https://discord.com/channels/853833144037277726/1478778896361980035/1554521669400526873', project: 'longshot' },
    ],
  },
  {
    id: 'alperen', name: 'Alperen', initials: 'A', hue: 'indigo', discord: 'alperenag', projects: ['quiver', 'longshot'],
    does: [
      { text: 'Built the V1 payload latch and multispectral camera with Erick', source: 'payload-systems V1 notes', project: 'quiver' },
      { text: 'Reviewer for structure and CAD on the decision register', source: 'T-09', project: 'quiver' },
      { text: 'Spearhead lead: sized the Spearhead variant with Julius, and is trying Astra for BMS component selection', source: 'Sep 22 notes', url: 'https://github.com/Arrow-air/project-spearhead/wiki/2026%E2%80%9009#september-22-2026--longshot-battery--bms-call', project: 'longshot' },
      { text: 'Writing the battery and charging requirements for Erick to review', source: 'Sep 25 notes', url: 'https://github.com/Arrow-air/project-spearhead/wiki/2026%E2%80%9009#september-25-2026', project: 'longshot' },
    ],
  },
  {
    id: 'mahmud', name: 'mahmudsudo', initials: 'M', hue: 'jade', github: 'mahmudsudo',
    does: [{ text: 'Writing the Attachment Developer Guide', source: 'T-05' }],
  },
  {
    id: 'alex', name: 'Alex', initials: 'AD', hue: 'amber', github: 'alexdada555',
    does: [{ text: 'QuiverHub: deploying V1 on the Houston unit and scoping what comes next', source: 'T-18, T-12' }],
  },
  {
    id: 'karan', name: 'karanp0202', initials: 'KP', hue: 'sky', github: 'karanp0202',
    does: [{ text: 'Obstacle avoidance test, tune and document (QGB-02)', source: 'PR #247' }],
  },
];

people.push(...longshotPeople);
/** Who the project's People page lists. */
export const peopleOf = (project: string) => people.filter((p) => (p.projects ?? ['quiver']).includes(project));

/** Whoever is looking at the demo. No wallet, no history; the role is switchable. */
export const visitor: Person = { id: 'me', name: 'You', initials: 'Y', hue: 'plum', does: [] };

export const personById = (id: string | undefined) =>
  id === 'me' ? visitor : people.find((p) => p.id === id);

/** GitHub logins to people, for task owners and PR authors. */
export const personByGithub = (login: string | null | undefined) =>
  login ? people.find((p) => p.github?.toLowerCase() === login.toLowerCase()) : undefined;
