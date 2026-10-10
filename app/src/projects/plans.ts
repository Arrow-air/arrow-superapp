// What the thread store needs to know about each project: the letter its
// thread ids start with, the version under discussion and the one after it
// (where deferred threads and anything raised after the freeze go), the zones
// whose threads are about the next version unless said otherwise, and the page
// that collects that version's improvements.
// Version names must differ between projects: the database keys each
// version's freeze and retro pool by its name.

export interface Plan {
  project: string;
  /** Thread ids: Q-1 on Quiver, L-1 on Longshot. */
  prefix: string;
  /** The version under discussion (a working name), and the one after it. */
  next: string;
  later: string;
  /** Zones whose new threads are about the next version, in page order. */
  nextZones: string[];
  /** The improvements page for the next version. */
  nextPath: string;
}

export const plans: Record<string, Plan> = {
  quiver: {
    project: 'quiver',
    prefix: 'Q',
    next: 'Dev Kit v1.1',
    later: 'Dev Kit v1.2',
    nextZones: ['airframe', 'gps-rf', 'propulsion', 'power', 'avionics', 'harness'],
    nextPath: '/quiver/overview/v1-1',
  },
  longshot: {
    project: 'longshot',
    prefix: 'L',
    next: 'Longshot PT2',
    later: 'Longshot PT3',
    nextZones: ['bms', 'can', 'charging', 'connector', 'cells', 'busbars', 'enclosure', 'mounting'],
    nextPath: '/longshot/overview/next',
  },
};

export const planOf = (project: string | undefined) => plans[project ?? 'quiver'] ?? plans.quiver;
