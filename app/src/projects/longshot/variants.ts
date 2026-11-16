// Longshot is one project and a family of packs (Thomas, Nov 16): each
// aircraft gets a variant with its own spec sheet and build clock, and the
// hard parts are shared (the BMS, the cells and welding, the charging rules,
// the protocol, the team and the funding line). Rule of thumb: the pack
// belongs to Longshot; how it fits belongs to the aircraft. Every fact here
// either applies to one variant or to all of them, with its source, so the
// two spec sheets never contradict each other.
import type { Thread } from '../../modules/threads/data';
import { clockById, clockOfVersion, versionLabel } from '../plans';
import { AIP007, BUILD_14S3P, BUILD_14S9P, LS, OCT27_NOTES, PROPOSAL, SEP22_NOTES, SEP25_NOTES, SEP29, src } from './sources';

type Src = ReturnType<typeof src>;
export type VariantId = '14s9p' | '14s3p';

export interface Variant {
  id: VariantId;
  /** Series by parallel: what the pack is called on the build site and in the calls. */
  code: string;
  aircraft: string;
  /** Its page, under Overview. */
  page: string;
  /** Where its fit on the aircraft is discussed. */
  aircraftZone: string;
  /** Its build clock (plans.ts). */
  clock: string;
  /** Builds so far, oldest first, before the one its clock is collecting. */
  built: { code: string; text: string; source: Src }[];
  lede: string;
  stage: { tone: 'done' | 'interim' | 'open'; text: string };
  /** Model and parts: in this app (the 14S9P's build123d model), or only on the build site. */
  model: { inApp: boolean; text: string; source: Src };
  buildSite: string;
}

export const variants: Variant[] = [
  {
    id: '14s9p',
    code: '14S9P',
    aircraft: 'Quiver',
    page: '/longshot/overview/14s9p',
    aircraftZone: 'on-quiver',
    clock: '14s9p-pt2',
    built: [{ code: 'PT1', text: 'Built Aug 29 at 11.2 kg, and flown on Quiver. No test report yet.', source: src('LS #26', `${LS}/issues/26`) }],
    lede: 'The pack Longshot started as: a drop-in for the Tattu 4.0 30 Ah that Quiver flies, with about twice its capacity at the same weight. PT1 is built and has flown. It has no BMS, so it charges through exposed balance leads. PT2 is the same pack with a battery board that has the BMS built in.',
    stage: { tone: 'interim', text: 'PT1 built and flown; PT2 waits on the BMS' },
    model: { inApp: true, text: 'The build123d model of PT1, rebuilt from Julius\'s Fusion design, with a BOM generated from it.', source: src('LS PR #27', `${LS}/pull/27`) },
    buildSite: BUILD_14S9P,
  },
  {
    id: '14s3p',
    code: '14S3P',
    aircraft: 'Spearhead',
    page: '/longshot/overview/14s3p',
    aircraftZone: 'on-spearhead',
    clock: '14s3p-pt1',
    built: [],
    lede: 'A Longshot about a third the size, for Spearhead, which moves to 14S for it. The first one has no BMS; the same cells and layout later take a board with the BMS built in. In the electric configuration a second pack replaces the gas tank.',
    stage: { tone: 'open', text: 'Designed; no build on record yet' },
    model: { inApp: false, text: 'Its model and parts list are on Julius\'s build site, generated Nov 3. project-longshot has no 14S3P files yet.', source: src('Build site: 14S3P', BUILD_14S3P) },
    buildSite: BUILD_14S3P,
  },
];

export const variantById = (id: string | undefined) => variants.find((v) => v.id === id);
/** The variant whose fit an aircraft zone is about. */
export const variantOfZone = (zone: string) => variants.find((v) => v.aircraftZone === zone)?.id;
/** Which variant a thread is about: its build clock's, else its aircraft zone's. None means every pack. */
export const variantOf = (t: Thread): VariantId | undefined =>
  (clockOfVersion(t.version)?.variant as VariantId | undefined) ?? variantOfZone(t.zone);
/** What a Longshot thread is for, in a word or two: its build, else its variant, else every pack. */
export function forLabel(t: Thread): string | undefined {
  if (t.project !== 'longshot') return undefined;
  if (clockOfVersion(t.version)) return versionLabel(t.version);
  return variantById(variantOf(t))?.code ?? 'All packs';
}
export const clockOfVariant = (v: Variant) => clockById(v.clock)!;

/** Narrowing a list of Longshot threads by pack: any, one variant's, or the ones about every pack. */
export type PackFilter = 'any' | VariantId | 'all';
export const packFilters: { id: PackFilter; label: string }[] = [
  { id: 'any', label: 'Any pack' },
  ...variants.map((v) => ({ id: v.id, label: v.code })),
  { id: 'all', label: 'All packs' },
];
export const asPackFilter = (x: unknown): PackFilter => (packFilters.some((f) => f.id === x) ? (x as PackFilter) : 'any');
export const matchesPack = (t: Thread, f: PackFilter) => f === 'any' || (f === 'all' ? !variantOf(t) : variantOf(t) === f);

// The spec sheets, side by side. A row exists when both variants have
// something to say; a cell may say it isn't known yet.
export interface SpecCell { value: string; sources: Src[]; thread?: string }
export interface SpecRow { id: string; label: string; cells: Record<VariantId, SpecCell> }

const LS26 = src('LS #26', `${LS}/issues/26`);
const SL_README = src('SL_PCB README', `${LS}/blob/main/engineering/electronics/pcbs/SL_PCB/README.md`);
const SEP22 = src('Sep 22 notes', SEP22_NOTES);
const OCT27 = src('Oct 27 notes', OCT27_NOTES);
const SITE9 = src('Build site: 14S9P', BUILD_14S9P);
const SITE3 = src('Build site: 14S3P', BUILD_14S3P);

export const specRows: SpecRow[] = [
  {
    id: 'stage', label: 'Stage',
    cells: {
      '14s9p': { value: 'PT1 built Aug 29 and flown on Quiver; no test report yet.', sources: [LS26, src('Sep 29 call', SEP29)], thread: 'L-4' },
      '14s3p': { value: 'Designed: model and parts list on the build site, generated Nov 3. No build on record yet.', sources: [SITE3] },
    },
  },
  {
    id: 'cells', label: 'Cells',
    cells: {
      '14s9p': { value: '126 × BAK 21700 65E, 6.5 Ah.', sources: [LS26, SITE9] },
      '14s3p': { value: '42 × Tenpower INR21700-60XG, 6.0 Ah, 40 A. The Sep 22 sizing assumed 6.5 Ah cells.', sources: [SITE3, SEP22], thread: 'L-5' },
    },
  },
  {
    id: 'capacity', label: 'Capacity',
    cells: {
      '14s9p': { value: '58.5 Ah.', sources: [LS26] },
      '14s3p': { value: '18.0 Ah, worked out from its cells (3 × 6.0 Ah). 19.5 Ah in the Sep 22 sizing.', sources: [SITE3, SEP22] },
    },
  },
  {
    id: 'mass', label: 'Mass',
    cells: {
      '14s9p': { value: '11.2 kg, weighed Aug 29.', sources: [LS26] },
      '14s3p': { value: 'About 4 kg, a desk estimate for 6.5 Ah cells. Not weighed.', sources: [SEP22] },
    },
  },
  {
    id: 'size', label: 'Size',
    cells: {
      '14s9p': { value: 'The Tattu 4.0\'s footprint, with its clip, to slide into Quiver\'s battery bay. The fit isn\'t checked yet.', sources: [src('LS PR #27', `${LS}/pull/27`)], thread: 'Q-18' },
      '14s3p': { value: '180 × 180 mm, about 90.9 mm tall. No aluminium side sheets in its parts list; the 14S9P has two.', sources: [OCT27, SITE3, SITE9] },
    },
  },
  {
    id: 'output', label: 'Output',
    cells: {
      '14s9p': { value: 'ET60S-D06 on the SL board. Whether it mates with Quiver\'s connector board isn\'t checked.', sources: [SITE9], thread: 'Q-18' },
      '14s3p': { value: 'An 8 AWG cable to an AS150U, and a CAN pair.', sources: [SITE3, SEP22] },
    },
  },
  {
    id: 'bms', label: 'BMS',
    cells: {
      '14s9p': { value: 'None: the SL board passes the cell-sense lines through. The next battery board has the BMS fitted.', sources: [SL_README, SEP22], thread: 'L-1' },
      '14s3p': { value: 'None on the first battery board. The same cells and layout later take a board with the BMS built in; Spearhead PT2\'s battery has one.', sources: [OCT27], thread: 'L-1' },
    },
  },
  {
    id: 'charging', label: 'Charging',
    cells: {
      '14s9p': { value: 'A TA3200 (standard 4.2 V version) on exposed charge and balance connectors.', sources: [SL_README], thread: 'L-3' },
      '14s3p': { value: 'With the BMS: a charge cable straight to it, from a socket on Spearhead\'s skin, likely an AS150U. Before it: open.', sources: [OCT27], thread: 'L-7' },
    },
  },
  {
    id: 'per-aircraft', label: 'Per aircraft',
    cells: {
      '14s9p': { value: 'One, in place of the Tattu.', sources: [src('Quiver #188', 'https://github.com/Arrow-air/project-quiver/issues/188')] },
      '14s3p': { value: 'Likely two on Spearhead PT2: in the electric configuration the second replaces the gas tank.', sources: [src('Sep 25 notes', SEP25_NOTES), src('Sep 29 call', SEP29)], thread: 'L-7' },
    },
  },
  {
    id: 'model', label: 'Model and parts',
    cells: {
      '14s9p': { value: 'build123d model and BOM in project-longshot; parts list on the build site.', sources: [src('LS PR #27', `${LS}/pull/27`), SITE9] },
      '14s3p': { value: 'On the build site only; nothing in project-longshot yet.', sources: [SITE3] },
    },
  },
  {
    id: 'funding', label: 'Funding',
    cells: {
      '14s9p': { value: 'Phase 1 (AIP-007), which ran to May 2026.', sources: [src('AIP-007', AIP007)], thread: 'L-8' },
      '14s3p': { value: 'Nothing on record. Alperen offered Spearhead money for the BMS if Longshot\'s budget falls short.', sources: [SEP22], thread: 'L-8' },
    },
  },
];

/** What every Longshot has, whichever aircraft it flies in. */
export const shared: { label: string; text: string; sources: Src[] }[] = [
  { label: 'Chemistry', text: 'Li-ion at 4.2 V a cell: 58.8 V full on 14S. Never charge it on the LiHV profile the Tattu uses.', sources: [LS26] },
  { label: 'Build', text: '21700 cells spot-welded to 0.2 mm copper busbars, in printed holders with heat-set inserts, between 3 mm polycarbonate plates.', sources: [SITE9, SITE3] },
  { label: 'Boards', text: 'An SL board with four voltage-sense boards and a fused balance connector. Each variant has its own layout.', sources: [SITE9, SITE3] },
  { label: 'BMS', text: 'One design for every pack, inside the pack. Alperen wants it to cover Arrow\'s packs from 12S to 24S.', sources: [OCT27, SEP22] },
  { label: 'Protocol', text: 'Open: mirror the Tattu\'s, or a native DroneCAN battery node.', sources: [src('Proposal', PROPOSAL)] },
  { label: 'License', text: 'CERN-OHL-S v2 for the hardware.', sources: [src('LS PR #28', `${LS}/pull/28`)] },
];
