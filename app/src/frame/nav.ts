// Everything the frame navigates is described here: projects, their versions,
// the workspace tabs, and the sidebar under each tab. The top bar, breadcrumb,
// tabs, sidebar and routes are all generated from this file. Each project has
// its own tabs; Quiver's are below, Longshot's in projects/longshot/nav.ts.
//
// Quiver demo: the sidebar items are working zones (Gavin, Sep 29). A zone
// is any place work happens: an attachment, a piece of software, a part of
// the aircraft, a campaign or a topic. Every zone can hold threads, votes and
// decisions. A few items are views instead of zones: the summary, the
// attachment catalog, the BOM, the task board, the decision register.
// Zone ids are unique across projects, so a thread's zone names its project.
import { ref } from 'vue';
import { isZone, item, type Project, type Tab } from './navkit';
import { longshot } from '../projects/longshot/nav';

export * from './navkit';

// Places first (where the work is), then the views that cut across them.
// `view` tabs sit after a divider in the tab bar.
const quiverTabs: Tab[] = [
  {
    id: 'overview',
    label: 'Overview',
    groups: [
      {
        id: 'v1-1',
        label: 'Dev Kit v1.1',
        items: [
          item('v1-1', 'Improvements', 'flag', 'release'),
          item('model', '3D model', 'hexagon', 'model'),
          item('pcbs', 'PCBs', 'chip', 'pcbs'),
          item('airframe', 'Structure & enclosure', 'airframe'),
          item('gps-rf', 'GPS & RF', 'globe'),
          item('propulsion', 'Propulsion', 'fan'),
          item('power', 'Power & battery', 'battery'),
          item('avionics', 'Avionics & network', 'gauge'),
          item('harness', 'Harness & wiring', 'harness'),
        ],
      },
      {
        id: 'operating',
        label: 'Operating',
        items: [
          item('pilots-handbook', 'Pilot\'s handbook', 'book'),
          item('maintenance', 'Maintenance', 'wrench'),
        ],
      },
      {
        id: 'quiver',
        label: 'Quiver',
        items: [
          item('summary', 'At a glance', 'grid', 'summary'),
          item('people', 'People', 'people', 'people'),
          item('calls', 'Call notes', 'log', 'sources'),
        ],
      },
    ],
  },
  {
    id: 'attachments',
    label: 'Attachments',
    groups: [
      {
        id: 'catalog',
        label: 'Catalog',
        items: [
          item('catalog', 'All attachments', 'grid', 'catalog'),
          item('interface', 'Attachment interface', 'bolt'),
          item('dev-guide', 'Developer guide', 'book'),
        ],
      },
      {
        id: 'built',
        label: 'Attachments',
        items: [
          item('payload-latch', 'Payload latch', 'box'),
          item('multispectral', 'Multispectral camera', 'target'),
          item('ram-ball', 'RAM ball mount', 'hexagon'),
          item('spreader', 'Granular spreader adapter', 'layers'),
        ],
      },
      {
        id: 'next',
        label: 'Next',
        items: [
          item('concepts', 'Ready for contributors', 'flag'),
          item('attachment-ideas', 'New ideas', 'bulb'),
        ],
      },
    ],
  },
  {
    id: 'software',
    label: 'Software',
    groups: [
      {
        id: 'platform',
        label: 'Platform',
        items: [
          item('sdk', 'Quiver SDK', 'chip'),
          item('quiverhub', 'QuiverHub', 'grid'),
          item('ground-station', 'Ground station & remote', 'monitor'),
        ],
      },
      {
        id: 'flight',
        label: 'Flight',
        items: [
          item('autonomy', 'Autonomy & obstacle avoidance', 'alert'),
          item('parameters', 'Parameters & failsafes', 'sliders'),
          item('flight-data', 'Flight logs & data', 'chart'),
        ],
      },
    ],
  },
  {
    id: 'build',
    label: 'Build',
    groups: [
      {
        id: 'guides',
        label: 'Build it',
        items: [
          item('bom', 'Bill of materials', 'list', 'bom'),
          item('assembly', 'Assembly', 'wrench'),
          item('config-guide', 'Configuration guide', 'sliders'),
          item('case', 'Case & shipping', 'box'),
        ],
      },
      {
        id: 'makers',
        label: 'Manufacturers',
        items: [
          item('manufacturers', 'Bringing on manufacturers', 'people'),
          item('suppliers', 'Suppliers & cost', 'truck'),
        ],
      },
    ],
  },
  {
    id: 'selling',
    label: 'Selling',
    groups: [
      {
        id: 'now',
        label: 'Now',
        items: [item('road-to-selling', 'Road to selling', 'flag', 'gate')],
      },
      {
        id: 'market',
        label: 'Market',
        items: [
          item('where-we-sell', 'Where we sell', 'store'),
          item('who-we-sell-to', 'Customers & applications', 'globe'),
          item('pricing', 'Pricing', 'tag'),
          item('sales-page', 'Sales page', 'chart'),
          item('dao-return', 'What goes back to the DAO', 'coin'),
        ],
      },
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
          item('area-attachments', 'Attachments', 'box', 'threads'),
          item('area-software', 'Software', 'chip', 'threads'),
          item('area-overview', 'Overview', 'flag', 'threads'),
          item('area-build', 'Build', 'wrench', 'threads'),
          item('area-selling', 'Selling', 'store', 'threads'),
        ],
      },
    ],
  },
  {
    id: 'decisions',
    label: 'Decisions',
    view: true,
    groups: [
      { id: 'register', label: 'Register', items: [item('register', 'Decision register', 'check-circle', 'decisions')] },
    ],
  },
  {
    id: 'work',
    label: 'Work',
    view: true,
    groups: [
      {
        id: 'funded',
        label: 'From decisions',
        items: [item('grants', 'Grants & bounties', 'coin', 'grants')],
      },
      {
        id: 'board',
        label: 'From GitHub',
        items: [
          item('tasks', 'Task board', 'check-square', 'work'),
          item('prs', 'Open pull requests', 'branch', 'prs'),
        ],
      },
    ],
  },
];

// Quiver's own history: three prototypes, then the 2026 Dev Kit (bom/meta.yaml).
const quiver: Project = {
  id: 'quiver',
  label: 'Quiver',
  kind: 'Aircraft',
  versions: [
    { id: 'v1-1', code: 'Dev Kit v1.1', status: 'upcoming' },
    { id: 'dev-kit', code: 'Dev Kit', status: 'current' },
    { id: 'pt3', code: 'PT3', status: 'previous' },
    { id: 'pt2', code: 'PT2', status: 'unmaintained' },
    { id: 'pt1', code: 'PT1', status: 'unmaintained' },
  ],
  tabs: quiverTabs,
  home: 'overview/v1-1',
};

export const projects: Project[] = [quiver, longshot];
/** Quiver's tabs, for the pages that are only Quiver's. */
export const tabs = quiverTabs;

// The version a project opens on: its current release, or whatever it has.
export const defaultVersion = (p: Project) => p.versions.find((v) => v.status === 'current') ?? p.versions[0];

/** The project on screen, kept in step with the route (router.ts), for code outside components. */
export const currentProject = ref('quiver');

export const findProject = (id: unknown) => projects.find((p) => p.id === id);
export const projectTabs = (id: unknown = currentProject.value) => findProject(id)?.tabs ?? quiverTabs;
export const findTab = (id: unknown, project: unknown = currentProject.value) => projectTabs(project).find((t) => t.id === id);
export const findItem = (tab: Tab | undefined, id: unknown) =>
  tab?.groups.flatMap((g) => g.items).find((i) => i.id === id);
export const firstItem = (tab: Tab) => tab.groups[0].items[0];
export const homePath = (p: Project) => `/${p.id}/${p.home}`;

// Zones by id, across every project. A zone id appears once in the whole app.
const zoneIndex = new Map<string, { project: Project; tab: Tab; item: ReturnType<typeof item> }>();
for (const p of projects) for (const t of p.tabs) for (const g of t.groups) for (const i of g.items) {
  if (!isZone(i)) continue;
  if (zoneIndex.has(i.id)) console.error(`Zone id "${i.id}" is used twice; zone ids must be unique across projects.`);
  zoneIndex.set(i.id, { project: p, tab: t, item: i });
}
/** The project a zone belongs to. */
export const projectOfZone = (zoneId: string) => zoneIndex.get(zoneId)?.project.id;
/** Where a zone lives, for links from anywhere. */
export function zonePath(zoneId: string) {
  const z = zoneIndex.get(zoneId);
  return z ? `/${z.project.id}/${z.tab.id}/${z.item.id}` : `/${currentProject.value}/overview`;
}
export const zoneIcon = (zoneId: string) => zoneIndex.get(zoneId)?.item.icon;
export const zoneLabel = (zoneId: string) => zoneIndex.get(zoneId)?.item.label ?? zoneId;
export const zoneTab = (zoneId: string) => zoneIndex.get(zoneId)?.tab;
/** A project's zones in sidebar order. */
export const zonesOf = (projectId: string) => [...zoneIndex.entries()].filter(([, z]) => z.project.id === projectId).map(([id]) => id);
