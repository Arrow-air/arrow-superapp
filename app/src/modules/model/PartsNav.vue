<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Thumbs } from './CadModel.vue';

// A model's parts as a drill-down (Gavin's app-frame PartsNav, on the
// project's model): the areas a change would be discussed in, then an area's
// parts, then one part. Each level is a set of tiles showing that piece cut
// out of the model, and going a level deeper slides the panel left (up slides
// it back), so the movement reads as depth. Each level's own content (layers,
// facts, threads) comes in through a slot.

export interface Sel { zone?: string; part?: string }
const props = defineProps<{
  label: string;
  zones: { id: string; label: string; parts: string[] }[];
  thumbs: Thumbs;
  selection: Sel;
  partName: (id: string) => string;
  openCount: (parts: string[]) => number;
}>();
const emit = defineEmits<{ pick: [sel: Sel] }>();

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
// Where we are: 0 the aircraft, 1 an area, 2 a part.
const level = computed(() => (props.selection.part ? 2 : props.selection.zone ? 1 : 0));
const zone = computed(() => props.zones.find((z) => z.id === props.selection.zone));
const levelKey = computed(() => ['root', props.selection.zone ?? '', props.selection.part ?? ''].slice(0, level.value + 1).join('/'));

// Deeper slides forward (left), shallower slides back; a sideways jump fades.
const dir = ref<'fwd' | 'back' | 'fade'>('fwd');
watch([level, levelKey], ([now], [before]) => (dir.value = now > before ? 'fwd' : now < before ? 'back' : 'fade'));

// The path from the aircraft down to where you are; every step but the last is a way back up.
const crumbs = computed(() => {
  const path: { name: string; sel: Sel }[] = [];
  if (!level.value) return path;
  path.push({ name: props.label, sel: {} });
  if (zone.value) path.push({ name: zone.value.label, sel: { zone: zone.value.id } });
  if (props.selection.part) path.push({ name: props.partName(props.selection.part), sel: props.selection });
  return path;
});
const heroKey = computed(() => (level.value === 2 ? props.selection.part! : `zone:${props.selection.zone}`));
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
      <!-- Level 0: the areas -->
      <div v-if="level === 0" key="root" class="level">
        <slot name="root-head" />
        <div class="tiles">
          <button v-for="z in zones" :key="z.id" type="button" class="tile" :data-zone="z.id" @click="emit('pick', { zone: z.id })">
            <span class="art" :class="{ loading: !thumbs[`zone:${z.id}`] }"><img v-if="thumbs[`zone:${z.id}`]" :src="thumbs[`zone:${z.id}`]" alt="" /></span>
            <span v-if="openCount(z.parts)" class="open" :title="plural(openCount(z.parts), 'open thread')">{{ openCount(z.parts) }}</span>
            <span class="name">{{ z.label }}</span>
            <span class="sub">{{ plural(z.parts.length, 'part') }}</span>
            <svg class="go" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
          </button>
        </div>
        <slot name="root" />
      </div>

      <!-- Levels 1 and 2: one area, or one part in it -->
      <div v-else :key="levelKey" class="level">
        <!-- The tile you picked, grown into this level's header. -->
        <div class="hero">
          <span class="art" :class="{ loading: !thumbs[heroKey] }"><img v-if="thumbs[heroKey]" :src="thumbs[heroKey]" alt="" /></span>
          <div>
            <p v-if="level === 2" class="kicker mono">{{ selection.part }}</p>
            <h3 class="title" :class="{ 'p-name': level === 2 }">{{ level === 2 ? partName(selection.part!) : zone?.label }}</h3>
            <p v-if="level === 1" class="meta">{{ plural(zone?.parts.length ?? 0, 'part') }}</p>
            <p v-if="openCount(level === 2 ? [selection.part!] : zone?.parts ?? [])" class="threads">
              <span class="open">{{ openCount(level === 2 ? [selection.part!] : zone?.parts ?? []) }}</span>open {{ openCount(level === 2 ? [selection.part!] : zone?.parts ?? []) === 1 ? 'thread' : 'threads' }}
            </p>
          </div>
        </div>

        <template v-if="level === 1 && zone">
          <h4 class="head">Parts</h4>
          <div class="tiles">
            <button v-for="id in zone.parts" :key="id" type="button" class="tile" :data-part="id" @click="emit('pick', { zone: zone.id, part: id })">
              <span class="art" :class="{ loading: !thumbs[id] }"><img v-if="thumbs[id]" :src="thumbs[id]" alt="" /></span>
              <span v-if="openCount([id])" class="open" :title="plural(openCount([id]), 'open thread')">{{ openCount([id]) }}</span>
              <span class="name">{{ partName(id) }}</span>
              <span class="sub mono">{{ id }}</span>
              <svg class="go" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
            </button>
          </div>
          <slot name="zone" />
        </template>
        <slot v-else name="part" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.nav { flex: none; overflow-x: clip; }
.level { display: flex; flex-direction: column; }
.title { margin: 0 4px 4px; font-size: var(--text-md, 15px); font-weight: 600; color: var(--fg); line-height: 1.35; }
.kicker { margin: 0 4px 2px; font-size: var(--text-sm); color: var(--fg-muted); }
.mono { font-family: var(--font-mono); }
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

/* Tiles: each piece of the aircraft, cut out of the model, on a quiet well. */
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
.art { display: grid; place-items: center; aspect-ratio: 16 / 10; border-radius: 8px; overflow: hidden; background: var(--cad-chip); }
.art img { width: 100%; height: 100%; object-fit: contain; transition: transform 250ms cubic-bezier(0.23, 1, 0.32, 1); }
.tile:hover .art img { transform: scale(1.05); }
.loading { animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.5; } }
.tile .art { grid-row: 1 / 3; }
.hero { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 12px; align-items: center; margin: 0 0 8px; }
.hero .art { border: 1px solid var(--cad-chip-hover); }
.hero .title { margin-bottom: 2px; }
.name { grid-column: 2; align-self: end; min-width: 0; font-size: var(--text-nav); line-height: 1.3; color: var(--fg-2); overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.tile:hover .name { color: var(--fg); }
.sub { grid-column: 2; align-self: start; font-size: var(--text-sm); color: var(--fg-faint); }
.open {
  display: inline-block; min-width: 18px; padding: 1px 5px; border-radius: 5px; background: var(--amber-a3); color: var(--amber-11);
  font-family: var(--font-mono); font-size: var(--text-sm); text-align: center;
}
.tile .open { grid-column: 3; grid-row: 1 / 3; }
.go { grid-column: 4; grid-row: 1 / 3; width: 12px; height: 12px; fill: none; stroke: var(--fg-faint); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; transition: transform 150ms cubic-bezier(0.23, 1, 0.32, 1), stroke 150ms; }
.tile:hover .go { stroke: var(--fg-2); transform: translateX(2px); }
.meta { margin: 0 4px; font-size: var(--text-base); color: var(--fg-muted); }
.threads { display: flex; align-items: center; gap: 6px; margin: 6px 4px 0; font-size: var(--text-base); color: var(--fg-2); }

/* Depth: deeper slides in from the right, shallower from the left. */
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
