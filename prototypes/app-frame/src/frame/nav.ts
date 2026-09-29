// Everything the frame navigates is described here: projects, their versions,
// the workspace tabs, and the sidebar under each tab. The top bar, breadcrumb,
// tabs, sidebar and routes are all generated from this file.
import type { IconName } from './icons';
import spearheadThumb from '../assets/spearhead-thumb.png';

export interface NavItem { id: string; label: string; icon: IconName }
export interface NavGroup { id: string; label: string; sortable?: boolean; items: NavItem[] }
export interface Tab { id: string; label: string; groups: NavGroup[] }
export interface Project { id: string; label: string; thumb?: string; versions: { id: string; label: string; code: string }[] }

export const projects: Project[] = [
  {
    id: 'spearhead',
    label: 'Spearhead',
    thumb: spearheadThumb,
    versions: [
      { id: 'pt-1-5', label: 'Current Version', code: 'PT 1.5' },
      { id: 'pt-1-0', label: 'Previous Version', code: 'PT 1.0' },
    ],
  },
  { id: 'quiver', label: 'Quiver', versions: [{ id: 'v1', label: 'Current Version', code: 'V 1.0' }] },
  { id: 'caribou', label: 'Caribou', versions: [{ id: 'v0', label: 'Current Version', code: 'V 0.1' }] },
];

const discussion: NavGroup = {
  id: 'discussion',
  label: 'Discussion',
  sortable: true,
  items: [
    { id: 'gtm-strategy', label: 'GTM Strategy', icon: 'store' },
    { id: 'potential-applications', label: 'Potential Applications', icon: 'globe' },
    { id: 'workshop-builds', label: 'Workshop Builds', icon: 'hexagon' },
    { id: 'pricing-discussion', label: 'Pricing Discussion', icon: 'diamond' },
    { id: 'bom-optimization', label: 'BOM Optimization', icon: 'list' },
    { id: 'prototype-2', label: 'Prototype 2.0', icon: 'half-diamond' },
  ],
};

// Placeholder sidebar for tabs whose structure isn't designed yet.
const stub = (label: string): NavGroup[] => [
  { id: 'main', label, items: [{ id: 'index', label: 'All', icon: 'list' }] },
  discussion,
];

export const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', groups: stub('Overview') },
  {
    id: 'design',
    label: 'Design',
    groups: [
      {
        id: 'cad',
        label: 'CAD Modelling',
        items: [
          { id: 'structural-design', label: 'Structural Design', icon: 'half-diamond' },
          { id: 'pcb-design', label: 'PCB Design', icon: 'globe' },
          { id: 'propulsion-system', label: 'Propulsion System', icon: 'cylinder' },
          { id: 'conceptual-design', label: 'Conceptual Design', icon: 'gear' },
          { id: 'power-design', label: 'Power Design', icon: 'bolt' },
          { id: 'electrical-design', label: 'Electrical Design', icon: 'chip' },
        ],
      },
      discussion,
    ],
  },
  { id: 'building', label: 'Building', groups: stub('Building') },
  { id: 'manufacturing', label: 'Manufacturing', groups: stub('Manufacturing') },
  { id: 'testing', label: 'Testing', groups: stub('Testing') },
  { id: 'discussion', label: 'Discussion', groups: [discussion] },
  { id: 'store', label: 'Store', groups: stub('Store') },
];

export const findProject = (id: unknown) => projects.find((p) => p.id === id);
export const findTab = (id: unknown) => tabs.find((t) => t.id === id);
export const findItem = (tab: Tab | undefined, id: unknown) =>
  tab?.groups.flatMap((g) => g.items).find((i) => i.id === id);
export const firstItem = (tab: Tab) => tab.groups[0].items[0];
