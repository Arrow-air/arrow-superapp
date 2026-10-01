// Everything the frame navigates is described here: projects, their versions,
// the workspace tabs, and the sidebar under each tab. The top bar, breadcrumb,
// tabs, sidebar and routes are all generated from this file.
import type { IconName } from './icons';
import spearheadThumb from '../assets/spearhead-thumb.png';

export interface NavItem { id: string; label: string; icon: IconName }
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
  upcoming: 'In development',
  current: 'Latest release',
  previous: 'Older, still supported',
  unmaintained: 'No longer maintained',
};

export const projects: Project[] = [
  {
    id: 'spearhead',
    label: 'Spearhead',
    thumb: spearheadThumb,
    versions: [
      { id: 'pt-2-0', code: 'PT 2.0', status: 'upcoming' },
      { id: 'pt-1-5', code: 'PT 1.5', status: 'current' },
      { id: 'pt-1-0', code: 'PT 1.0', status: 'previous' },
      { id: 'pt-0-9', code: 'PT 0.9', status: 'unmaintained' },
    ],
  },
  {
    id: 'quiver',
    label: 'Quiver',
    versions: [
      { id: 'v1-1', code: 'V 1.1', status: 'upcoming' },
      { id: 'v1-0', code: 'V 1.0', status: 'current' },
      { id: 'v0-8', code: 'V 0.8', status: 'unmaintained' },
    ],
  },
  { id: 'caribou', label: 'Caribou', versions: [{ id: 'v0-1', code: 'V 0.1', status: 'upcoming' }] },
];

// The version a project opens on: its current release, or whatever it has.
export const defaultVersion = (p: Project) => p.versions.find((v) => v.status === 'current') ?? p.versions[0];

// Each tab's sidebar: the topics for that context first, then the
// discussion scoped to it. Design, Building and Manufacturing share
// subsystem names so you stay on the same part of the aircraft across tabs.
const item = (id: string, label: string, icon: IconName): NavItem => ({ id, label, icon });
const talk = (...items: NavItem[]): NavGroup => ({ id: 'discussion', label: 'Discussion', sortable: true, items });

export const tabs: Tab[] = [
  {
    id: 'overview',
    label: 'Overview',
    groups: [
      {
        id: 'about',
        label: 'About',
        items: [
          item('summary', 'Summary', 'info'),
          item('specifications', 'Specifications', 'sliders'),
          item('roadmap', 'Roadmap', 'flag'),
          item('changelog', 'Changelog', 'history'),
          item('contributors', 'Contributors', 'people'),
        ],
      },
      talk(item('announcements', 'Announcements', 'megaphone'), item('qa', 'Q&A', 'question')),
    ],
  },
  {
    id: 'design',
    label: 'Design',
    groups: [
      {
        id: 'subsystems',
        label: 'Subsystems',
        items: [
          item('aircraft', 'Whole aircraft', 'plane'),
          item('airframe', 'Airframe', 'airframe'),
          item('wings-tail', 'Wings & tail', 'wing'),
          item('propulsion', 'Propulsion', 'fan'),
          item('power', 'Power & battery', 'battery'),
          item('avionics', 'Avionics', 'chip'),
          item('wiring', 'Wiring harness', 'harness'),
          item('payload', 'Payload bay', 'box'),
        ],
      },
      {
        id: 'reference',
        label: 'Reference',
        items: [
          item('parts', 'Parts', 'layers'),
          item('cad-files', 'CAD files', 'file'),
          item('drawings', 'Drawings', 'ruler'),
          item('requirements', 'Requirements', 'check-square'),
        ],
      },
      talk(item('design-reviews', 'Design reviews', 'eye'), item('change-proposals', 'Change proposals', 'branch')),
    ],
  },
  {
    id: 'building',
    label: 'Building',
    groups: [
      {
        id: 'prepare',
        label: 'Prepare',
        items: [item('bom', 'Bill of materials', 'list'), item('tools', 'Tools & workspace', 'wrench')],
      },
      {
        id: 'assembly',
        label: 'Assembly',
        items: [
          item('airframe', 'Airframe', 'airframe'),
          item('wings', 'Wings', 'wing'),
          item('propulsion', 'Propulsion', 'fan'),
          item('electrical', 'Electrical', 'harness'),
        ],
      },
      {
        id: 'setup',
        label: 'Setup',
        items: [item('flight-controller', 'Flight controller', 'chip'), item('calibration', 'Calibration', 'target')],
      },
      talk(item('workshop-builds', 'Workshop builds', 'hexagon'), item('troubleshooting', 'Troubleshooting', 'question')),
    ],
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing',
    groups: [
      {
        id: 'parts',
        label: 'Parts',
        items: [
          item('printed', 'Printed parts', 'printer'),
          item('composite', 'Composite parts', 'layers'),
          item('sourced', 'Sourced parts & suppliers', 'truck'),
        ],
      },
      {
        id: 'processes',
        label: 'Processes',
        items: [
          item('layup', 'Layup', 'layers'),
          item('print-settings', 'Print settings', 'sliders'),
          item('inspection', 'Inspection', 'check-square'),
        ],
      },
      { id: 'cost', label: 'Cost', items: [item('cost-breakdown', 'Cost breakdown', 'coin')] },
      talk(item('bom-optimization', 'BOM optimization', 'list'), item('supplier-options', 'Supplier options', 'truck')),
    ],
  },
  {
    id: 'testing',
    label: 'Testing',
    groups: [
      { id: 'plan', label: 'Plan', items: [item('test-plan', 'Test plan', 'check-square')] },
      {
        id: 'ground',
        label: 'Ground tests',
        items: [item('bench-thrust', 'Bench thrust', 'gauge'), item('static-load', 'Static load', 'airframe')],
      },
      {
        id: 'flight',
        label: 'Flight tests',
        items: [
          item('hover', 'Hover', 'fan'),
          item('transition', 'Transition', 'plane'),
          item('endurance', 'Endurance', 'battery'),
        ],
      },
      {
        id: 'results',
        label: 'Results',
        items: [item('flight-logs', 'Flight logs', 'log'), item('findings', 'Findings', 'bulb')],
      },
      talk(item('test-results', 'Test results', 'chart'), item('incidents', 'Incidents', 'alert')),
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
          item('all', 'All threads', 'comment'),
          item('proposals', 'Proposals', 'branch'),
          item('decisions', 'Decisions', 'check-circle'),
          item('ideas', 'Ideas', 'bulb'),
          item('qa', 'Q&A', 'question'),
        ],
      },
      {
        id: 'by-context',
        label: 'By context',
        items: [
          item('ctx-design', 'Design', 'half-diamond'),
          item('ctx-building', 'Building', 'wrench'),
          item('ctx-manufacturing', 'Manufacturing', 'layers'),
          item('ctx-testing', 'Testing', 'plane'),
          item('ctx-store', 'Store', 'store'),
        ],
      },
    ],
  },
  {
    id: 'store',
    label: 'Store',
    groups: [
      {
        id: 'shop',
        label: 'Shop',
        items: [item('kits', 'Kits', 'bag'), item('parts', 'Parts', 'box'), item('merch', 'Merch', 'shirt')],
      },
      {
        id: 'strategy',
        label: 'Strategy',
        items: [
          item('pricing', 'Pricing', 'tag'),
          item('go-to-market', 'Go-to-market', 'chart'),
          item('applications', 'Potential applications', 'globe'),
        ],
      },
      talk(item('pricing-discussion', 'Pricing discussion', 'tag')),
    ],
  },
];

export const findProject = (id: unknown) => projects.find((p) => p.id === id);
export const findTab = (id: unknown) => tabs.find((t) => t.id === id);
export const findItem = (tab: Tab | undefined, id: unknown) =>
  tab?.groups.flatMap((g) => g.items).find((i) => i.id === id);
export const firstItem = (tab: Tab) => tab.groups[0].items[0];
