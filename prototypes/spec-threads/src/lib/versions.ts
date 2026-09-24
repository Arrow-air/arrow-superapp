// Versions: which one is in build, which one is in discussion, and the freeze.
//
// From the 2026-09-23 call: outside contributions target the next version, not the one in
// flight. When the lead sits down to design that version they freeze it, and every open
// thread addressed to it has to be resolved first. Pure functions; the backend applies them.

import type { Project, Thread, Version } from './types';

export class FreezeError extends Error {}

const byOrder = (a: Version, b: Version) => a.order - b.order;

export function versionById(project: Project, versionId: string): Version | undefined {
  return project.versions.find((v) => v.id === versionId);
}

export function buildingVersion(project: Project): Version | undefined {
  return [...project.versions].sort(byOrder).find((v) => v.state === 'building');
}

/** The version new threads default to. */
export function discussingVersion(project: Project): Version | undefined {
  return [...project.versions].sort(byOrder).find((v) => v.state === 'discussing');
}

/** Versions a thread on `fromVersionId` can be deferred to: later, and not yet frozen or built. */
export function deferTargets(project: Project, fromVersionId: string): Version[] {
  const from = versionById(project, fromVersionId);
  if (!from) return [];
  return [...project.versions]
    .sort(byOrder)
    .filter((v) => v.order > from.order && (v.state === 'planned' || v.state === 'discussing'));
}

export interface FreezeCheck {
  version: Version;
  /** Threads still addressed to this version with no resolution. */
  open: Thread[];
  /** Threads addressed to this version that the lead resolved (reject, spec, grant). */
  resolved: Thread[];
  /** Threads that were addressed here and got pushed to a later version. */
  deferredAway: Thread[];
  canFreeze: boolean;
}

export function freezeCheck(project: Project, versionId: string, threads: Thread[]): FreezeCheck {
  const version = versionById(project, versionId);
  if (!version) throw new FreezeError('No such version.');
  const mine = threads.filter((t) => t.projectId === project.id);
  const here = mine.filter((t) => t.versionId === versionId);
  const open = here.filter((t) => t.status === 'open');
  const resolved = here.filter((t) => t.status === 'resolved');
  const deferredAway = mine.filter((t) => t.versionId !== versionId && t.deferrals.some((d) => d.fromVersionId === versionId));
  return {
    version,
    open,
    resolved,
    deferredAway,
    canFreeze: version.state === 'discussing' && open.length === 0,
  };
}

/**
 * Freeze a version: it becomes `frozen`, and the next planned version opens for discussion.
 * Returns a new versions array. The caller has already checked there are no open threads.
 */
export function freezeVersions(args: { project: Project; versionId: string; byMemberId: string; now?: Date }): Version[] {
  const { project, versionId, byMemberId } = args;
  const target = versionById(project, versionId);
  if (!target) throw new FreezeError('No such version.');
  if (target.state !== 'discussing') throw new FreezeError(`${target.name} is not in discussion, so it cannot be frozen.`);
  const at = (args.now ?? new Date()).toISOString();
  const sorted = [...project.versions].sort(byOrder);
  const next = sorted.find((v) => v.order > target.order && v.state === 'planned');
  return project.versions.map((v) => {
    if (v.id === target.id) return { ...v, state: 'frozen' as const, frozenAt: at, frozenBy: byMemberId };
    if (next && v.id === next.id) return { ...v, state: 'discussing' as const };
    return v;
  });
}
