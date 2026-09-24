// Human labels for the v2 states. One place, so the freeze screen, the thread page,
// the lists, and the readout say the same thing.

import type { ResolutionKind, Thread, VersionState } from './types';

export const RESOLUTION_LABEL: Record<ResolutionKind, string> = {
  reject: 'rejected',
  spec: 'promoted to spec',
  grant: 'turned into a grant',
  defer: 'deferred',
};

export const RESOLUTION_VERB: Record<ResolutionKind, string> = {
  reject: 'Reject',
  spec: 'Promote to spec',
  grant: 'Turn into a grant',
  defer: 'Defer',
};

export const RESOLUTION_CHIP: Record<ResolutionKind, string> = {
  reject: 'chip-reject',
  spec: 'chip-spec',
  grant: 'chip-grant',
  defer: 'chip-defer',
};

export const VERSION_STATE_LABEL: Record<VersionState, string> = {
  building: 'in build',
  discussing: 'in discussion',
  frozen: 'frozen',
  planned: 'planned',
};

/** "open", or the resolution it got. */
export function threadStatusLabel(thread: Thread): string {
  return thread.resolution ? RESOLUTION_LABEL[thread.resolution.kind] : 'open';
}

export function threadStatusChip(thread: Thread): string {
  return thread.resolution ? RESOLUTION_CHIP[thread.resolution.kind] : 'chip-open';
}

export const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;
