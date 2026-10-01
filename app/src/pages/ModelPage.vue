<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import QuiverModel from '../modules/model/QuiverModel.vue';
import ThreadRows from '../modules/threads/ThreadRows.vue';
import { NEXT } from '../modules/threads/data';
import { V11_ZONES, isOpen, startThread, state, threadsOnPart } from '../modules/threads/store';
import { bom, partById } from '../data/quiver';
import { zoneForPart } from '../data/model';
import { zoneLabel, zonePath } from '../frame/nav';

// Click a part of the Dev Kit, see what's being discussed about it, and
// propose a change to it for v1.1. The part is the anchor: the thread lands
// in the zone that part belongs to, and the model highlights parts with open
// threads.
const route = useRoute();
const router = useRouter();
const viewer = ref<InstanceType<typeof QuiverModel>>();

const selected = computed(() => (route.query.part as string | undefined) ?? null);
const select = (id: string | null) => {
  const { part: _drop, ...rest } = route.query;
  router.replace({ query: id ? { ...rest, part: id } : rest });
};
const inModel = ref<string[]>([]);
const explode = ref(0);

const labels = computed(() => Object.fromEntries(bom.flatMap((g) => g.items.map((i) => [i.id, i.name]))));
const part = computed(() => (selected.value ? partById(selected.value) : undefined));
const threads = computed(() => (selected.value ? threadsOnPart(selected.value) : []));
const openOn = (id: string) => state.threads.filter((t) => t.part === id && isOpen(t)).length;
const marked = computed(() => inModel.value.filter((id) => openOn(id) > 0));

// The parts list, grouped by the zone a change would be discussed in.
const groups = computed(() => {
  const order = [...V11_ZONES, 'interface'];
  const byZone = new Map<string, string[]>();
  for (const id of inModel.value) {
    const z = zoneForPart(id);
    byZone.set(z, [...(byZone.get(z) ?? []), id]);
  }
  return order.filter((z) => byZone.has(z)).map((z) => ({ zone: z, parts: byZone.get(z)!.sort() }));
});
const openGroup = ref<string | null>(null);

const composing = ref(false);
const draft = ref({ title: '', body: '' });
watch(selected, () => { composing.value = false; draft.value = { title: '', body: '' }; });
async function propose() {
  if (!selected.value || !draft.value.title.trim()) return;
  const t = await startThread({
    zone: zoneForPart(selected.value),
    part: selected.value,
    title: draft.value.title.trim(),
    body: draft.value.body.trim(),
    type: 'proposal',
    version: NEXT,
  });
  composing.value = false;
  draft.value = { title: '', body: '' };
  if (t) router.replace({ query: { ...route.query, thread: t.id } });
}
const money = (n: number | null) => (n == null ? null : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
</script>

<template>
  <div class="mp">
    <aside class="side">
      <template v-if="part && selected">
        <button class="back" type="button" @click="select(null); viewer?.reset()">← All parts</button>
        <div class="p-id mono">{{ selected }}</div>
        <h1 class="p-name">{{ part.name }}</h1>
        <dl class="facts">
          <template v-if="part.qty > 1"><dt>Qty</dt><dd>{{ part.qty }} on the aircraft</dd></template>
          <template v-if="part.material || part.spec"><dt>Material</dt><dd>{{ part.material ?? part.spec }}</dd></template>
          <template v-if="money(part.unitCostUsd)"><dt>Unit cost</dt><dd>{{ money(part.unitCostUsd) }}</dd></template>
          <template v-if="part.suppliers.length"><dt>Supplier</dt><dd>{{ part.suppliers.map((s) => s.name).join(', ') }}</dd></template>
          <dt>Discussed in</dt><dd><RouterLink :to="zonePath(zoneForPart(selected))">{{ zoneLabel(zoneForPart(selected)) }}</RouterLink></dd>
        </dl>

        <button v-if="!composing" class="propose" type="button" @click="composing = true">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg> Propose a change for {{ NEXT }}
        </button>
        <form v-else class="form" @submit.prevent="propose">
          <input v-model="draft.title" class="f-title" :placeholder="`What should change about the ${part.name.split(',')[0].toLowerCase()}?`" aria-label="Proposed change" autofocus />
          <textarea v-model="draft.body" rows="3" placeholder="Why: what it fixes, what it costs, what else it touches" aria-label="Why"></textarea>
          <div class="f-bar">
            <button class="ghost" type="button" @click="composing = false">Cancel</button>
            <button class="primary" type="submit" :disabled="!draft.title.trim()">Propose</button>
          </div>
        </form>

        <h2 class="h">Threads about this part</h2>
        <div v-if="threads.length" class="list"><ThreadRows :threads="threads" /></div>
        <p v-else class="none">None yet.</p>
      </template>

      <template v-else>
        <h1 class="title">Dev Kit</h1>
        <p class="lede">Click a part to see what's being discussed about it, or to propose a change for {{ NEXT }}. Drag to turn, scroll to zoom.</p>
        <p class="legend"><span class="sw mark"></span> has open threads <span class="sw sel"></span> selected</p>
        <h2 class="h">Parts</h2>
        <div class="groups">
          <section v-for="g in groups" :key="g.zone" class="grp">
            <button class="g-head" type="button" :aria-expanded="openGroup === g.zone" @click="openGroup = openGroup === g.zone ? null : g.zone">
              <svg viewBox="0 0 16 16" aria-hidden="true" :class="{ open: openGroup === g.zone }"><path d="m6 4 4 4-4 4" /></svg>
              {{ zoneLabel(g.zone) }} <span class="n">{{ g.parts.length }}</span>
            </button>
            <ul v-if="openGroup === g.zone" class="parts">
              <li v-for="id in g.parts" :key="id">
                <button class="part" type="button" :data-part="id" @click="select(id)">
                  <span class="mono">{{ id }}</span>
                  <span class="pn">{{ labels[id] }}</span>
                  <span v-if="openOn(id)" class="badge">{{ openOn(id) }}</span>
                </button>
              </li>
            </ul>
          </section>
        </div>
        <p class="src">
          From the <a href="https://github.com/Arrow-air/project-quiver/tree/main/src/quiver" target="_blank" rel="noopener">build123d CAD</a> on project-quiver main; fasteners are left out.
          Fusion changes waiting in <a href="https://github.com/Arrow-air/project-quiver/pull/266" target="_blank" rel="noopener">PR #266</a> appear once it merges.
          <RouterLink to="/quiver/build/bom">Bill of materials</RouterLink>
        </p>
      </template>
    </aside>

    <div class="stage">
      <div class="bar">
        <label>Explode <input v-model.number="explode" type="range" min="0" max="0.9" step="0.01" aria-label="Explode" /></label>
        <button type="button" @click="select(null); viewer?.reset()">Reset view</button>
      </div>
      <QuiverModel ref="viewer" :selected="selected" :explode="explode" :marked="marked" :labels="labels" @select="select" @ready="inModel = $event" />
    </div>
  </div>
</template>

<style scoped>
.mp { display: grid; grid-template-columns: 320px minmax(0, 1fr); height: 100%; min-height: 520px; }
.side { min-height: 0; overflow-y: auto; padding: 20px 18px 32px; border-right: 1px solid var(--slate-a3); scrollbar-width: thin; }
.stage { position: relative; min-height: 0; }
.bar { position: absolute; z-index: 2; top: 12px; right: 12px; display: flex; align-items: center; gap: 12px; padding: 6px 10px; border: 1px solid var(--slate-a4); border-radius: 10px; background: var(--surface); font-size: var(--text-sm); color: var(--fg-muted); }
.bar label { display: inline-flex; align-items: center; gap: 6px; }
.bar input[type='range'] { width: 110px; accent-color: var(--indigo-9); }
.bar button { padding: 0; border: 0; background: none; color: var(--indigo-11); font: inherit; cursor: pointer; }
.bar button:hover { text-decoration: underline; }
.mono { font-family: var(--font-mono); }
.title { margin: 0; font-size: 18px; font-weight: 600; color: var(--fg); }
.lede { margin: 6px 0 0; color: var(--fg-2); font-size: var(--text-base); line-height: 1.55; }
.legend { display: flex; align-items: center; gap: 6px; margin: 10px 0 0; font-size: var(--text-sm); color: var(--fg-muted); }
.sw { width: 10px; height: 10px; border-radius: 3px; }
.sw.mark { background: #e29a2d; }
.sw.sel { margin-left: 8px; background: #3e63dd; }
.h { margin: 22px 0 8px; font-size: var(--text-sm); font-weight: 500; color: var(--fg-faint); }
.grp + .grp { margin-top: 2px; }
.g-head { display: flex; align-items: center; gap: 6px; width: 100%; padding: 6px 4px; border: 0; background: none; color: var(--fg-2); font: inherit; font-size: var(--text-nav); text-align: left; cursor: pointer; border-radius: 6px; }
.g-head:hover { background: var(--slate-a2); color: var(--fg); }
.g-head svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.8; transition: transform 150ms; }
.g-head svg.open { transform: rotate(90deg); }
.n { margin-left: auto; font-size: var(--text-sm); color: var(--fg-faint); }
.parts { margin: 2px 0 6px; padding: 0; list-style: none; }
.part { display: flex; align-items: baseline; gap: 8px; width: 100%; padding: 5px 6px 5px 22px; border: 0; background: none; border-radius: 6px; color: var(--fg-2); font: inherit; font-size: var(--text-base); text-align: left; cursor: pointer; }
.part:hover { background: var(--slate-a2); color: var(--fg); }
.part .mono { flex: none; font-size: var(--text-sm); color: var(--fg-muted); }
.pn { flex: 1; min-width: 0; }
.badge { flex: none; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--amber-a3); color: var(--amber-11); font-size: 11px; line-height: 16px; text-align: center; }
.src { margin: 18px 0 0; font-size: var(--text-sm); color: var(--fg-faint); line-height: 1.6; }
.src a { color: var(--fg-muted); }
.src a:hover { color: var(--fg); }
.back { padding: 0; border: 0; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.back:hover { color: var(--fg); }
.p-id { margin-top: 14px; font-size: var(--text-sm); color: var(--fg-muted); }
.p-name { margin: 2px 0 0; font-size: 17px; font-weight: 600; line-height: 1.35; color: var(--fg); }
.facts { display: grid; grid-template-columns: max-content 1fr; gap: 5px 14px; margin: 12px 0 0; font-size: var(--text-base); }
.facts dt { color: var(--fg-muted); }
.facts dd { margin: 0; color: var(--fg-2); }
.facts a { color: var(--indigo-11); text-decoration: none; }
.facts a:hover { text-decoration: underline; }
.propose { display: inline-flex; align-items: center; gap: 6px; margin-top: 16px; height: 30px; padding: 0 12px; border: 0; border-radius: 8px; background: var(--indigo-9); color: #fff; font: inherit; font-size: var(--text-base); font-weight: 500; cursor: pointer; }
.propose:hover { background: var(--indigo-10); }
.propose svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.form { display: grid; gap: 8px; margin-top: 16px; padding: 10px; border: 1px solid var(--slate-a5); border-radius: 10px; background: var(--slate-a2); }
.form input, .form textarea { width: 100%; border: 0; background: none; color: var(--fg); font: inherit; outline: none; resize: vertical; }
.f-title { font-size: var(--text-nav); font-weight: 500; }
.form textarea { font-size: var(--text-base); color: var(--fg-2); line-height: 1.5; }
.form ::placeholder { color: var(--fg-faint); }
.f-bar { display: flex; justify-content: flex-end; align-items: center; gap: 10px; }
.ghost { padding: 0; border: 0; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.primary { height: 28px; padding: 0 12px; border: 0; border-radius: 7px; background: var(--indigo-9); color: #fff; font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer; }
.primary:disabled { opacity: 0.4; cursor: default; }
.list { border: 1px solid var(--slate-a4); border-radius: 10px; overflow: hidden; }
.none { margin: 0; color: var(--fg-faint); font-size: var(--text-base); }
@media (max-width: 899px) {
  .mp { grid-template-columns: minmax(0, 1fr); grid-template-rows: 52vh auto; height: auto; }
  .stage { order: -1; height: 52vh; }
  .side { border-right: 0; border-top: 1px solid var(--slate-a3); }
}
</style>
