// Community: Arrow's people, beside the aircraft and the pack in the project
// switcher. Not a product, so no versions. Its tabs are single pages with
// their own sidebar (saved views and the taxonomy, with counts), drawn by
// modules/registry/community.ts; the routes are in router.ts.
import type { Project } from '../../frame/navkit';

export const community: Project = {
  id: 'community',
  label: 'Community',
  kind: 'People',
  versions: [],
  tabs: [
    { id: 'people', label: 'People', groups: [] },
    // Phase 1d: the say-hi and intro-call queues, and the after-call note.
    { id: 'reach-out', label: 'Reach out', groups: [], team: true },
  ],
  home: 'people',
};
