// The boards on each project's PCB page, from the KiCad sources on the
// project's main branch (scripts/build-pcbs.mjs): Quiver's four PCBs, and
// Longshot's BMSJ. The board files render in the browser with KiCanvas; the
// footprint list comes from parsing the same files. Board ids are unique
// across projects, so a thread's board names its project.
import data from './generated/pcbs.json';
import lsData from './generated/longshot-pcbs.json';

export interface Footprint { ref: string; value: string; footprint: string; description: string; layer: string; x: number; y: number }
export interface Board { id: string; name: string; short: string; part: string; path: string; file: string; footprints: Footprint[] }
interface BoardSet { repo: string; commit: string; boards: Board[] }

const sets: Record<string, BoardSet> = {
  quiver: { repo: 'https://github.com/Arrow-air/project-quiver', commit: data.commit, boards: data.boards as Board[] },
  longshot: { repo: 'https://github.com/Arrow-air/project-longshot', commit: lsData.commit, boards: lsData.boards as Board[] },
};
export const boardSet = (project: string | undefined) => sets[project ?? 'quiver'] ?? sets.quiver;
export const pcbCommit: string = data.commit;
export const boards = sets.quiver.boards;
const allBoards = Object.values(sets).flatMap((s) => s.boards);
export const boardById = (id: string | undefined) => allBoards.find((b) => b.id === id);
/** Where a board stands, when the file alone would mislead. */
export const boardNote: Record<string, string> = {
  bmsj: 'The schematic carries the whole design: an STM32L476, two LTC6811 cell monitors, an INA226 current monitor and isolated CAN. The layout has not started: only the ET60S connector sits on the outline, the other 309 footprints wait beside it, and the ICs are not in the PCB file yet.',
};
/** The zone a change to each board is discussed in. */
export const boardZone: Record<string, string> = { main: 'avionics', fc: 'avionics', battery: 'power', attach: 'interface', bmsj: 'bms' };

// Groups for the component list: the parts people discuss first, passives last.
export const groupsOf = [
  { id: 'ic', label: 'ICs and modules', match: /^(U|IC|PS)\d/ },
  { id: 'conn', label: 'Connectors', match: /^J\d/ },
  { id: 'power', label: 'Power and switching', match: /^(F|K|Q)\d/ },
  { id: 'other', label: 'LEDs, diodes, switches, test points', match: /^(LED|D|S|X|Z|TP|JP|LS)\d/ },
  { id: 'passive', label: 'Resistors and capacitors', match: /^(R|C)\d/ },
];
export const groupOf = (ref: string) => groupsOf.find((g) => g.match.test(ref))?.id ?? 'other';
export const naturalRef = (a: Footprint, b: Footprint) => a.ref.localeCompare(b.ref, 'en', { numeric: true });
