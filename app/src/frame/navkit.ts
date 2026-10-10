// The shapes the frame navigates: projects, their versions, the workspace
// tabs, and the sidebar under each tab. Shared by every project's nav file,
// so nav.ts can list the projects without an import cycle.
import type { IconName } from './icons';

/** What renders in the content slot. Zones get the zone page with its threads. */
export type PageKind =
  | 'zone' | 'gate' | 'release' | 'model' | 'pcbs' | 'grants' | 'summary' | 'catalog' | 'bom' | 'work' | 'prs' | 'people' | 'sources' | 'threads' | 'suggested' | 'decisions'
  // Longshot's own views
  | 'ls-summary' | 'ls-bom' | 'ls-github';

export interface NavItem { id: string; label: string; icon: IconName; page?: PageKind }
export interface NavGroup { id: string; label: string; sortable?: boolean; items: NavItem[] }
export interface Tab { id: string; label: string; groups: NavGroup[]; /** A view across places, shown after the divider. */ view?: boolean }
export type VersionStatus = 'upcoming' | 'current' | 'previous' | 'unmaintained';
export interface Version { id: string; code: string; status: VersionStatus }
export interface Project {
  id: string;
  label: string;
  /** What it is, for the switcher: an aircraft, a battery pack. */
  kind: string;
  thumb?: string;
  versions: Version[];
  tabs: Tab[];
  /** Where the project opens: tab/item. */
  home: string;
}

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

export const item = (id: string, label: string, icon: IconName, page?: PageKind): NavItem => ({ id, label, icon, page });

/** Pages that hold threads: a working zone, or the road-to-selling gate. */
export const isZone = (i: NavItem) => !i.page || i.page === 'zone' || i.page === 'gate';
