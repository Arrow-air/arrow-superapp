<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ModelViewer, { type ModelMeta } from './ModelViewer.vue';
import StatusIcon from '../threads/StatusIcon.vue';
import { state, statusOf } from '../threads/store';
import type { Thread } from '../threads/data';
import { groupNames, parseSelKey, provenance, selKey, selLabel, subsystemGroups, touches, type Sel } from './model';

// The model with a panel beside it. On a subsystem page its groups are lit and
// the rest ghosted; on the whole-aircraft page everything is lit and the panel
// carries the layer switches. The selection lives in the URL (?part=…), and
// picking a part also opens its first thread in the list below (?thread=…).

const props = defineProps<{ subsystem?: string; label: string }>();
const route = useRoute();
const router = useRouter();

const lit = computed(() => (props.subsystem ? subsystemGroups[props.subsystem] ?? [] : null));
const meta = ref<ModelMeta>();
const groups = computed(() => (meta.value?.groups ?? []).filter((g) => !lit.value || lit.value.includes(g.id)));
const solids = computed(() => groups.value.reduce((s, g) => s + g.solids, 0));

const anchored = computed(() => state.threads.filter((t): t is Thread & { part: Sel } => !!t.part && (!lit.value || lit.value.includes(t.part.group))));
const discussed = computed(() => anchored.value.filter((t) => statusOf(t) !== 'settled').map((t) => t.part));

// The part picked on the model, else the part of the thread open in the list.
const selection = computed<Sel | null>(() => {
  const picked = parseSelKey(route.query.part);
  if (picked) return picked;
  const t = route.query.thread && anchored.value.find((x) => x.id === route.query.thread);
  return t ? t.part : null;
});
const about = computed(() => (selection.value ? anchored.value.filter((t) => touches(t.part, selection.value!)) : []));

function pick(sel: Sel | null) {
  const query = { ...route.query };
  delete query.part;
  delete query.thread;
  if (sel) {
    query.part = selKey(sel);
    const first = anchored.value.find((t) => touches(t.part, sel));
    if (first && first.page === pagePath.value) query.thread = first.id;
  }
  router.replace({ query });
}
const pagePath = computed(() => `${route.params.tab}/${route.params.item}`);
/** Open a thread: in the list below when it lives on this page, else on its own page. */
function open(t: Thread & { part: Sel }) {
  if (t.page === pagePath.value || !t.page) router.replace({ query: { ...route.query, part: selKey(t.part), thread: t.id } });
  else router.push({ path: `/${route.params.project}/${t.page}`, query: { part: selKey(t.part), thread: t.id } });
}

// Layer switches (whole aircraft only).
const hidden = ref<string[]>([]);
const toggle = (id: string) => (hidden.value = hidden.value.includes(id) ? hidden.value.filter((h) => h !== id) : [...hidden.value, id]);
const solo = (id: string) => (hidden.value = (meta.value?.groups ?? []).map((g) => g.id).filter((g) => g !== id));

const provNote = (group: string) =>
  ({ mirrored: 'Mirrored from the port side; not modelled in Fusion.', recovered: 'Recovered from bodies hidden in the Fusion file.', modelled: '' })[provenance(group)];
const dot = (group: string) => `var(--prov-${provenance(group)})`;
</script>

<template>
  <div class="stage">
    <ModelViewer class="view" :lit="lit" :hidden="hidden" :selection="selection" :discussed="discussed" @pick="pick" @ready="meta = $event" />

    <aside class="panel" aria-label="Model">
      <template v-if="selection">
        <button type="button" class="back" @click="pick(null)">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>{{ label }}
        </button>
        <h3 class="title">{{ selLabel(selection) }}</h3>
        <p v-if="provNote(selection.group)" class="muted">{{ provNote(selection.group) }}</p>
        <h4 class="head">Threads about this</h4>
        <p v-if="!about.length" class="muted">None yet.</p>
        <button v-for="t in about" :key="t.id" type="button" class="row" :aria-current="route.query.thread === t.id ? 'true' : undefined" @click="open(t)">
          <StatusIcon :status="statusOf(t)" :override="t.settled?.override" :size="13" />
          <span class="rtitle">{{ t.title }}</span>
        </button>
      </template>

      <template v-else>
        <p class="kicker">Spearhead · Fusion snapshot {{ meta?.snapshot ?? '' }}</p>
        <h3 class="title">{{ label }}</h3>
        <template v-if="lit && !lit.length">
          <p class="muted">The model covers the structure only, so {{ label.toLowerCase() }} has no geometry yet. The aircraft is shown for reference.</p>
        </template>
        <template v-else>
          <p class="muted">{{ solids }} solids<template v-if="!lit">, {{ meta?.span_m }} m span</template>. Click a part to see its threads.</p>

          <h4 class="head">{{ lit ? 'Parts of this subsystem' : 'Layers' }}</h4>
          <div v-for="g in groups" :key="g.id" class="layer">
            <label v-if="!lit" class="check">
              <input type="checkbox" :checked="!hidden.includes(g.id)" @change="toggle(g.id)" />
            </label>
            <button type="button" class="lname" @click="pick({ group: g.id })">
              <i :style="{ background: dot(g.id) }"></i>{{ groupNames[g.id] ?? g.id }}
            </button>
            <span class="count">{{ g.solids }}</span>
            <button v-if="!lit" type="button" class="solo" @click="solo(g.id)">Solo</button>
          </div>
          <button v-if="!lit && hidden.length" type="button" class="link" @click="hidden = []">Show all</button>

          <h4 class="head">Parts under discussion · {{ anchored.length }}</h4>
          <p v-if="!anchored.length" class="muted">No threads are attached to parts here yet.</p>
          <button v-for="t in anchored" :key="t.id" type="button" class="row" @click="open(t)">
            <StatusIcon :status="statusOf(t)" :override="t.settled?.override" :size="13" />
            <span class="rbody">
              <span class="rtitle">{{ t.title }}</span>
              <span class="rsub">{{ selLabel(t.part) }}</span>
            </span>
          </button>
        </template>
      </template>

      <p class="source">
        Model from <a href="https://github.com/Arrow-air/project-spearhead/tree/hex/build123d-fusion-aircraft/src/design" target="_blank" rel="noopener">project-spearhead</a>, revision {{ meta?.revision ?? '' }}. A tessellated preview; the STEP files are exact.
      </p>
    </aside>
  </div>
</template>

<style scoped>
.stage {
  --prov-modelled: var(--slate-11);
  --prov-mirrored: var(--sky-11);
  --prov-recovered: var(--jade-11);
  display: grid; grid-template-columns: minmax(0, 1fr) 300px; height: 100%; min-height: 0;
}
.view { min-width: 0; }

.panel {
  display: flex; flex-direction: column; min-height: 0; overflow-y: auto; padding: 16px 12px 12px;
  border-left: 1px solid var(--border-soft); background: var(--slot-bg); scrollbar-width: thin;
}
.kicker { margin: 0 4px 4px; font-size: var(--text-sm); color: var(--fg-faint); }
.title { margin: 0 4px 6px; font-size: var(--text-md); font-weight: 600; color: var(--fg); line-height: 1.35; }
.muted { margin: 0 4px 4px; font-size: var(--text-base); line-height: 1.5; color: var(--fg-muted); }
.head { margin: 18px 4px 6px; font-size: var(--text-sm); font-weight: 500; color: var(--fg-faint); }

.back {
  display: inline-flex; align-items: center; gap: 4px; align-self: flex-start; margin: 0 0 10px; padding: 3px 6px 3px 2px;
  border: 0; border-radius: 6px; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); cursor: pointer;
}
.back:hover { color: var(--fg-2); background: var(--slate-a2); }
.back svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }

.layer { display: flex; align-items: center; gap: 6px; padding: 0 4px 0 0; border-radius: 8px; }
.layer:hover { background: var(--slate-a2); }
.check { display: grid; place-items: center; padding-left: 6px; }
.check input { margin: 0; accent-color: var(--indigo-9); }
.lname {
  flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; padding: 6px; border: 0; background: none;
  color: var(--fg-2); font: inherit; font-size: var(--text-nav); text-align: left; cursor: pointer;
}
.lname i, .legend i { flex: none; width: 7px; height: 7px; border-radius: 50%; }
.count { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--fg-faint); }
.solo, .link { border: 0; background: none; color: var(--fg-faint); font: inherit; font-size: var(--text-sm); cursor: pointer; padding: 2px 4px; }
.solo { opacity: 0; }
.layer:hover .solo, .solo:focus-visible { opacity: 1; }
.solo:hover, .link:hover { color: var(--fg-2); }
.link { align-self: flex-start; margin: 4px 0 0 2px; }

.row {
  display: flex; align-items: flex-start; gap: 10px; width: 100%; padding: 8px 10px;
  border: 0; border-radius: 8px; background: none; text-align: left; color: inherit; font: inherit; cursor: pointer;
  transition: background-color 120ms;
}
.row:hover { background: var(--slate-a2); }
.row[aria-current='true'] { background: var(--slate-a3); }
.row :deep(.st) { flex: none; margin-top: 3px; }
.rbody { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.rtitle { color: var(--fg-2); font-size: var(--text-nav); line-height: 1.45; }
.rsub { font-size: var(--text-sm); color: var(--fg-faint); }

.source { margin: auto 4px 0; padding-top: 20px; font-size: var(--text-sm); line-height: 1.5; color: var(--fg-faint); }
.source a { color: var(--fg-muted); }

@media (max-width: 899px) {
  .stage { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(280px, 1fr) auto; }
  .panel { border-left: 0; border-top: 1px solid var(--border-soft); }
}
</style>
