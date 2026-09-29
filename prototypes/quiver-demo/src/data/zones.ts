// Working zones: the places work happens. Gavin's frame puts them in the
// sidebar; any zone can hold threads, votes and decisions. Each zone also
// says what already exists for it in the repository, so the page opens on
// real work rather than an empty room.

export interface Zone {
  id: string;
  /** One or two sentences: what this zone is for, in Quiver's own terms. */
  summary: string;
  tasks?: string[];
  issues?: number[];
  prs?: number[];
  parts?: string[];
  links?: { label: string; url: string }[];
}

export const zones: Zone[] = [
  // Overview
  {
    id: 'road-to-selling',
    summary: 'What stands between Quiver and US sales, as Thomas listed it on the Sep 29 call. Each item links to the zone where the work is.',
  },

  // Design: the next revision
  {
    id: 'airframe',
    summary: 'Frame, plates, arms and the sealed cockpit. KBM asked on Sep 29 whether there is a plan to improve the structure or the enclosure; Erick is bringing a list to Thursday.',
    parts: ['1111', '1112'],
    prs: [266],
  },
  {
    id: 'gps-rf',
    summary: 'GNSS placement and everything that interferes with it. The M9N loses satellites with the Ethernet switches installed; the fix is open.',
    tasks: ['T-13'],
    issues: [191],
    prs: [267],
    parts: ['3250', '3251', '2331', '3313'],
  },
  {
    id: 'power',
    summary: 'The Tattu smart pack, its BMS, and the failsafe values that read it.',
    tasks: ['T-01'],
    parts: ['3410', '3320'],
  },
  {
    id: 'payload',
    summary: 'The three quick-release attachment interfaces and the power they can deliver.',
    tasks: ['T-07', 'T-06'],
    issues: [234, 233],
    prs: [245],
    parts: ['2112', '3331'],
  },
  {
    id: 'avionics',
    summary: 'Flight controller, companion computer and the parameter card.',
    prs: [222, 235],
  },
  {
    id: 'cad',
    summary: 'The build123d model is the source of truth for CAD. Recent Fusion changes still need to reach it.',
    prs: [266, 225],
    links: [{ label: 'CAD package (src/quiver)', url: 'https://github.com/Arrow-air/project-quiver/tree/main/src/quiver' }],
  },

  // Testing
  {
    id: 'obstacle-avoidance',
    summary: 'QGB-02: test, tune and document the 360° LiDAR and forward radar. One of the two technical items Thomas wants closed before shipping.',
    issues: [203],
    prs: [247, 246],
    parts: ['3210', '3290'],
  },
  {
    id: 'gps-interference',
    summary: 'Is the Ethernet switch build the source of the M9N dropouts, and does a fix hold in flight? Diagnosis for the GPS & RF design zone.',
    tasks: ['T-13'],
    issues: [191],
  },
  {
    id: 'endurance',
    summary: 'Six-flight endurance matrix: no payload, 5 kg and 7 kg, hover and circle. Flights by Erick, study by KBM.',
    tasks: ['T-03', 'T-17'],
    links: [{ label: 'flights.arrowair.com', url: 'https://flights.arrowair.com' }],
  },

  // Docs and build
  {
    id: 'config-guide',
    summary: 'The Initial Configuration Guide: a builder who has never seen the first unit configures a new aircraft from it alone.',
    tasks: ['T-02', 'T-16'],
    prs: [232],
  },
  {
    id: 'pilots-handbook',
    summary: 'The Pilot\'s Handbook, field edition: what the logs cannot say.',
    tasks: ['T-04'],
  },
  {
    id: 'attachment-guide',
    summary: 'The one document a third party reads to build a Quiver attachment.',
    tasks: ['T-05', 'T-11'],
    prs: [270],
  },
  {
    id: 'assembly',
    summary: 'Assembly and manufacturing guides.',
    issues: [179],
    prs: [223],
    links: [{ label: 'Assembly guides', url: 'https://arrowair.com/quiver/category/manufacturing/' }],
  },

  // Go-to-market
  {
    id: 'where-we-sell',
    summary: 'The Arrow store, a local page, or both. Thomas wants sales to be the Quiver focus for the coming months.',
  },
  {
    id: 'who-we-sell-to',
    summary: 'Who the online funnel is for, and what local customers need from a seller.',
  },
  {
    id: 'sales-page',
    summary: 'The arrowair.com sales page refresh, scoped at the October checkpoint once the marketing discovery is filed.',
    tasks: ['T-15', 'T-14'],
  },
  {
    id: 'dao-return',
    summary: 'Every sale runs through the Arrow store process and pays back to the DAO. How much, and how, is not written down yet.',
  },
];

export const zoneById = (id: string | undefined) => zones.find((z) => z.id === id);
