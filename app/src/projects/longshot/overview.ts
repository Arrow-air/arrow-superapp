// Longshot at a glance: where each piece of the family stands, the dates
// that got it here, and what the DAO approved. Every line carries its source.
import { BUILD_14S3P, LS, OCT27_NOTES, PROPOSAL, SEP29, SNAPSHOT, W09, W10, src } from './sources';

export type StepTone = 'done' | 'interim' | 'open' | 'blocked';
export interface Step {
  id: string; title: string; tone: StepTone; state: string; detail: string;
  /** Where the title goes: a zone, or a page (a variant's). */
  zone?: string; to?: string;
  thread?: string; source: { label: string; url: string };
}

/** The road from PT1 to packs that manage themselves, in Quiver and Spearhead. */
export const steps: Step[] = [
  { id: 'pt1', title: '14S9P PT1 built', tone: 'done', state: 'Done Aug 29', detail: 'Quiver\'s pack: 126 cells, 11.2 kg, about 200 g under the Tattu it replaces.', to: '/longshot/overview/14s9p', thread: 'L-9', source: src('LS #26', `${LS}/issues/26`) },
  { id: 'flown', title: 'Flown on Quiver', tone: 'interim', state: 'Flown, not written up', detail: 'At least one flight logged by Sep 29. The bench and flight-test report Phase 1 promised isn\'t posted.', zone: 'testing', thread: 'L-4', source: src('Sep 29 call', SEP29) },
  { id: '14s3p', title: '14S3P designed', tone: 'interim', state: 'Parts list Nov 3', detail: 'Spearhead\'s pack: 42 Tenpower 6.0 Ah cells, 180 × 180 mm, an AS150U lead. No build on record yet.', to: '/longshot/overview/14s3p', thread: 'L-6', source: src('Build site', BUILD_14S3P) },
  { id: 'charging', title: 'Charging', tone: 'interim', state: 'Through exposed leads', detail: 'The 14S9P charges on a Tattu TA3200 through the SL board\'s charge and balance connectors. Only its standard 4.2 V version suits Longshot.', zone: 'charging', thread: 'L-3', source: src('SL_PCB README', `${LS}/blob/main/engineering/electronics/pcbs/SL_PCB/README.md`) },
  { id: 'bms', title: 'BMS', tone: 'blocked', state: 'Not built yet', detail: 'One design, inside the pack, for every variant (Oct 27). The first battery boards ship without it. No BMS board on record yet.', zone: 'bms', thread: 'L-1', source: src('Oct 27 notes', OCT27_NOTES) },
  { id: 'can', title: 'Telemetry and CAN charging', tone: 'open', state: 'Protocol undecided', detail: 'Mirror the Tattu protocol, or a native DroneCAN battery node. Nothing yet on what the charger expects over CAN.', zone: 'can', thread: 'Q-19', source: src('Proposal', PROPOSAL) },
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
  { date: '2026-10-15', text: 'PT1\'s build issues, #21 to #25, close.', source: src('LS #25', `${LS}/issues/25`) },
  { date: '2026-10-15', text: 'Longshot\'s hardware goes under CERN-OHL-S v2.', source: src('LS PR #28', `${LS}/pull/28`) },
  { date: '2026-10-19', text: 'The SL board\'s KiCad project is updated from Julius\'s files.', source: src('LS PR #31', `${LS}/pull/31`) },
  { date: '2026-10-27', text: 'The BMS will sit inside the pack, not on Spearhead\'s connector board; Spearhead\'s pack stays 180 × 180 mm.', source: src('Oct 27 notes', OCT27_NOTES) },
  { date: '2026-11-03', text: 'The 14S3P\'s model and parts list are on Julius\'s build site: 42 Tenpower cells and an AS150U lead.', source: src('Build site', BUILD_14S3P) },
];

export const links = [
  { label: 'project-longshot', url: LS },
  { label: 'Proposal', url: PROPOSAL },
  { label: 'Snapshot vote', url: SNAPSHOT },
  { label: 'Build site', url: 'https://build.jfw.engineering/' },
];
