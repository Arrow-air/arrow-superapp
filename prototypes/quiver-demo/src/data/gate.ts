// Road to selling: what stands between Quiver and US sales, as Thomas listed
// it on the Sep 29 call. Status is what the call notes say, nothing more.

export type GateStatus = 'waiting' | 'in-progress' | 'open';

export interface GateItem {
  id: string;
  title: string;
  owners: string[];
  status: GateStatus;
  statusText: string;
  /** The next concrete step, from the call notes. */
  next: string;
  zone?: string;
  thread?: string;
  tasks?: string[];
  issues?: number[];
  prs?: number[];
  callItem: string;
}

export const gate: GateItem[] = [
  {
    id: 'faa', title: 'FAA approval to sell', owners: ['thomas'], status: 'waiting', statusText: 'Waiting on the FAA',
    next: 'Nothing to do until the FAA answers.', callItem: 'sep29-1',
  },
  {
    id: 'foam', title: 'Foam case inserts', owners: ['thomas'], status: 'waiting', statusText: 'Waiting on the CNC router',
    next: 'Cut them on the CNC router when it arrives; by hand if it comes to that.', callItem: 'sep29-2',
  },
  {
    id: 'oa', title: 'Obstacle avoidance tested and documented', owners: ['erick', 'zeynep'], status: 'in-progress', statusText: 'Testing',
    next: 'Zeynep sends the updated parameters; Erick tests at the park on Thursday morning.',
    zone: 'obstacle-avoidance', issues: [203], prs: [247], callItem: 'sep29-13',
  },
  {
    id: 'gps', title: 'GPS interference found and fixed', owners: ['julius', 'erick'], status: 'open', statusText: 'Diagnosing; fix not chosen',
    next: 'Julius flies the Ethernet build this week (T-13); Erick checks the switches with the spectrum analyzer. Then pick a fix.',
    zone: 'gps-interference', thread: 'Q-3', tasks: ['T-13'], issues: [191], callItem: 'sep29-10',
  },
];
