// The people in the Quiver material. Everything said about them here is backed
// by the task board or the Sep 29 call notes; nobody has an account in the
// demo, so nobody has votes, weight or history they did not make themselves.
// Roles and holdings are not recorded until people join.

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
  /** What the repository or the call notes say they do. Each line names its source. */
  does: { text: string; source: string }[];
}

export const people: Person[] = [
  {
    id: 'erick', name: 'Erick', initials: 'E', hue: 'sky', github: 'errrks', discord: 'errrks.eth',
    does: [
      { text: 'Project lead: flies the lead flights and reviews the Attachment Developer Guide', source: 'T-03, T-05' },
      { text: 'Author of the Initial Configuration Guide', source: 'T-02' },
      { text: 'Champion for the V1 payload latch and multispectral camera', source: 'payload-systems V1 notes' },
      { text: 'Runs the obstacle avoidance tests and the spectrum analyzer work', source: 'Sep 29 call' },
    ],
  },
  {
    id: 'thomas', name: 'Thomas', initials: 'T', hue: 'amber', github: 'thomasgarrison', discord: 'thomasg',
    does: [
      { text: 'Accepts the configuration guide', source: 'T-02' },
      { text: 'Building units to sell; waiting on FAA approval', source: 'Sep 29 call' },
    ],
  },
  {
    id: 'julius', name: 'Julius', initials: 'J', hue: 'jade', github: 'Julius-eng', discord: 'far1no',
    does: [
      { text: 'Owns the battery PCB and the pack integration', source: 'T-01' },
      { text: 'Lead designer of the Longshot battery pack', source: 'project-longshot' },
      { text: 'Flies the Ethernet switch build to check the M9N', source: 'T-13' },
    ],
  },
  {
    id: 'zeynep', name: 'Zeynep', initials: 'Z', hue: 'plum', discord: 'zeynepb5793',
    does: [
      { text: 'Obstacle avoidance parameters; reviews flight-controller parameter changes', source: 'Sep 29 call' },
    ],
  },
  {
    id: 'kbm', name: 'KBM', initials: 'K', hue: 'red', github: 'DowFisherKBM', discord: 'kbmollysuh',
    does: [
      { text: 'Endurance metrics study', source: 'T-03' },
      { text: 'Offered structural advice for the next revision', source: 'Sep 29 call' },
    ],
  },
  {
    id: 'alperen', name: 'Alperen', initials: 'A', hue: 'indigo', discord: 'alperenag',
    does: [
      { text: 'Built the V1 payload latch and multispectral camera with Erick', source: 'payload-systems V1 notes' },
      { text: 'Reviewer for structure and CAD on the decision register', source: 'T-09' },
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

/** Whoever is looking at the demo. No wallet, no history; the role is switchable. */
export const visitor: Person = { id: 'me', name: 'You', initials: 'Y', hue: 'plum', does: [] };

export const personById = (id: string | undefined) =>
  id === 'me' ? visitor : people.find((p) => p.id === id);

/** GitHub logins to people, for task owners and PR authors. */
export const personByGithub = (login: string | null | undefined) =>
  login ? people.find((p) => p.github?.toLowerCase() === login.toLowerCase()) : undefined;
