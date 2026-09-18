// Discussion pins. Each key is a feature of this prototype; each number is a GitHub Discussion in
// Arrow-air/arrow-superapp, created and seeded with the question that feature raises.
// giscus renders that discussion inside the app, next to the feature. Storage is GitHub, so the
// same thread can be rendered anywhere else too. See ideas/discussion-at-the-work.md.

export const DISCUSS_REPO = 'Arrow-air/arrow-superapp';
export const DISCUSS_REPO_ID = 'R_kgDOUfeapA';
export const DISCUSS_CATEGORY = 'Ideas';
export const DISCUSS_CATEGORY_ID = 'DIC_kwDOUfeapM4DF44G';

export interface DiscussAnchor {
  number: number;
  title: string;
  /** One line shown on hover and at the top of the drawer. */
  hook: string;
}

export const ANCHORS = {
  "formula": { number: 1, title: "The weighting formula: are these the right terms?", hook: "Are these the right four terms?" },
  "token-curve": { number: 2, title: "Token term: is a logarithmic curve with a cap right for whales?", hook: "Is this curve right for whales?" },
  "role-multiplier": { number: 3, title: "Role multiplier: lead \u00d72, core \u00d71.5, member \u00d71. Too much, too little?", hook: "Lead \u00d72, core \u00d71.5. Right?" },
  "expertise": { number: 4, title: "Expertise bonus: tags are self-declared and easy to game. What should feed it?", hook: "Self-declared tags are gameable. What instead?" },
  "builder-intent": { number: 5, title: "Builder intent: should saying \"I will build this\" earn weight?", hook: "Should saying \"I'll build it\" earn weight?" },
  "crowd-vs-weighted": { number: 6, title: "When the crowd and the weighting disagree, which should win?", hook: "When these disagree, which should win?" },
  "lead-override": { number: 7, title: "The lead keeps the final say but must publish why. Is that the right balance?", hook: "Final say plus a published why. Right balance?" },
  "bounty": { number: 8, title: "From spec to bounty: how should the spec author be rewarded?", hook: "How should the spec author be rewarded?" },
  "readout": { number: 9, title: "What should this experiment actually measure?", hook: "Are these the right things to measure?" },
  "where-discussion-lives": { number: 10, title: "Should threads live in this app, or next to the CAD, the PCB, the code?", hook: "Should threads live here, or next to the CAD and the board?" },
  "general": { number: 11, title: "General feedback on the spec-threads prototype", hook: "Anything else about this prototype" },
} as const satisfies Record<string, DiscussAnchor>;

export type AnchorKey = keyof typeof ANCHORS;

export const discussionUrl = (key: AnchorKey) => `https://github.com/${DISCUSS_REPO}/discussions/${ANCHORS[key].number}`;
