// Part names across projects. Quiver's parts are its BOM numbers (3410,
// HAR-0004); Longshot's are its build123d part numbers (PW-BUS-003-Bridge_1).
// The two never collide, so a thread's part resolves without knowing its project.
import { partById } from '../data/quiver';
import { isLongshotPart, lsPartName } from './longshot/parts';

/** A part's short name, for rows, tiles and the thread header. */
export const partLabel = (id: string | undefined) => (id ? partById(id)?.name.split(',')[0] ?? lsPartName(id) : undefined);
/** Its full name where there is one (Quiver's BOM names carry a spec after the comma). */
export const partFullName = (id: string | undefined) => (id ? partById(id)?.name ?? lsPartName(id) : undefined);
/** The project whose model the part is in. */
export const projectOfPart = (id: string) => (partById(id) ? 'quiver' : isLongshotPart(id) ? 'longshot' : undefined);
