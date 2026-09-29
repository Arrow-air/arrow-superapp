// Everything the frame navigates is described here: projects, their versions,
// the workspace tabs, and the sidebar under each tab. The top bar, breadcrumb,
// tabs, sidebar and routes are all generated from this file.
//
// Quiver demo: the sidebar items are working zones (Gavin, Sep 29). A zone
// is any place work happens, a part of the aircraft, a campaign or a topic,
// and every zone can hold threads, votes and decisions. A few items are
// views instead of zones: the BOM, the task board, the decision register.
import type { IconName } from './icons';

/** What renders in the content slot. Zones get the zone page with its threads. */
export type PageKind = 'zone' | 'gate' | 'bom' | 'work' | 'prs' | 'people' | 'sources' | 'threads' | 'suggested' | 'decisions';

export interface NavItem { id: string; label: string; icon: IconName; page?: PageKind }
export interface NavGroup { id: string; label: string; sortable?: boolean; items: NavItem[] }
export interface Tab { id: string; label: string; groups: NavGroup[] }
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
  upcoming: 'Under discussion, not named yet',
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
      { id: 'next', code: 'Next', status: 'upcoming' },
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

export const tabs: Tab[] = [
  {
    id: 'overview',
    label: 'Overview',
    groups: [
      {
        id: 'now',
        label: 'Now',
        items: [
          item('road-to-selling', 'Road to selling', 'flag', 'gate'),
          item('people', 'People', 'people', 'people'),
        ],
      },
      { id: 'sources', label: 'Sources', items: [item('calls', 'Call notes', 'log', 'sources')] },
    ],
  },
  {
    id: 'design',
    label: 'Design',
    groups: [
      {
        id: 'zones',
        label: 'Next revision',
        items: [
          item('airframe', 'Structure & enclosure', 'airframe'),
          item('gps-rf', 'GPS & RF', 'target'),
          item('power', 'Power & battery', 'battery'),
          item('payload', 'Payload & attachments', 'box'),
          item('avionics', 'Avionics & parameters', 'chip'),
          item('cad', 'CAD model', 'layers'),
        ],
      },
      { id: 'reference', label: 'Reference', items: [item('bom', 'Bill of materials', 'list', 'bom')] },
    ],
  },
  {
    id: 'testing',
    label: 'Testing',
    groups: [
      {
        id: 'campaigns',
        label: 'Campaigns',
        items: [
          item('obstacle-avoidance', 'Obstacle avoidance', 'alert'),
          item('gps-interference', 'GPS interference', 'gauge'),
          item('endurance', 'Endurance', 'plane'),
        ],
      },
    ],
  },
  {
    id: 'docs',
    label: 'Docs',
    groups: [
      {
        id: 'guides',
        label: 'Guides',
        items: [
          item('config-guide', 'Configuration guide', 'sliders'),
          item('pilots-handbook', 'Pilot\'s handbook', 'book'),
          item('attachment-guide', 'Attachment developer guide', 'file'),
          item('assembly', 'Assembly', 'wrench'),
        ],
      },
    ],
  },
  {
    id: 'market',
    label: 'Go-to-market',
    groups: [
      {
        id: 'selling',
        label: 'Selling',
        items: [
          item('where-we-sell', 'Where we sell', 'store'),
          item('who-we-sell-to', 'Who we sell to', 'people'),
          item('sales-page', 'Sales page', 'chart'),
          item('dao-return', 'What goes back to the DAO', 'coin'),
        ],
      },
    ],
  },
  {
    id: 'work',
    label: 'Work',
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
  {
    id: 'discussion',
    label: 'Discussion',
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
        id: 'by-context',
        label: 'By tab',
        items: [
          item('ctx-overview', 'Overview', 'flag', 'threads'),
          item('ctx-design', 'Design', 'half-diamond', 'threads'),
          item('ctx-docs', 'Docs', 'book', 'threads'),
          item('ctx-market', 'Go-to-market', 'store', 'threads'),
        ],
      },
    ],
  },
  {
    id: 'decisions',
    label: 'Decisions',
    groups: [
      { id: 'register', label: 'Register', items: [item('register', 'Decision register', 'check-circle', 'decisions')] },
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
