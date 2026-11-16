// Longshot's workspace: Arrow's own battery packs, one project with a variant
// per aircraft (Thomas, Nov 16). Overview has the family at a glance, a page
// per variant and a page per build clock; then the places (the pack, its
// electronics, the aircraft it flies in, building it), shared by every
// variant; then the same views across them that Quiver has. Zone ids are
// unique across projects, so a thread's zone says which project it belongs to.
import { item, type Project, type Tab } from '../../frame/navkit';

export const longshotTabs: Tab[] = [
  {
    id: 'overview',
    label: 'Overview',
    groups: [
      {
        id: 'longshot',
        label: 'Longshot',
        items: [
          item('summary', 'At a glance', 'grid', 'ls-summary'),
          item('model', '3D model', 'hexagon', 'model'),
          item('pcbs', 'Boards', 'chip', 'pcbs'),
          item('people', 'People', 'people', 'people'),
          item('calls', 'Call notes', 'log', 'sources'),
        ],
      },
      {
        id: 'variants',
        label: 'Variants',
        items: [
          item('14s9p', '14S9P · Quiver', 'battery', 'ls-variant'),
          item('14s3p', '14S3P · Spearhead', 'battery', 'ls-variant'),
        ],
      },
      {
        // One page per build clock (projects/plans.ts); item ids are the clock ids.
        id: 'next',
        label: 'Next builds',
        items: [
          item('14s9p-pt2', '14S9P PT2', 'flag', 'release'),
          item('14s3p-pt1', '14S3P PT1', 'flag', 'release'),
          item('bms-v1', 'BMS v1', 'flag', 'release'),
        ],
      },
    ],
  },
  {
    id: 'pack',
    label: 'Pack',
    groups: [
      {
        id: 'cells',
        label: 'Cells',
        items: [
          item('cells', 'Cells & cell holders', 'battery'),
          item('busbars', 'Busbars & welding', 'bolt'),
        ],
      },
      {
        id: 'housing',
        label: 'Housing',
        items: [
          item('enclosure', 'Enclosure', 'box'),
          item('mounting', 'Mounting & clip', 'layers'),
        ],
      },
    ],
  },
  {
    id: 'electronics',
    label: 'Electronics',
    groups: [
      {
        id: 'management',
        label: 'Battery management',
        items: [
          item('bms', 'BMS', 'chip'),
          item('can', 'Telemetry & CAN', 'gauge'),
        ],
      },
      {
        id: 'power-path',
        label: 'Power path',
        items: [
          item('charging', 'Charging', 'bolt'),
          item('connector', 'Connector & sense boards', 'harness'),
        ],
      },
    ],
  },
  {
    id: 'aircraft',
    label: 'Aircraft',
    groups: [
      {
        id: 'flies-in',
        label: 'Flies in',
        items: [
          item('on-quiver', 'Quiver', 'plane'),
          item('on-spearhead', 'Spearhead', 'airframe'),
        ],
      },
      { id: 'proving', label: 'Proving it', items: [item('testing', 'Testing', 'flask')] },
    ],
  },
  {
    id: 'build',
    label: 'Build',
    groups: [
      {
        id: 'make',
        label: 'Build it',
        items: [
          item('guide', 'Manufacturing guide', 'book', 'ls-guide'),
          item('bom', 'Bill of materials', 'list', 'ls-bom'),
          item('builds', 'Building packs', 'wrench'),
          item('sourcing', 'Suppliers & cost', 'truck'),
          item('safety', 'Safety & shipping', 'alert'),
        ],
      },
      { id: 'funding', label: 'Funding', items: [item('budget', 'Budget & proposal', 'coin')] },
    ],
  },
  {
    id: 'discussion',
    label: 'Discussion',
    view: true,
    groups: [
      {
        id: 'threads',
        label: 'Threads',
        items: [
          item('all', 'All threads', 'comment', 'threads'),
          item('suggested', 'Suggested from calls', 'bulb', 'suggested'),
        ],
      },
      {
        id: 'by-area',
        label: 'By area',
        items: [
          item('area-pack', 'Pack', 'battery', 'threads'),
          item('area-electronics', 'Electronics', 'chip', 'threads'),
          item('area-aircraft', 'Aircraft', 'plane', 'threads'),
          item('area-build', 'Build', 'wrench', 'threads'),
        ],
      },
    ],
  },
  {
    id: 'decisions',
    label: 'Decisions',
    view: true,
    groups: [{ id: 'register', label: 'Register', items: [item('register', 'Decision register', 'check-circle', 'decisions')] }],
  },
  {
    id: 'work',
    label: 'Work',
    view: true,
    groups: [
      { id: 'funded', label: 'From decisions', items: [item('grants', 'Grants & bounties', 'coin', 'grants')] },
      { id: 'board', label: 'From GitHub', items: [item('github', 'Issues & pull requests', 'branch', 'ls-github')] },
    ],
  },
];

// Versions per build clock: what each variant is building next, the BMS both
// wait on, and the one pack built so far.
export const longshot: Project = {
  id: 'longshot',
  label: 'Longshot',
  kind: 'Battery packs',
  versions: [
    { id: '14s9p-pt2', code: '14S9P PT2', status: 'upcoming', clock: '14s9p-pt2' },
    { id: '14s3p-pt1', code: '14S3P PT1', status: 'upcoming', clock: '14s3p-pt1' },
    { id: 'bms-v1', code: 'BMS v1', status: 'upcoming', clock: 'bms-v1' },
    { id: '14s9p-pt1', code: '14S9P PT1', status: 'current' },
  ],
  tabs: longshotTabs,
  home: 'overview/summary',
};
