<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Structure, Thumbs } from './ModelViewer.vue';
import { componentName, groupNames, partName, provenance, selKey, type Sel } from './model';

// A subsystem's parts as a drill-down: the subsystem's groups, then a group's
// components, then a component's named solids. Each level is a set of tiles
// showing that piece cut out of the model, and going a level deeper slides the
// panel left (up slides it back), so the movement reads as depth.

const props = defineProps<{
  label: string;
  groups: { id: string; solids: number }[];
  structure: Structure;
  thumbs: Thumbs;
  selection: Sel | null;
  openCount: (sel: Sel) => number;
  threadCount: number;
}>();
const emit = defineEmits<{ pick: [sel: Sel | null] }>();

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const named = (component?: string) => !!componentName(component);
/** Solids worth naming: the model's real names, not Fusion's "Body12 (1)" defaults. */
const isNamed = (part: string) => !/^Body\d/.test(part);

// Where we are: 0 subsystem, 1 group, 2 component. A picked solid stays on its
// component's level (as the active chip), or its group's if the component has no name.
const level = computed(() => (!props.selection ? 0 : named(props.selection.component) ? 2 : 1));
const group = computed(() => props.selection?.group ?? '');
const component = computed(() => (level.value === 2 ? props.selection!.component! : ''));
const levelKey = computed(() => ['root', group.value, component.value].slice(0, level.value + 1).join('/'));

// Deeper slides forward (left), shallower slides back; a sideways jump fades.
const dir = ref<'fwd' | 'back' | 'fade'>('fwd');
watch([level, levelKey], ([now], [before]) => (dir.value = now > before ? 'fwd' : now < before ? 'back' : 'fade'));

const groupTiles = computed(() =>
  props.groups.map((g) => {
    const comps = Object.keys(props.structure[g.id] ?? {}).filter(named);
    return {
      sel: { group: g.id } as Sel,
      name: groupNames[g.id] ?? g.id,
      sub: comps.length ? `${plural(comps.length, 'component')}` : plural(g.solids, 'solid'),
      prov: provenance(g.id),
    };
  }),
);
const componentTiles = computed(() =>
  Object.entries(props.structure[group.value] ?? {})
    .filter(([c]) => named(c))
    .map(([c, parts]) => ({ sel: { group: group.value, component: c } as Sel, name: componentName(c), sub: plural(parts.length, 'solid'), prov: provenance(group.value) })),
);
const groupSolids = computed(() => props.groups.find((g) => g.id === group.value)?.solids ?? 0);
const parts = computed(() => (props.structure[group.value]?.[component.value] ?? []));
const namedParts = computed(() => parts.value.filter(isNamed).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
const unnamed = computed(() => parts.value.length - namedParts.value.length);
/** A solid picked on the model that has no tile of its own (e.g. "Body65"). */
const looseSolid = computed(() => {
  const p = props.selection?.part;
  return p && (level.value === 1 || !isNamed(p)) ? partName(p) : '';
});

const provNote = (g: string) =>
  ({ mirrored: 'Mirrored from the port side; not modelled in Fusion.', recovered: 'Recovered from bodies hidden in the Fusion file.', modelled: '' })[provenance(g)];
// The path from the subsystem down to where you are; every step but the last is a way back up.
const crumbs = computed(() => {
  const sel = props.selection;
  if (!sel) return [];
  const path: { name: string; sel: Sel | null }[] = [{ name: props.label, sel: null }, { name: groupNames[sel.group] ?? sel.group, sel: { group: sel.group } }];
  if (named(sel.component)) path.push({ name: componentName(sel.component), sel: { group: sel.group, component: sel.component } });
  if (sel.part) path.push({ name: partName(sel.part), sel });
  return path;
});
const heroKey = computed(() => selKey(level.value === 2 ? { group: group.value, component: component.value } : { group: group.value }));
</script>

<template>
  <div class="nav">
    <!-- Stays put while the levels slide beneath it. -->
    <nav v-if="crumbs.length" class="crumbs" aria-label="Part path">
      <template v-for="(c, i) in crumbs" :key="i">
        <svg v-if="i" class="sep" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
        <button v-if="i < crumbs.length - 1" type="button" class="crumb" :title="c.name" @click="emit('pick', c.sel)">{{ c.name }}</button>
        <span v-else class="crumb here" aria-current="location">{{ c.name }}</span>
      </template>
    </nav>
    <Transition :name="dir" mode="out-in">
      <!-- Level 0: the subsystem's groups -->
      <div v-if="level === 0" key="root" class="level">
        <h3 class="title">{{ label }}</h3>
        <p class="muted">{{ plural(groups.reduce((s, g) => s + g.solids, 0), 'solid') }} in {{ plural(groups.length, 'part') }}.</p>
        <div class="tiles">
          <button v-for="t in groupTiles" :key="t.name" type="button" class="tile" @click="emit('pick', t.sel)">
            <span class="art" :class="{ loading: !thumbs[selKey(t.sel)] }"><img v-if="thumbs[selKey(t.sel)]" :src="thumbs[selKey(t.sel)]" alt="" /></span>
            <span v-if="openCount(t.sel)" class="open" :title="plural(openCount(t.sel), 'open thread')">{{ openCount(t.sel) }}</span>
            <span class="name"><i :class="t.prov"></i>{{ t.name }}</span>
            <span class="sub">{{ t.sub }}</span>
            <svg class="go" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
          </button>
        </div>
      </div>

      <!-- Levels 1 and 2: one group, or one component in it -->
      <div v-else :key="levelKey" class="level">
        <!-- The tile you picked, grown into this level's header. -->
        <div class="hero">
          <span class="art" :class="{ loading: !thumbs[heroKey] }"><img v-if="thumbs[heroKey]" :src="thumbs[heroKey]" alt="" /></span>
          <div>
            <h3 class="title">{{ level === 2 ? componentName(component) : groupNames[group] ?? group }}</h3>
            <!-- One line: size, where it came from (explained in the model note), threads. -->
            <p class="meta">
              {{ level === 2 ? plural(parts.length, 'solid') : plural(groupSolids, 'solid') }}
              <span v-if="provenance(group) !== 'modelled'" class="prov" :class="provenance(group)" :title="provNote(group)">{{ provenance(group) }}</span>
            </p>
            <p v-if="threadCount" class="threads"><span class="open">{{ threadCount }}</span>{{ threadCount === 1 ? 'thread' : 'threads' }} below</p>
          </div>
        </div>
        <p v-if="looseSolid" class="muted">Selected solid: {{ looseSolid }}</p>

        <template v-if="level === 1 && componentTiles.length">
          <h4 class="head">Components</h4>
          <div class="tiles">
            <button v-for="t in componentTiles" :key="t.name" type="button" class="tile" @click="emit('pick', t.sel)">
              <span class="art" :class="{ loading: !thumbs[selKey(t.sel)] }"><img v-if="thumbs[selKey(t.sel)]" :src="thumbs[selKey(t.sel)]" alt="" /></span>
              <span v-if="openCount(t.sel)" class="open" :title="plural(openCount(t.sel), 'open thread')">{{ openCount(t.sel) }}</span>
              <span class="name">{{ t.name }}</span>
              <span class="sub">{{ t.sub }}</span>
              <svg class="go" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
            </button>
          </div>
        </template>

        <template v-if="level === 2 && namedParts.length">
          <h4 class="head">Solids</h4>
          <div class="chips">
            <button
              v-for="p in namedParts"
              :key="p"
              type="button"
              class="chip"
              :aria-pressed="selection?.part === p"
              @click="emit('pick', selection?.part === p ? { group, component } : { group, component, part: p })"
            >
              {{ partName(p) }}<span v-if="openCount({ group, component, part: p })" class="pip"></span>
            </button>
          </div>
          <p v-if="unnamed" class="muted small">and {{ plural(unnamed, 'unnamed solid') }}; click one on the model.</p>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.nav { overflow-x: hidden; }
.level { display: flex; flex-direction: column; }
.title { margin: 0 4px 4px; font-size: var(--text-md); font-weight: 600; color: var(--fg); line-height: 1.35; }
.muted { margin: 0 4px 4px; font-size: var(--text-base); line-height: 1.5; color: var(--fg-muted); }
.muted.small { margin-top: 8px; font-size: var(--text-sm); color: var(--fg-faint); }
.head { margin: 16px 4px 8px; font-size: var(--text-sm); font-weight: 500; color: var(--fg-faint); }

/* Path: ancestors shrink and ellipsize first, so where you are always stays readable. */
.crumbs { display: flex; align-items: center; min-width: 0; margin: -4px 0 10px; }
.crumb {
  flex: 0 1 auto; min-width: 0; padding: 3px 5px; border: 0; border-radius: 6px; background: none;
  color: var(--fg-muted); font: inherit; font-size: var(--text-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
button.crumb { cursor: pointer; transition: color 120ms, background-color 120ms; }
button.crumb:hover { color: var(--fg); background: var(--slate-a3); }
button.crumb:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }
.crumb:first-child { margin-left: -5px; }
.crumb.here { flex: 0 0 auto; max-width: 60%; color: var(--fg); font-weight: 500; }
.sep { flex: none; width: 10px; height: 10px; fill: none; stroke: var(--fg-faint); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }

/* Tiles: each piece of the aircraft, cut out of the model, on a soft light pool. */
.tiles { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
.tile {
  position: relative; display: grid; grid-template-columns: 84px minmax(0, 1fr) auto auto; grid-template-rows: auto auto;
  column-gap: 12px; align-items: center; padding: 5px 12px 5px 5px;
  border: 1px solid var(--slate-a3); border-radius: var(--radius-lg); background: var(--slate-a2);
  color: inherit; font: inherit; text-align: left; cursor: pointer;
  transition: background-color 150ms, border-color 150ms, transform 150ms cubic-bezier(0.23, 1, 0.32, 1);
}
.tile:hover { background: var(--slate-a3); border-color: var(--slate-a5); }
.tile:active { transform: scale(0.98); }
.tile:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }
.art {
  display: grid; place-items: center; aspect-ratio: 16 / 10; border-radius: 8px; overflow: hidden;
  background: radial-gradient(ellipse at 50% 45%, var(--slate-a4), transparent 72%);
}
.art img { width: 100%; height: 100%; object-fit: contain; transition: transform 250ms cubic-bezier(0.23, 1, 0.32, 1); }
.tile:hover .art img { transform: scale(1.05); }
.loading { animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.5; } }
.tile .art { grid-row: 1 / 3; }
.hero { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 12px; align-items: center; margin: 0 0 8px; }
.hero .art { border: 1px solid var(--slate-a3); background-color: var(--slate-a2); }
.hero .title { margin-bottom: 2px; }
.name { grid-column: 2; align-self: end; display: flex; align-items: baseline; gap: 6px; min-width: 0; font-size: var(--text-nav); line-height: 1.3; color: var(--fg-2); }
.name i { transform: translateY(-1px); }
.tile:hover .name { color: var(--fg); }
.sub { grid-column: 2; align-self: start; font-size: var(--text-sm); color: var(--fg-faint); }
.name i { flex: none; width: 6px; height: 6px; border-radius: 50%; background: var(--slate-11); }
.name i.mirrored { background: var(--sky-11); }
.name i.recovered { background: var(--jade-11); }

.open {
  display: inline-block; min-width: 18px; padding: 1px 5px; border-radius: 5px; background: var(--amber-a3); color: var(--amber-11);
  font-family: var(--font-mono); font-size: var(--text-sm); text-align: center;
}
.tile .open { grid-column: 3; grid-row: 1 / 3; }
.go { grid-column: 4; grid-row: 1 / 3; width: 12px; height: 12px; fill: none; stroke: var(--fg-faint); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; transition: transform 150ms cubic-bezier(0.23, 1, 0.32, 1), stroke 150ms; }
.tile:hover .go { stroke: var(--fg-2); transform: translateX(2px); }
.meta { display: flex; align-items: center; gap: 8px; margin: 0; font-size: var(--text-base); color: var(--fg-muted); }
.prov { padding: 1px 6px; border-radius: 5px; font-size: var(--text-sm); cursor: help; }
.prov.mirrored { background: var(--sky-a3); color: var(--sky-11); }
.prov.recovered { background: var(--jade-a3); color: var(--jade-11); }
.threads { display: flex; align-items: center; gap: 6px; margin: 6px 0 0; font-size: var(--text-base); color: var(--fg-2); }

.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border: 1px solid var(--slate-a4); border-radius: 7px;
  background: var(--slate-a2); color: var(--fg-2); font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer;
  transition: background-color 120ms, border-color 120ms, color 120ms;
}
.chip:hover { background: var(--slate-a3); color: var(--fg); }
.chip[aria-pressed='true'] { background: var(--indigo-a3); border-color: var(--indigo-a6); color: var(--indigo-11); }
.pip { width: 6px; height: 6px; border-radius: 50%; background: var(--amber-9); }

/* Depth: deeper slides in from the right, shallower from the left. Enter eases
   out and lingers a touch longer than the exit, so the new level feels placed. */
.fwd-enter-active, .back-enter-active { transition: transform 260ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms ease-out; }
.fwd-leave-active, .back-leave-active { transition: transform 140ms ease-in, opacity 140ms ease-in; }
.fwd-enter-from { transform: translateX(36px); opacity: 0; }
.fwd-leave-to { transform: translateX(-36px); opacity: 0; }
.back-enter-from { transform: translateX(-36px); opacity: 0; }
.back-leave-to { transform: translateX(36px); opacity: 0; }
.fade-enter-active { transition: opacity 180ms ease-out; }
.fade-leave-active { transition: opacity 100ms ease-in; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .fwd-enter-from, .fwd-leave-to, .back-enter-from, .back-leave-to { transform: none; }
}
</style>
