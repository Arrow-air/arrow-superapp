// "Matched for you": what someone said they can do, are learning, and have
// in their shop, against the places work is open now: threads in the Quiver
// and Longshot zones, and the Longshot manufacturing guide's unanswered
// questions. A small hand-made map from zones and guide steps to taxonomy
// disciplines, tools and lanes; every match says why it matched.
import type { RouteLocationRaw } from 'vue-router';
import { TOOLS, type BuildOption, type Lane, type Tool } from '../../lib/registry';
import { findProject, projectOfZone, zoneLabel, zonePath } from '../../frame/nav';
import { isOpen, liveComments, projectOf } from '../threads/store';
import type { Thread } from '../threads/data';
import type { GuideStep } from '../guide/types';
import { listing } from './taxonomy';

interface Tags { d: string[]; t?: Tool[]; l?: Lane[] }

/** Zones by id (unique across projects), and what work in them needs. */
export const ZONE_TAGS: Record<string, Tags> = {
  // Quiver
  airframe: { d: ['Mechanical', 'CAD', 'Composites', '3D Printing', 'Industrial'], t: ['fdm', 'composite', 'cnc'], l: ['engineer', 'hardware'] },
  'gps-rf': { d: ['Electrical', 'Telemetry'], t: ['scope', 'solder'], l: ['engineer'] },
  propulsion: { d: ['Propulsion', 'Aerodynamics', 'Power'], l: ['engineer'] },
  power: { d: ['Power', 'Electrical'], t: ['solder', 'spot', 'scope'], l: ['engineer', 'hardware'] },
  avionics: { d: ['Electrical', 'Firmware', 'Telemetry', 'Software'], t: ['solder', 'scope'], l: ['engineer', 'code'] },
  harness: { d: ['Electrical', 'Assembly'], t: ['solder'], l: ['engineer', 'hardware'] },
  'pilots-handbook': { d: ['Piloting', 'Documentation', 'Flight Test', 'Regulatory'], t: ['field', 'aircraft'], l: ['fly', 'story'] },
  maintenance: { d: ['Maintenance', 'Support'], t: ['aircraft'], l: ['fly', 'hardware'] },
  interface: { d: ['Mechanical', 'CAD', 'Electrical'], l: ['engineer'] },
  'dev-guide': { d: ['Documentation', 'Software'], l: ['code', 'story'] },
  'payload-latch': { d: ['Mechanical', 'CAD', '3D Printing'], t: ['fdm', 'resin'], l: ['engineer', 'hardware'] },
  multispectral: { d: ['Software', 'Missions'], l: ['code', 'fly'] },
  'ram-ball': { d: ['Mechanical', '3D Printing'], t: ['fdm'], l: ['hardware'] },
  spreader: { d: ['Mechanical', 'Missions'], t: ['fdm', 'weld'], l: ['hardware', 'fly'] },
  concepts: { d: ['Mechanical', 'CAD', 'Industrial'], l: ['engineer'] },
  'attachment-ideas': { d: ['Industrial', 'Missions'], l: ['engineer'] },
  sdk: { d: ['Software', 'Firmware'], l: ['code'] },
  quiverhub: { d: ['Software', 'Interface'], l: ['code'] },
  'ground-station': { d: ['Software', 'Telemetry', 'Interface'], l: ['code'] },
  autonomy: { d: ['Autonomy', 'Controls', 'Software', 'Simulation'], l: ['code'] },
  parameters: { d: ['Controls', 'Firmware', 'Flight Test'], t: ['aircraft', 'field'], l: ['code', 'fly'] },
  'flight-data': { d: ['Telemetry', 'Flight Test', 'Software'], t: ['aircraft', 'field'], l: ['fly', 'code'] },
  assembly: { d: ['Assembly', '3D Printing', 'Documentation'], t: ['fdm', 'solder'], l: ['hardware'] },
  'config-guide': { d: ['Firmware', 'Documentation'], l: ['code', 'story'] },
  case: { d: ['Industrial', 'Mechanical'], t: ['laser', 'cnc'], l: ['hardware'] },
  manufacturers: { d: ['Sourcing', 'Quality', 'Business Development'], l: ['hardware', 'dao'] },
  suppliers: { d: ['Sourcing'], l: ['hardware'] },
  'road-to-selling': { d: ['Business Development', 'Regulatory', 'Certification'], l: ['dao'] },
  'where-we-sell': { d: ['Marketing', 'Business Development'], l: ['story', 'dao'] },
  'who-we-sell-to': { d: ['Marketing', 'Business Development', 'Missions'], l: ['story', 'dao'] },
  pricing: { d: ['Business Development'], l: ['dao'] },
  'sales-page': { d: ['Marketing', 'Graphics', 'Media'], l: ['story'] },
  'dao-return': { d: ['Tokenomics', 'Governance'], l: ['dao'] },
  // Longshot
  cells: { d: ['Power', 'Electrical', 'Quality'], l: ['engineer', 'hardware'] },
  busbars: { d: ['Power', 'Assembly', 'Machining'], t: ['spot', 'cnc', 'laser'], l: ['hardware'] },
  enclosure: { d: ['Mechanical', 'CAD', '3D Printing'], t: ['fdm'], l: ['engineer', 'hardware'] },
  mounting: { d: ['Mechanical', 'CAD'], t: ['fdm'], l: ['engineer'] },
  bms: { d: ['Electrical', 'Firmware', 'Power'], t: ['solder', 'scope'], l: ['engineer', 'code'] },
  can: { d: ['Firmware', 'Telemetry', 'Software'], l: ['code'] },
  charging: { d: ['Power', 'Electrical', 'Safety'], t: ['scope'], l: ['engineer'] },
  connector: { d: ['Electrical'], t: ['solder'], l: ['engineer', 'hardware'] },
  'on-quiver': { d: ['Mechanical', 'Flight Test', 'Documentation'], t: ['aircraft'], l: ['engineer', 'fly'] },
  'on-spearhead': { d: ['Mechanical', 'Power', 'Flight Test'], l: ['engineer', 'fly'] },
  testing: { d: ['Flight Test', 'Quality', 'Safety'], t: ['field', 'aircraft', 'scope'], l: ['fly'] },
  builds: { d: ['Assembly', 'Quality', 'Workshops'], t: ['spot', 'solder', 'fdm'], l: ['hardware'] },
  sourcing: { d: ['Sourcing'], l: ['hardware'] },
  safety: { d: ['Safety', 'Regulatory'], l: ['hardware'] },
  budget: { d: ['Governance', 'Coordination', 'Tokenomics'], l: ['dao'] },
};

/** The Longshot manufacturing guide's steps, by id. */
export const GUIDE_STEP_TAGS: Record<string, Tags> = {
  bench: { d: ['Safety', 'Assembly'], t: ['solder'] },
  parts: { d: ['Assembly', 'Sourcing', 'Quality'] },
  'print-holders': { d: ['3D Printing'], t: ['fdm', 'resin'] },
  'print-case': { d: ['3D Printing', 'Mechanical'], t: ['fdm'] },
  inserts: { d: ['Assembly', '3D Printing'], t: ['solder', 'fdm'] },
  'sense-boards': { d: ['Electrical', 'Assembly'], t: ['solder'] },
  'check-cells': { d: ['Power', 'Quality'], t: ['scope'] },
  'load-cells': { d: ['Assembly', 'Power'] },
  busbars: { d: ['Power', 'Machining', 'Assembly'], t: ['cnc', 'laser'] },
  weld: { d: ['Power', 'Assembly'], t: ['spot'] },
  'sense-taps': { d: ['Electrical', 'Assembly'], t: ['solder'] },
  'sl-board': { d: ['Electrical'], t: ['solder'] },
  'balance-map': { d: ['Electrical', 'Power'], t: ['scope'] },
  'power-path': { d: ['Power', 'Electrical', 'Safety'], t: ['solder'] },
  enclose: { d: ['Mechanical', 'Assembly'], t: ['fdm'] },
  mount: { d: ['Mechanical', 'Assembly'] },
  weigh: { d: ['Quality', 'Documentation'] },
  'first-checks': { d: ['Power', 'Safety', 'Quality'], t: ['scope'] },
  'first-charge': { d: ['Power', 'Safety'], t: ['scope'] },
  capacity: { d: ['Power', 'Flight Test'], t: ['scope', 'aircraft', 'field'] },
  label: { d: ['Documentation', 'Regulatory'] },
  'store-ship': { d: ['Safety', 'Regulatory', 'Sourcing'] },
};

export interface Interests { can: string[]; learn: string[]; tools: Tool[]; lanes: Lane[]; build?: BuildOption[] }
export interface MatchItem {
  key: string;
  kind: 'guide' | 'thread' | 'zone';
  /** "Longshot · Build". */
  where: string;
  title: string;
  /** Why it matched, in words. */
  because: string;
  to: RouteLocationRaw;
  score: number;
}

interface Hit { score: number; can: string[]; learn: string[]; tools: Tool[]; lane: boolean }
function hit(t: Tags, me: Interests): Hit {
  const can = t.d.filter((x) => me.can.includes(x));
  const learn = t.d.filter((x) => me.learn.includes(x));
  const tools = (t.t ?? []).filter((x) => me.tools.includes(x));
  const lane = (t.l ?? []).some((x) => me.lanes.includes(x));
  return { score: can.length * 3 + tools.length * 2 + learn.length + (lane ? 1 : 0), can, learn, tools, lane };
}
const toolWords = (tools: Tool[]) => tools.map((t) => `your ${TOOLS[t].charAt(0).toLowerCase()}${TOOLS[t].slice(1)}`);
function why(h: Hit, more?: string) {
  const parts = [
    h.can.length ? listing(h.can) : '',
    h.tools.length ? listing(toolWords(h.tools.slice(0, 2))) : '',
    h.learn.length ? `you're learning ${listing(h.learn)}` : '',
    !h.can.length && !h.tools.length && !h.learn.length && h.lane ? 'what you want to work on' : '',
  ].filter(Boolean);
  return `because: ${[parts.join(' · '), more].filter(Boolean).join(' · ')}`;
}
const projectLabel = (id: string | undefined) => findProject(id)?.label ?? 'Arrow';

/** Up to `max` places to start, best first, at most two of any kind from the guide. */
export function matchesFor(me: Interests, threads: Thread[], guideSteps: GuideStep[], answered: (question: string) => boolean, max = 5): MatchItem[] {
  if (me.lanes.length === 1 && me.lanes[0] === 'follow') return [];
  const out: MatchItem[] = [];
  for (const s of guideSteps) {
    const tags = GUIDE_STEP_TAGS[s.id];
    const open = s.questions.filter((q) => !answered(q.id)).length;
    if (!tags || !open) continue;
    const h = hit(tags, me);
    if (!h.can.length && !h.tools.length && !h.learn.length) continue;
    // Builders who'd make a pack of their own weigh the guide a little higher.
    const bonus = (me.lanes.includes('hardware') ? 1 : 0) + (me.build?.includes('own') ? 1 : 0);
    out.push({
      key: `guide:${s.id}`, kind: 'guide', where: 'Longshot · Manufacturing guide',
      title: `${s.title}: ${open} open question${open === 1 ? '' : 's'}`,
      because: why(h, 'your answer goes straight into the guide'), to: { path: '/longshot/build/guide', query: { step: s.id } }, score: h.score + bonus,
    });
  }
  const zonesWithThreads = new Set<string>();
  for (const t of threads) {
    if (!isOpen(t)) continue;
    const tags = ZONE_TAGS[t.zone];
    if (!tags) continue;
    zonesWithThreads.add(t.zone);
    const h = hit(tags, me);
    if (!h.score) continue;
    const n = liveComments(t).length;
    out.push({
      key: `thread:${t.id}`, kind: 'thread', where: `${projectLabel(projectOf(t))} · ${zoneLabel(t.zone)}`, title: t.title,
      because: why(h, `open ${t.type}, ${n} comment${n === 1 ? '' : 's'}`), to: { path: zonePath(t.zone), query: { thread: t.id } }, score: h.score + 0.5,
    });
  }
  for (const [zone, tags] of Object.entries(ZONE_TAGS)) {
    if (zonesWithThreads.has(zone) || !projectOfZone(zone)) continue;
    const h = hit(tags, me);
    if (h.score < 3) continue;
    out.push({
      key: `zone:${zone}`, kind: 'zone', where: `${projectLabel(projectOfZone(zone))} · ${zoneLabel(zone)}`,
      title: `${zoneLabel(zone)}: no open threads yet. Start one.`, because: why(h), to: zonePath(zone), score: h.score - 1,
    });
  }
  out.sort((a, b) => b.score - a.score);
  // A mix: the best of each kind first, then the rest by score, with at most
  // two from any one zone, so one busy zone doesn't fill the list.
  const picked: MatchItem[] = [];
  const count = { guide: 0, thread: 0, zone: 0 };
  const cap = { guide: 2, thread: 3, zone: 2 };
  const perZone = new Map<string, number>();
  const zoneOfItem = (m: MatchItem) => (m.kind === 'guide' ? 'guide' : m.where);
  const take = (m: MatchItem) => {
    if (picked.length >= max || picked.includes(m) || count[m.kind] >= cap[m.kind] || (perZone.get(zoneOfItem(m)) ?? 0) >= 2) return;
    count[m.kind]++;
    perZone.set(zoneOfItem(m), (perZone.get(zoneOfItem(m)) ?? 0) + 1);
    picked.push(m);
  };
  const firsts = (['guide', 'thread', 'zone'] as const).map((k) => out.find((m) => m.kind === k)).filter((m): m is MatchItem => !!m);
  for (const m of firsts.sort((a, b) => b.score - a.score)) take(m);
  for (const m of out) take(m);
  return picked.sort((a, b) => b.score - a.score);
}

/** What the matches came from: "Electrical, Power, Assembly and your spot welder". */
export function matchedFrom(me: Interests) {
  const parts = [...me.can.slice(0, 3), ...toolWords(me.tools.slice(0, 1))];
  return parts.length ? `from ${listing(parts)}` : me.lanes.length ? 'from what you want to work on' : '';
}
