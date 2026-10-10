import type { Person } from '../../data/people';

// People named in the Longshot record who aren't already on Quiver's list.
// Everyone else (Julius, Erick, Alperen, KBM, Thomas) carries Longshot lines
// in data/people.ts. Every line names its source.
const PROPOSAL = 'https://dao.arrowair.com/t/project-longshot-proposal-discussion/154';

export const longshotPeople: Person[] = [
  {
    id: 'vector', name: 'Vector', initials: 'V', hue: 'sky', github: 'vector-arrow', projects: ['longshot'],
    does: [
      { text: 'Project coordinator in the Longshot proposal: GitHub, tracking open items, documenting decisions', source: 'Proposal', url: PROPOSAL },
      { text: 'Keeps the PT1 weight table and opened PRs #13, #15, #19 and #27, including the build123d model', source: 'LS #26, PRs', url: 'https://github.com/Arrow-air/project-longshot/pulls?q=is%3Apr+author%3Avector-arrow' },
    ],
  },
];
