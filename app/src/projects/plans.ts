// What the thread store needs to know about each project: the letter its
// thread ids start with, and its build clocks. A clock is one line of builds:
// the version under discussion and the one after it (where deferred threads
// and anything raised after its freeze go), the zones its page groups threads
// under, the zones whose new threads are about it unless said otherwise, and
// its page. Quiver has one clock, the Dev Kit. Longshot is a pack family
// (Thomas, Nov 16): each variant has its own clock, and the BMS both of them
// wait on has its own.
// Version names must differ across every clock in the app: the database keys
// each version's freeze and retro pool by its name. Longshot's 14S9P clock
// keeps the name it had when it was the only one, "Longshot PT2", so the
// threads on it stay put; the label says which pack it is.

export interface Clock {
  /** Its page's sidebar item, unique within the project. */
  id: string;
  project: string;
  /** On screen: the version under discussion, and the one after it. */
  label: string;
  laterLabel: string;
  /** What the database keys threads, freezes and retro pools by. */
  next: string;
  later: string;
  /** Versions of this line already built, by database name, with their names on screen: a thread about one is about that build. */
  built?: Record<string, string>;
  /** The variant it builds (Longshot); absent when it serves every variant. */
  variant?: string;
  /** Zones its page groups threads under, in page order. */
  zones: string[];
  /** Zones whose new threads are about this clock unless said otherwise. */
  defaultFor: string[];
  /** Its page. */
  path: string;
}

export interface Plan {
  project: string;
  /** Thread ids: Q-1 on Quiver, L-1 on Longshot. */
  prefix: string;
  /** Its build clocks; the first is the one the project leads with. */
  clocks: Clock[];
}

const QUIVER_ZONES = ['airframe', 'gps-rf', 'propulsion', 'power', 'avionics', 'harness'];
// The parts of a pack, in page order. Every variant has them, so a thread
// started in one of them says which build it's for, or none.
const PACK_ZONES = ['cells', 'busbars', 'connector', 'enclosure', 'mounting'];

export const plans: Record<string, Plan> = {
  quiver: {
    project: 'quiver',
    prefix: 'Q',
    clocks: [
      { id: 'v1-1', project: 'quiver', label: 'Dev Kit v1.1', laterLabel: 'Dev Kit v1.2', next: 'Dev Kit v1.1', later: 'Dev Kit v1.2', zones: QUIVER_ZONES, defaultFor: QUIVER_ZONES, path: '/quiver/overview/v1-1' },
    ],
  },
  longshot: {
    project: 'longshot',
    prefix: 'L',
    clocks: [
      // Fit questions for Quiver live in Quiver's workspace (Q-18 to Q-22), so
      // the Quiver page doesn't default to a build. Spearhead has no workspace,
      // so its page shapes the 14S3P's build.
      { id: '14s9p-pt2', project: 'longshot', label: '14S9P PT2', laterLabel: '14S9P PT3', next: 'Longshot PT2', later: 'Longshot PT3', built: { 'Longshot PT1': '14S9P PT1' }, variant: '14s9p', zones: [...PACK_ZONES, 'on-quiver'], defaultFor: [], path: '/longshot/overview/14s9p-pt2' },
      { id: '14s3p-pt1', project: 'longshot', label: '14S3P PT1', laterLabel: '14S3P PT2', next: 'Longshot 14S3P PT1', later: 'Longshot 14S3P PT2', variant: '14s3p', zones: [...PACK_ZONES, 'on-spearhead'], defaultFor: ['on-spearhead'], path: '/longshot/overview/14s3p-pt1' },
      { id: 'bms-v1', project: 'longshot', label: 'BMS v1', laterLabel: 'BMS v2', next: 'Longshot BMS v1', later: 'Longshot BMS v2', zones: ['bms', 'can', 'charging'], defaultFor: ['bms', 'can', 'charging'], path: '/longshot/overview/bms-v1' },
    ],
  },
};

const allClocks = Object.values(plans).flatMap((p) => p.clocks);

export const planOf = (project: string | undefined) => plans[project ?? 'quiver'] ?? plans.quiver;
export const clocksOf = (project: string | undefined) => planOf(project).clocks;
/** The clock a project leads with: Quiver's Dev Kit, Longshot's 14S9P. */
export const mainClock = (project: string | undefined) => planOf(project).clocks[0];
export const clockById = (id: unknown) => allClocks.find((c) => c.id === id);
/** The clock a version belongs to: its version under discussion, the one after it, or one already built. */
export const clockOfVersion = (version: string | undefined) =>
  version ? allClocks.find((c) => c.next === version || c.later === version || !!c.built?.[version]) : undefined;
/** The clock new threads in a zone are about, unless said otherwise. */
export const defaultClock = (zone: string) => allClocks.find((c) => c.defaultFor.includes(zone));
/** A version's name on screen: "14S3P PT1" for "Longshot 14S3P PT1"; anything else as it is. */
export const versionLabel = (version: string) => {
  const c = clockOfVersion(version);
  return c ? (c.next === version ? c.label : c.later === version ? c.laterLabel : c.built![version]) : version;
};
