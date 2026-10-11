// A manufacturing guide: phases of steps. Each step says what the record
// says (with its source), what to check before moving on, and what the
// record doesn't say yet, asked as questions that whoever knows answers in
// the app. Answers are keyed by question id, so ids never change once used.

export interface GuideSource { label: string; url: string }

/** One line of a step. `practice` lines are common practice, not the project's own spec yet. */
export interface GuideLine { text: string; source?: GuideSource; practice?: boolean }

export type AnswerKind = 'number' | 'text' | 'choice' | 'link';

export interface GuideQuestion {
  /** Stable once answered: answers are stored against it. */
  id: string;
  text: string;
  /** Why the guide needs it. */
  why: string;
  kind: AnswerKind;
  unit?: string;
  options?: string[];
  /** Context from common practice, shown as such, never as the answer. */
  hint?: string;
  /** A people.ts id: who most likely knows. */
  ask?: string;
  /** Answerable now from PT1, or found out on build day. */
  when: 'before' | 'build';
  /** Measured on each pack, so an answer names the build it came from. */
  perBuild?: boolean;
}

/** A picture for a step; `src` is what's shown, `full` the full-size original to open. */
export interface GuideImage { src: string; full?: string; caption: string; source: GuideSource }

/** A reference table for a step: a group map, a pin map, a weight table. */
export interface GuideTable { title: string; columns: string[]; rows: string[][]; note?: string; source?: GuideSource }

export interface GuideStep {
  id: string;
  phase: string;
  title: string;
  /** What is true when the step is done. */
  goal: string;
  /** BOM part numbers this step uses, and how many. */
  parts?: { id: string; qty: number }[];
  tools?: GuideLine[];
  how: GuideLine[];
  checks?: GuideLine[];
  safety?: GuideLine[];
  tables?: GuideTable[];
  images?: GuideImage[];
  questions: GuideQuestion[];
  /** Photos to take on build day, for the guide. */
  shots?: string[];
  issues?: number[];
  threads?: string[];
  zone?: string;
  /** The 3D model at this step: the parts drawn solid, and the ones this step adds. */
  model?: { lit: string[]; adds: string[] };
}

export interface GuidePhase { id: string; title: string; summary: string }
export interface GuideBuild { id: string; label: string }

export interface Guide {
  /** Stable: answers are stored under it. */
  id: string;
  project: string;
  title: string;
  /** What it builds: "PT1, 14S9P, 126 cells". */
  subject: string;
  intro: string;
  variantNote?: string;
  /** Where the guide's facts come from, for the header. */
  sources: GuideSource[];
  /** Builds a per-pack measurement can be about, newest first. */
  builds: GuideBuild[];
  phases: GuidePhase[];
  steps: GuideStep[];
}
