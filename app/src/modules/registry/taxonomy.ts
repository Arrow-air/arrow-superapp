// Taxonomy v1.0 lookups for the registry's pieces: which group a discipline
// sits in, and that group's colour (Gavin's, from the website's list).
import { TAXONOMY } from '../../lib/registry';

const GROUP = new Map<string, { group: string; colour: string }>();
for (const [group, , colour, tags] of TAXONOMY) for (const t of tags) GROUP.set(t, { group, colour });

/** The group colour of a discipline; slate grey for anything off the list. */
export const colourOf = (discipline: string) => GROUP.get(discipline)?.colour ?? '#9fa4ac';
export const groupOf = (discipline: string) => GROUP.get(discipline)?.group ?? '';

/** "Electrical, Power and Assembly". */
export function listing(items: string[], and = 'and') {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`;
}

/** Someone's local time, like "10:14 PM", or '' for an unknown zone. */
export function localTime(tz: string | null | undefined, at = new Date()) {
  if (!tz) return '';
  try { return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(at); } catch { return ''; }
}

/** Two initials for an avatar. */
export const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
