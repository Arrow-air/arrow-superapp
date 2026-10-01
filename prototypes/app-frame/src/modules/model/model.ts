// The Spearhead model: where it lives, how its parts are named, which
// subsystem each part belongs to, and how threads attach to parts.
// Ported from spec-threads (src/workspace/model.ts); the model file is the same.

export const MODEL_URL = 'models/spearhead/spearhead-v2.glb';
export const MODEL_META_URL = 'models/spearhead/model.json';

/** A place on the model: a whole group, one component in it, or one solid. */
export interface Sel { group: string; component?: string; part?: string }

export const groupNames: Record<string, string> = {
  fuselage: 'Fuselage',
  main_wing: 'Main wing',
  tail: 'V-tail',
  motor_mounts_and_booms: 'Booms & motor mounts',
  landing_gear: 'Front landing gear',
  inferred_starboard_outer_wing: 'Starboard outer wing',
  restored_hidden_port_aft_motor_mount: 'Fourth motor mount',
  restored_center_wing_ribs: 'Center-wing ribs',
  restored_rear_landing_gear: 'Rear landing gear',
};

/** Where a group came from: modelled in Fusion, mirrored, or recovered from hidden bodies. */
export const provenance = (group: string): 'modelled' | 'mirrored' | 'recovered' =>
  group.startsWith('inferred_') ? 'mirrored' : group.startsWith('restored_') ? 'recovered' : 'modelled';

/** The components in each group, as the model file names them. Groups with none are loose solids. */
export const groupComponents: Record<string, { id: string; parts: number }[]> = {
  fuselage: [
    { id: 'fuselage:1+fuselage_body:1+bulkheads:1', parts: 4 },
    { id: 'fuselage:1+fuselage_body:1+longerons:1', parts: 13 },
    { id: 'fuselage:1+fuselage_body:1+mid_box:1', parts: 4 },
    { id: 'fuselage:1+fuselage_body:1+connectors:1', parts: 92 },
  ],
  main_wing: [{ id: 'root', parts: 61 }],
  tail: [
    { id: 'tail:1+ribs:1', parts: 25 },
    { id: 'tail:1+spar:1', parts: 2 },
    { id: 'tail:1+connector:1', parts: 24 },
    { id: 'tail_connector:1', parts: 4 },
  ],
  motor_mounts_and_booms: [
    { id: 'motor_mounts:1', parts: 9 },
    { id: 'longitudinal_spars:1', parts: 2 },
  ],
  landing_gear: [{ id: 'fuselage:1+landing_gear:1', parts: 11 }],
};

/**
 * Design subsystems (sidebar items) and the model groups that make them up.
 * The model is structure only, so power, avionics, wiring and the payload bay
 * have no geometry yet; their pages show the whole aircraft dimmed.
 */
export const subsystemGroups: Record<string, string[]> = {
  airframe: ['fuselage', 'landing_gear', 'restored_rear_landing_gear'],
  'wings-tail': ['main_wing', 'inferred_starboard_outer_wing', 'restored_center_wing_ribs', 'tail'],
  propulsion: ['motor_mounts_and_booms', 'restored_hidden_port_aft_motor_mount'],
  power: [],
  avionics: [],
  wiring: [],
  payload: [],
};
export const subsystemOf = (group: string) =>
  Object.keys(subsystemGroups).find((s) => subsystemGroups[s].includes(group)) ?? 'airframe';

/** "fuselage:1+fuselage_body:1+bulkheads:1" → "Bulkheads"; the main wing's "root" is the wing itself. */
export function componentName(component?: string) {
  if (!component || component === 'root') return '';
  const last = component.split('+').at(-1)!.replace(/:\d+$/, '').replace(/_/g, ' ');
  return last.charAt(0).toUpperCase() + last.slice(1);
}
/** "sta2" → "STA2", "floor_support_left" → "Floor support left", "Body97_mirrored_inferred" → "Body97". */
export function partName(part?: string) {
  if (!part) return '';
  const p = part.replace(/_mirrored_inferred$/, '');
  if (/^sta\d+$/i.test(p)) return p.toUpperCase();
  const s = p.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export const selLabel = (s: Sel) => [groupNames[s.group] ?? s.group, componentName(s.component), partName(s.part)].filter(Boolean).join(' › ');

export const selKey = (s: Sel) => [s.group, s.component ?? '', s.part ?? ''].join('/');
export function parseSelKey(key: unknown): Sel | undefined {
  if (typeof key !== 'string' || !key) return undefined;
  const [group, component, part] = key.split('/');
  return group ? { group, component: component || undefined, part: part || undefined } : undefined;
}

/** Is `inner` the same place as `outer`, or inside it? */
export function within(inner: Sel, outer: Sel) {
  if (inner.group !== outer.group) return false;
  if (outer.component && inner.component !== outer.component) return false;
  return !outer.part || inner.part === outer.part;
}
/** A thread about `about` is relevant to `sel` when either contains the other (part ⊂ component ⊂ group). */
export const touches = (about: Sel, sel: Sel) => within(about, sel) || within(sel, about);
