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
    // Intro calls (the queue, drafts a person sends, the after-call note). Say hi joins it with the Discord bot.
    { id: 'reach-out', label: 'Reach out', groups: [], team: true },
  ],
  home: 'people',
};
