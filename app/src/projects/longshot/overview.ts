// Longshot at a glance: where each piece of the project stands, the dates
// that got it here, and what the DAO approved. Every line carries its source.
import { LS, PROPOSAL, SEP29, SNAPSHOT, W09, W10, src } from './sources';

export type StepTone = 'done' | 'interim' | 'open' | 'blocked';
export interface Step { id: string; title: string; tone: StepTone; state: string; detail: string; zone: string; thread?: string; source: { label: string; url: string } }

/** The road from PT1 to a pack that manages itself, in Quiver and Spearhead. */
export const steps: Step[] = [
  { id: 'pt1', title: 'PT1 built', tone: 'done', state: 'Done Aug 29', detail: '14S9P, 126 cells, 11.2 kg: about 200 g under the Tattu it replaces.', zone: 'builds', thread: 'L-9', source: src('LS #26', `${LS}/issues/26`) },
  { id: 'flown', title: 'Flown on Quiver', tone: 'interim', state: 'Flown, not written up', detail: 'At least one flight logged by Sep 29. The bench and flight-test report Phase 1 promised isn\'t posted.', zone: 'testing', thread: 'L-4', source: src('Sep 29 call', SEP29) },
  { id: 'charging', title: 'Charging', tone: 'interim', state: 'Through exposed leads', detail: 'A Tattu TA3200 on the SL board\'s charge and balance connectors. Only its standard 4.2 V version suits Longshot.', zone: 'charging', thread: 'L-3', source: src('SL_PCB README', `${LS}/blob/main/engineering/electronics/pcbs/SL_PCB/README.md`) },
  { id: 'bms', title: 'BMS', tone: 'blocked', state: 'Not built yet', detail: 'A dev board to test and copy, a bounty for a freelancer, AI-assisted design in parallel. No update on Oct 5.', zone: 'bms', thread: 'L-1', source: src('Oct 5 notes', `${W10}#october-5-2026`) },
  { id: 'can', title: 'Telemetry and CAN charging', tone: 'open', state: 'Protocol undecided', detail: 'Mirror the Tattu protocol, or a native DroneCAN battery node. Nothing yet on what the charger expects over CAN.', zone: 'can', thread: 'Q-19', source: src('Proposal', PROPOSAL) },
  { id: 'spearhead', title: 'Spearhead variant', tone: 'open', state: 'Sized Sep 22', detail: '14S3P, 19.5 Ah, about 4 kg, AS150U; without a BMS at first. About a month for it plus the BMS (Oct 5).', zone: 'on-spearhead', thread: 'L-6', source: src('Sep 22 notes', `${W09}#september-22-2026--longshot-battery--bms-call`) },
];

export const timeline: { date: string; text: string; source: { label: string; url: string } }[] = [
  { date: '2026-03-10', text: 'Julius posts the Project Longshot proposal: a custom 14S9P 21700 pack as a drop-in for Quiver\'s Tattu.', source: src('Proposal', PROPOSAL) },
  { date: '2026-04-08', text: 'The DAO approves Phase 1 on Snapshot, 6 votes, all for.', source: src('Snapshot', SNAPSHOT) },
  { date: '2026-05-01', text: 'Julius\'s Vector BMS is imported as BMSJ, a reference design.', source: src('LS PR #4', `${LS}/pull/4`) },
  { date: '2026-06-11', text: '140 BAK 21700 65E cells and the copper busbars are ordered.', source: src('LS PR #19', `${LS}/pull/19`) },
  { date: '2026-07-21', text: 'Quiver #188 closes: the custom pack is now Project Longshot.', source: src('Quiver #188', 'https://github.com/Arrow-air/project-quiver/issues/188') },
  { date: '2026-08-29', text: 'PT1 is complete at 11.2 kg.', source: src('LS #26', `${LS}/issues/26`) },
  { date: '2026-09-22', text: 'Longshot battery and BMS call: a third-size Longshot for Spearhead, and a bounty reserved for the BMS.', source: src('Sep 22 notes', `${W09}#september-22-2026--longshot-battery--bms-call`) },
  { date: '2026-09-25', text: 'A second Longshot replaces Spearhead\'s gas tank in the electric configuration.', source: src('Sep 25 notes', `${W09}#september-25-2026`) },
  { date: '2026-09-29', text: 'Julius has a BMS dev board, and the log from a Longshot flight.', source: src('Sep 29 call', SEP29) },
  { date: '2026-10-05', text: 'Longshot\'s customization for Spearhead plus the BMS: about a month.', source: src('Oct 5 notes', `${W10}#october-5-2026`) },
  { date: '2026-10-10', text: 'The build123d model of PT1 is merged, with a BOM generated from it.', source: src('LS PR #27', `${LS}/pull/27`) },
];

export const links = [
  { label: 'project-longshot', url: LS },
  { label: 'Proposal', url: PROPOSAL },
  { label: 'Snapshot vote', url: SNAPSHOT },
];
