// Call notes, curated from the transcript: Quiver items only, in plain words,
// each naming who said it. The recording and the full transcript stay out of
// the app. A note is reference material: it becomes a thread only when
// someone starts one, and "named in the notes" is all it can prove.

export type CallItemKind = 'update' | 'question' | 'proposal' | 'agreement' | 'gap';

export interface CallItem {
  id: string;
  kind: CallItemKind;
  /** People named in the notes for this item. */
  who: string[];
  text: string;
  zone: string;
  /** Set when a seeded thread already carries this item. */
  thread?: string;
}

export interface Call {
  id: string;
  title: string;
  date: string;
  /** People named in these notes (not a full attendance list). */
  named: string[];
  items: CallItem[];
}

export const calls: Call[] = [
  {
    id: 'sep29',
    title: 'Quiver call',
    date: 'Sep 29',
    named: ['erick', 'thomas', 'julius', 'zeynep', 'kbm', 'alperen'],
    items: [
      // Selling
      { id: 'sep29-1', kind: 'update', who: ['thomas'], zone: 'road-to-selling', text: 'Still waiting on FAA approval to sell.' },
      { id: 'sep29-2', kind: 'update', who: ['thomas'], zone: 'road-to-selling', text: 'Waiting on the CNC router to cut the foam case inserts. They could be cut by hand if it came to that.' },
      { id: 'sep29-3', kind: 'question', who: ['thomas'], zone: 'road-to-selling', thread: 'Q-1', text: 'Wants obstacle avoidance and the GPS interference resolved before units ship. Then Quiver can move from design and engineering to selling.' },
      { id: 'sep29-4', kind: 'proposal', who: ['thomas'], zone: 'road-to-selling', thread: 'Q-2', text: 'Sales should be a focus of the Quiver project in the coming months: a lot has been spent building it, and it needs revenue.' },
      { id: 'sep29-5', kind: 'question', who: ['thomas', 'erick'], zone: 'where-we-sell', thread: 'Q-8', text: 'Sell through the Arrow store, or a landing page tailored to customers out here? Either way the sale runs through the Arrow store process and pays back to the DAO. Thomas: probably both. Erick: two sales pages would not hurt.' },
      { id: 'sep29-6', kind: 'proposal', who: ['thomas'], zone: 'who-we-sell-to', thread: 'Q-9', text: 'Run a standard online sales funnel aimed at integrators, attachment developers and people who would want the dev kit.' },
      { id: 'sep29-7', kind: 'question', who: ['thomas', 'erick'], zone: 'who-we-sell-to', thread: 'Q-10', text: 'Hypothesis: some customers will want a local feel and local support. Erick: especially ranchers, who want someone close by to call.' },
      { id: 'sep29-8', kind: 'gap', who: ['thomas'], zone: 'dao-return', text: 'What goes back to the DAO from each sale is not written down.' },
      { id: 'sep29-9', kind: 'agreement', who: ['erick', 'thomas'], zone: 'road-to-selling', text: 'Thursday call: Quiver improvements, plus ideas for the sales page and marketing. Erick will prepare so it is not off the cuff.' },

      // GPS and RF
      { id: 'sep29-10', kind: 'question', who: ['thomas', 'erick'], zone: 'gps-rf', thread: 'Q-3', text: 'If the GPS issue needs a PCB revision, start it sooner rather than later (Thomas). Erick: the easiest revision is a longer cable and a new mounting spot and cradle for the M9N; shielding the switches plus standoffs is another option once the spectrum analyzer says whether they are the source.' },
      { id: 'sep29-11', kind: 'update', who: ['erick'], zone: 'gps-interference', text: 'Bought a spectrum analyzer and is working through RF basics to find out whether the Ethernet switches are the source of the interference, and how to mitigate it.' },
      { id: 'sep29-12', kind: 'update', who: ['julius', 'erick'], zone: 'gps-interference', text: 'Julius will fly Quiver or Kestrel this week with Ethernet and a remote Mission Planner connection (no telemetry radio), to see whether GPS is affected. His IP address assignment differs from Erick\'s setup; neither expects that to matter.' },

      // Obstacle avoidance
      { id: 'sep29-13', kind: 'update', who: ['erick'], zone: 'obstacle-avoidance', text: 'Found two test sites: a park with a large open field (waypoint tests with a ladder and poles) and a wide, quiet street for automated obstacle avoidance. Plans to test Thursday, early morning.' },
      { id: 'sep29-14', kind: 'agreement', who: ['zeynep', 'erick'], zone: 'obstacle-avoidance', text: 'Zeynep will send the updated obstacle avoidance parameters for backyard testing.' },

      // Battery
      { id: 'sep29-15', kind: 'update', who: ['erick', 'julius'], zone: 'power', thread: 'Q-6', text: 'Erick asked Julius for the battery cutoffs now that the Tattu BMS is available (T-01). Julius will write his answer on GitHub.' },
      { id: 'sep29-16', kind: 'gap', who: ['erick'], zone: 'config-guide', text: 'How to log the battery PCB temperature sensors in Mission Planner is not in the configuration guide or an information note. Julius explained it briefly (assign them to available sensors); Erick will follow up by DM.' },

      // Docs
      { id: 'sep29-17', kind: 'update', who: ['erick'], zone: 'config-guide', text: 'Syncing local documents to GitHub: configuration guide changes, harness changes, Pilot\'s Handbook updates, parts of the SDK, and working notes.' },
      { id: 'sep29-18', kind: 'agreement', who: ['erick', 'zeynep'], zone: 'config-guide', thread: 'Q-12', text: 'Flight-controller parameter changes that deviate from what is on GitHub go in their own pull request, so Zeynep can review and merge them.' },
      { id: 'sep29-19', kind: 'update', who: ['erick', 'thomas'], zone: 'attachment-guide', text: 'The Attachment Developer Guide (T-05) is about 30% done. Thomas will review it once the first milestone is in and it reads cleanly.' },

      // Structure and CAD
      { id: 'sep29-20', kind: 'question', who: ['kbm', 'erick'], zone: 'airframe', thread: 'Q-11', text: 'KBM: is there a plan to improve the enclosure or the structure? He offered structural advice. Erick has no list yet and will bring easy wins to Thursday.' },
      { id: 'sep29-21', kind: 'update', who: ['erick', 'thomas'], zone: 'cad', text: 'Keep the build123d model up to date with recent changes. PR #266 syncs the Fusion changes; Thomas will review it again and Erick will too, since he has moved parts in Fusion since.' },
    ],
  },
];

export const callItems = calls.flatMap((c) => c.items.map((i) => ({ ...i, call: c })));
export const callItemById = (id: string) => callItems.find((i) => i.id === id);
