// Each project's 3D model page: the file and how to read it (for CadModel),
// the zones its parts are discussed in, what to say about a part, and where
// the model comes from. ModelPage draws whichever project is on screen.
import type { ModelLook } from '../modules/model/CadModel.vue';
import { bom, partById } from '../data/quiver';
import { zoneForPart } from '../data/model';
import { lsBom, lsBomById, LS_REPO } from './longshot/github';
import { lsFamily, lsPartName, lsZoneForPart } from './longshot/parts';
import { planOf } from './plans';

export interface PartFacts { qty?: string; material?: string; cost?: string; supplier?: string; makeBuy?: string; note?: string; source?: { label: string; url: string } }

export interface ModelConfig {
  look: ModelLook;
  /** The inspector's heading, and the line above it. */
  title: string;
  kicker: string;
  /** Short name for tiles and rows. */
  partName: (id: string) => string;
  /** Hover labels, by part number. */
  labels: Record<string, string>;
  zoneForPart: (id: string) => string;
  /** Zones in tile order; any other zone with parts follows. */
  zoneOrder: string[];
  facts: (id: string) => PartFacts;
  /** Where the model comes from, under the inspector. */
  source: { text: string; links: { label: string; url: string }[] };
  bomPath: string;
  /** The version a thread started here is about. */
  version: string;
}

const money = (n: number | null | undefined) => (n == null ? undefined : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

const quiver: ModelConfig = {
  look: {
    src: 'quiver.glb',
    subject: 'Quiver Dev Kit',
    // Every mesh sits under a node named for its four-digit BOM number.
    partOf: (name) => /^(\d{4})/.exec(name)?.[1] ?? '',
    // BOM families: structure, supporting structure, equipment, harness.
    familyOf: (id) => id[0],
    palette: {
      dark: { '1': '#8a939e', '2': '#c3c8ce', '3': '#4f9a84', '4': '#d08c48' },
      light: { '1': '#3a3f46', '2': '#9aa1aa', '3': '#3f7a69', '4': '#b97a3a' },
    },
    legend: [{ family: '1', label: 'Structure' }, { family: '3', label: 'Equipment', wide: true }],
    metallic: (id) => id[0] === '2',
    lift: 1.6,
  },
  title: 'Dev Kit',
  kicker: 'Quiver · build123d CAD on project-quiver main',
  partName: (id) => partById(id)?.name.split(',')[0] ?? id,
  labels: Object.fromEntries(bom.flatMap((g) => g.items.map((i) => [i.id, i.name]))),
  zoneForPart,
  zoneOrder: [...planOf('quiver').nextZones, 'interface'],
  facts: (id) => {
    const p = partById(id);
    if (!p) return {};
    return {
      qty: p.qty > 1 ? `${p.qty} on the aircraft` : undefined,
      material: p.material ?? p.spec ?? undefined,
      cost: money(p.unitCostUsd),
      supplier: p.suppliers.map((s) => s.name).join(', ') || undefined,
    };
  },
  source: {
    text: 'From the build123d CAD on project-quiver main; fasteners are left out. Fusion changes waiting in PR #266 appear once it merges.',
    links: [
      { label: 'build123d CAD', url: 'https://github.com/Arrow-air/project-quiver/tree/main/src/quiver' },
      { label: 'PR #266', url: 'https://github.com/Arrow-air/project-quiver/pull/266' },
    ],
  },
  bomPath: '/quiver/build/bom',
  version: planOf('quiver').next,
};

// Longshot's node names start with the build123d BOM part number, then an
// instance number when a part repeats (PW-CELL-001-21700 17). Longest match
// first, so EN-CELL-001-Upper_Cell_Holder never reads as a shorter id.
const lsIds = lsBom.map((b) => b.id).sort((a, b) => b.length - a.length);
const lsPartOf = (name: string) => lsIds.find((id) => name === id || name.startsWith(`${id} `) || name.startsWith(`${id}_`) || name.startsWith(`${id}#`)) ?? '';

const longshot: ModelConfig = {
  look: {
    src: 'longshot.glb',
    subject: 'Longshot PT1',
    partOf: lsPartOf,
    familyOf: lsFamily,
    palette: {
      // Boards in plum, so they never read as the blue of a selection.
      dark: { cell: '#4f9a84', copper: '#d08c48', print: '#8a939e', plate: '#c3c8ce', pcb: '#a07fcf', hardware: '#a9a07a' },
      light: { cell: '#3f7a69', copper: '#b97a3a', print: '#3a3f46', plate: '#9aa1aa', pcb: '#7656ad', hardware: '#7d7550' },
    },
    legend: [{ family: 'cell', label: 'Cells' }, { family: 'copper', label: 'Busbars' }, { family: 'pcb', label: 'Boards', wide: true }],
    metallic: (id) => /^(PW-BUS|EN-SHEET|EN-STRAP-00[13])/.test(id),
    lift: 1.3,
  },
  title: 'Longshot PT1',
  kicker: 'Longshot · build123d CAD on project-longshot main',
  partName: (id) => lsPartName(id) ?? id,
  labels: Object.fromEntries(lsBom.map((b) => [b.id, lsPartName(b.id) ?? b.description])),
  zoneForPart: lsZoneForPart,
  zoneOrder: ['cells', 'busbars', 'connector', 'enclosure', 'mounting'],
  facts: (id) => {
    const b = lsBomById(id);
    if (!b) return {};
    return {
      qty: b.qty > 1 ? `${b.qty} in the pack` : undefined,
      material: b.material ?? undefined,
      makeBuy: b.makeBuy === 'buy' ? 'Bought in' : b.makeBuy.replace(/^make/, 'Made'),
      note: b.description !== lsPartName(id) ? b.description : undefined,
      source: b.source ? { label: 'build123d source', url: `${LS_REPO}/blob/main/engineering/cad/build123d/${b.source.split(';')[0].trim()}` } : undefined,
    };
  },
  source: {
    text: 'From the build123d model of the PT1 main assembly on project-longshot main (PR #27), rebuilt from the Fusion design. The cells are a CAD stand-in; PT1 uses BAK 21700 65E cells.',
    links: [
      { label: 'build123d model', url: `${LS_REPO}/tree/main/engineering/cad/build123d` },
      { label: 'PR #27', url: `${LS_REPO}/pull/27` },
    ],
  },
  bomPath: '/longshot/build/bom',
  version: planOf('longshot').next,
};

const configs: Record<string, ModelConfig> = { quiver, longshot };
export const modelFor = (project: string | undefined) => configs[project ?? 'quiver'] ?? quiver;
