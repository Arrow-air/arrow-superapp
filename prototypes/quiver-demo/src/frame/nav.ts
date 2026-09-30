// Everything the frame navigates is described here: projects, their versions,
// the workspace tabs, and the sidebar under each tab. The top bar, breadcrumb,
// tabs, sidebar and routes are all generated from this file.
//
// Quiver demo: the sidebar items are working zones (Gavin, Sep 29). A zone
// is any place work happens: an attachment, a piece of software, a part of
// the aircraft, a campaign or a topic. Every zone can hold threads, votes and
// decisions. A few items are views instead of zones: the summary, the
// attachment catalog, the BOM, the task board, the decision register.
import type { IconName } from './icons';

/** What renders in the content slot. Zones get the zone page with its threads. */
export type PageKind = 'zone' | 'gate' | 'release' | 'model' | 'summary' | 'catalog' | 'bom' | 'work' | 'prs' | 'people' | 'sources' | 'threads' | 'suggested' | 'decisions';

export interface NavItem { id: string; label: string; icon: IconName; page?: PageKind }
export interface NavGroup { id: string; label: string; sortable?: boolean; items: NavItem[] }
export interface Tab { id: string; label: string; groups: NavGroup[]; /** A view across places, shown after the divider. */ view?: boolean }
export type VersionStatus = 'upcoming' | 'current' | 'previous' | 'unmaintained';
export interface Version { id: string; code: string; status: VersionStatus }
export interface Project { id: string; label: string; thumb?: string; versions: Version[] }

export const statusLabel: Record<VersionStatus, string> = {
  upcoming: 'Upcoming',
  current: 'Current',
  previous: 'Previous',
  unmaintained: 'Unmaintained',
};
export const statusNote: Record<VersionStatus, string> = {
  upcoming: 'Next version, improvements under discussion',
  current: 'Latest release',
  previous: 'Older, still supported',
  unmaintained: 'No longer maintained',
};

// Quiver's own history: three prototypes, then the 2026 Dev Kit (bom/meta.yaml).
export const projects: Project[] = [
  {
    id: 'quiver',
    label: 'Quiver',
    versions: [
      { id: 'v1-1', code: 'Dev Kit v1.1', status: 'upcoming' },
      { id: 'dev-kit', code: 'Dev Kit', status: 'current' },
      { id: 'pt3', code: 'PT3', status: 'previous' },
      { id: 'pt2', code: 'PT2', status: 'unmaintained' },
      { id: 'pt1', code: 'PT1', status: 'unmaintained' },
    ],
  },
];

// The version a project opens on: its current release, or whatever it has.
export const defaultVersion = (p: Project) => p.versions.find((v) => v.status === 'current') ?? p.versions[0];

const item = (id: string, label: string, icon: IconName, page?: PageKind): NavItem => ({ id, label, icon, page });

// Places first (where the work is), then the views that cut across them.
// `view` tabs sit after a divider in the tab bar.
export const tabs: Tab[] = [
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
          item('airframe', 'Structure & enclosure', 'airframe'),
          item('gps-rf', 'GPS & RF', 'globe'),
          item('propulsion', 'Propulsion', 'fan'),
          item('power', 'Power & battery', 'battery'),
          item('avionics', 'Avionics & network', 'harness'),
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

export const findProject = (id: unknown) => projects.find((p) => p.id === id);
export const findTab = (id: unknown) => tabs.find((t) => t.id === id);
export const findItem = (tab: Tab | undefined, id: unknown) =>
  tab?.groups.flatMap((g) => g.items).find((i) => i.id === id);
export const firstItem = (tab: Tab) => tab.groups[0].items[0];
/** Where a zone lives, for links from anywhere. */
export function zonePath(zoneId: string, projectId = 'quiver') {
  for (const t of tabs) for (const g of t.groups) for (const i of g.items) if (i.id === zoneId) return `/${projectId}/${t.id}/${i.id}`;
  return `/${projectId}/overview`;
}
export function zoneLabel(zoneId: string) {
  for (const t of tabs) for (const g of t.groups) for (const i of g.items) if (i.id === zoneId) return i.label;
  return zoneId;
}
export function zoneTab(zoneId: string) {
  return tabs.find((t) => t.groups.some((g) => g.items.some((i) => i.id === zoneId)));
}
