// Arrow-wide links for the global drawer and the command palette,
// mirroring the Quicklinks menu on arrowair.com.
const SITE = 'https://arrowair.com';

export interface GlobalLink { label: string; desc?: string; href: string }
export interface LinkGroup { id: string; label: string; links: GlobalLink[] }

export const linkGroups: LinkGroup[] = [
  {
    id: 'engineering',
    label: 'Engineering',
    links: [
      { label: 'Project Quiver docs', desc: 'All Quiver docs', href: `${SITE}/quiver/` },
      { label: 'GitHub repositories', desc: 'All Arrow repos', href: 'https://github.com/Arrow-air' },
      { label: 'Bounties & grants', desc: 'Open work and funding', href: `${SITE}/bounty/` },
      { label: 'How to contribute', desc: 'Engineering at Arrow', href: `${SITE}/docs/guides/development-guide` },
    ],
  },
  {
    id: 'community',
    label: 'Community',
    links: [
      { label: 'Contributor guide', desc: 'How to contribute to the DAO', href: `${SITE}/docs/community/` },
      { label: 'Bounty board', desc: 'Open community bounties', href: `${SITE}/bounty#general-dao` },
      { label: 'Calls & events', desc: 'Upcoming calls and events', href: `${SITE}/docs/community/growth-marketing` },
      { label: 'Media', desc: 'Brand and community media', href: `${SITE}/docs/contributing/arrow-brand` },
    ],
  },
  {
    id: 'dao',
    label: 'DAO',
    links: [
      { label: 'Voting', desc: 'How the DAO decides', href: `${SITE}/docs/governance/good-to-know/dao-voting` },
      { label: 'AIPs', desc: 'Arrow Improvement Proposals', href: `${SITE}/docs/governance/aips/` },
      { label: 'Treasury', desc: 'Funds overview', href: `${SITE}/docs/governance/core/treasury` },
      { label: 'Arrow token', desc: 'The governance token', href: `${SITE}/docs/governance/arrow-token` },
    ],
  },
];

export const footerLinks: GlobalLink[] = [
  { label: 'Docs', href: `${SITE}/docs/` },
  { label: 'Discord', href: 'https://discord.com/invite/arrow' },
  { label: 'Drive', href: 'https://drive.google.com/drive/folders/1efLrzqsiajzlxXiOUjxPT53CkfDGC0Yu?usp=drive_link' },
  { label: 'FAQs', href: `${SITE}/docs/intro` },
  { label: 'arrowair.com', href: SITE },
];
