// The four PCBs on Quiver, from the KiCad sources on project-quiver main
// (scripts/build-pcbs.mjs). The board files render in the browser with
// KiCanvas; the footprint list comes from parsing the same files.
import data from './generated/pcbs.json';

export interface Footprint { ref: string; value: string; footprint: string; description: string; layer: string; x: number; y: number }
export interface Board { id: string; name: string; short: string; part: string; path: string; file: string; footprints: Footprint[] }

export const pcbCommit: string = data.commit;
export const boards = data.boards as Board[];
export const boardById = (id: string | undefined) => boards.find((b) => b.id === id);
/** The v1.1 zone a change to each board is discussed in. */
export const boardZone: Record<string, string> = { main: 'avionics', fc: 'avionics', battery: 'power', attach: 'interface' };

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
