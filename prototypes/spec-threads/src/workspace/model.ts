// The Spearhead aircraft model: where it lives, how its parts are named, and how discussions attach.
import type { ModelAnchor, Thread } from '../lib/types';

export const MODEL_URL = 'models/spearhead/spearhead-v2.glb';
export const MODEL_META_URL = 'models/spearhead/model.json';
/** File and geometry revision; stored on every anchor. */
export const MODEL_ID = 'spearhead-v2@center-ribs-rear-gear-v2';

export const groupNames: Record<string, string> = {
  fuselage: 'Fuselage',
  main_wing: 'Main wing',
  tail: 'V-tail',
  motor_mounts_and_booms: 'Booms & motor mounts',
  landing_gear: 'Front landing gear',
  inferred_starboard_outer_wing: 'Starboard outer wing (mirrored)',
  restored_hidden_port_aft_motor_mount: 'Fourth motor mount (recovered)',
  restored_center_wing_ribs: 'Center-wing ribs (recovered)',
  restored_rear_landing_gear: 'Rear landing gear (recovered)',
};
export const groupColors: Record<string, string> = {
  fuselage: '#cead76', main_wing: '#d8c49b', tail: '#cfb27e', motor_mounts_and_booms: '#657986', landing_gear: '#ad987b',
  inferred_starboard_outer_wing: '#87b4cf', restored_hidden_port_aft_motor_mount: '#75c3ba', restored_center_wing_ribs: '#75c3ba', restored_rear_landing_gear: '#75c3ba',
};
/** Every part of the model is airframe structure; discussions started from it default there. */
export const groupSystem = (_group: string) => 'airframe';

/** "fuselage:1+fuselage_body:1+bulkheads:1" → "Bulkheads"; "root" of the main wing is the wing itself. */
export function componentName(component?: string) {
  if (!component || component === 'root') return '';
  const last = component.split('+').at(-1)!.replace(/:\d+$/, '').replace(/_/g, ' ');
  return last.charAt(0).toUpperCase() + last.slice(1);
}
export const partName = (part?: string) => (part ?? '').replace(/_mirrored_inferred$/, ' (mirrored)');

export function anchorLabel(a: Pick<ModelAnchor, 'group' | 'component' | 'part'>) {
  return [groupNames[a.group] ?? a.group, componentName(a.component), partName(a.part)].filter(Boolean).join(' › ');
}
export const anchorKey = (a: Pick<ModelAnchor, 'group' | 'component' | 'part'>) => [a.group, a.component ?? '', a.part ?? ''].join('/');
export function parseAnchorKey(key: string): Pick<ModelAnchor, 'group' | 'component' | 'part'> | undefined {
  const [group, component, part] = key.split('/');
  return group ? { group, component: component || undefined, part: part || undefined } : undefined;
}

/** Discussions about a selection: the part itself, its component, or its whole subsystem. */
export function threadsAbout(threads: Thread[], sel: Pick<ModelAnchor, 'group' | 'component' | 'part'>) {
  return threads.filter((t) => {
    const a = t.anchor;
    if (!a || a.group !== sel.group) return false;
    if (!a.component) return true;
    if (a.component !== sel.component) return false;
    return !a.part || a.part === sel.part;
  });
}
