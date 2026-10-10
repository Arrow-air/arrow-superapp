<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CadModel, { type Layer, type Thumbs } from '../modules/model/CadModel.vue';
import PartsNav, { type Sel } from '../modules/model/PartsNav.vue';
import ThreadRows from '../modules/threads/ThreadRows.vue';
import NewThread from '../modules/threads/NewThread.vue';
import type { ThreadType } from '../modules/threads/data';
import { isOpen, openVersion, startThread, state, threadsOnPart } from '../modules/threads/store';
import { useFreeze } from '../frame/freeze';
import { zoneIcon, zoneLabel, zonePath } from '../frame/nav';
import { useWorkspace } from '../frame/useWorkspace';
import { modelFor } from '../projects/models';

// Click a part of the project's assembly (Quiver's Dev Kit, Longshot's pack),
// see what's being discussed about it, and start a thread about it for the
// next version. Gavin's CAD explorer layout from app-frame: the model with an
// inspector that drills down from the areas a change would be discussed in,
// to an area's parts, to one part, with a call to action pinned to its foot.
// The part is the anchor: the thread lands in that part's zone. The selection
// lives in the URL (?zone=…&part=…).
const route = useRoute();
const router = useRouter();
const { project } = useWorkspace();
const m = computed(() => modelFor(project.value?.id));
const NEXT = computed(() => m.value.version);
const zoneForPart = (id: string) => m.value.zoneForPart(id);
const viewer = ref<InstanceType<typeof CadModel>>();

const selected = computed(() => (route.query.part as string | undefined) ?? null);
const sel = computed<Sel>(() => {
  const part = selected.value ?? undefined;
  return { zone: part ? zoneForPart(part) : (route.query.zone as string | undefined), part };
});
function pick(s: Sel | null) {
  const { part: _p, zone: _z, ...rest } = route.query;
  const query: Record<string, any> = { ...rest };
  if (s?.part) query.part = s.part;
  else if (s?.zone) query.zone = s.zone;
  router.replace({ query });
}
const select = (id: string | null) => pick(id ? { part: id } : sel.value.zone && !sel.value.part ? { zone: sel.value.zone } : null);

const inModel = ref<string[]>([]);
const layers = ref<Layer[]>([]);
const explode = ref(0);
const thumbs = reactive<Thumbs>({});
const labels = computed(() => m.value.labels);
const partName = (id: string) => m.value.partName(id) ?? labels.value[id] ?? id;

// The areas, in the order of the next-version page, with the parts of each in the model.
const zones = computed(() => {
  const byZone = new Map<string, string[]>();
  for (const id of inModel.value) byZone.set(zoneForPart(id), [...(byZone.get(zoneForPart(id)) ?? []), id]);
  const order = [...m.value.zoneOrder, ...[...byZone.keys()].filter((z) => !m.value.zoneOrder.includes(z))];
  return order.filter((z) => byZone.has(z)).map((z) => ({ id: z, label: zoneLabel(z), parts: byZone.get(z)!.sort() }));
});
function onReady(ids: string[], l: Layer[]) {
  inModel.value = ids;
  layers.value = l;
  viewer.value?.thumbnails([
    ...zones.value.map((z) => ({ key: `zone:${z.id}`, parts: z.parts })),
    ...zones.value.flatMap((z) => z.parts.map((id) => ({ key: id, parts: [id] }))),
  ], (key, url) => (thumbs[key] = url));
}

const openOn = (id: string) => state.threads.filter((t) => t.part === id && isOpen(t)).length;
const openCount = (ids: string[]) => ids.reduce((n, id) => n + openOn(id), 0);
const discussed = computed(() => inModel.value.filter((id) => openOn(id) > 0));
// An area lights its parts and ghosts the rest; the whole aircraft lights everything.
const lit = computed(() => (sel.value.zone ? zones.value.find((z) => z.id === sel.value.zone)?.parts ?? null : null));
const anchored = computed(() => state.threads.filter((t) => t.part && inModel.value.includes(t.part)));
const zoneThreads = computed(() => anchored.value.filter((t) => lit.value?.includes(t.part!)));
const partThreads = computed(() => (selected.value ? threadsOnPart(selected.value) : []));
const facts = computed(() => (selected.value ? m.value.facts(selected.value) : {}));

// Layer switches (the whole aircraft).
const hidden = ref<string[]>([]);
const toggle = (id: string) => (hidden.value = hidden.value.includes(id) ? hidden.value.filter((h) => h !== id) : [...hidden.value, id]);
const solo = (id: string) => (hidden.value = layers.value.map((l) => l.id).filter((l) => l !== id));

// Starting a thread about the selected part or area, in place of the level below the path.
const freeze = useFreeze();
const composing = ref(false);
const about = ref<'part' | 'zone'>('part');
watch(() => [sel.value.zone, sel.value.part], () => { composing.value = false; about.value = sel.value.part ? 'part' : 'zone'; });
const subject = computed(() => (sel.value.part ? partName(sel.value.part) : sel.value.zone ? zoneLabel(sel.value.zone) : ''));
async function post(d: { type: ThreadType; title: string; body: string; key: string }): Promise<boolean> {
  if (!sel.value.zone) return false;
  const t = await startThread({ zone: sel.value.zone, part: about.value === 'part' ? sel.value.part : undefined, title: d.title, body: d.body, type: d.type, version: NEXT.value, key: d.key });
  if (!t) return false;
  composing.value = false;
  if (t) router.replace({ query: { ...route.query, thread: t.id } });
  return true;
}
</script>

<template>
  <div class="mp">
    <aside class="side" aria-label="Model">
      <NewThread
        v-if="composing && sel.zone"
        v-model:scope="about"
        class="nt"
        :where="zoneLabel(sel.zone)"
        :where-icon="zoneIcon(sel.zone)"
        :scopes="sel.part ? [{ key: 'part', label: partName(sel.part) }, { key: 'zone', label: zoneLabel(sel.zone) }] : undefined"
        type="proposal"
        :version="openVersion()"
        body-hint="Why: what it fixes, what it costs, what else it touches"
        :draft-key="`new:model:${sel.part ?? sel.zone}`"
        :submit="post"
        @cancel="composing = false"
      />
      <PartsNav v-else :label="m.title" :zones="zones" :thumbs="thumbs" :selection="sel" :part-name="partName" :open-count="openCount" @pick="pick">
        <template #root-head>
          <p class="kicker">{{ m.kicker }}</p>
          <h1 class="title">{{ m.title }}</h1>
          <p class="muted">{{ inModel.length }} parts. Pick an area or click a part to see its threads, or start one for {{ NEXT }}.</p>
        </template>
        <template #root>
          <h4 class="head">Layers</h4>
          <div v-for="l in layers" :key="l.id" class="layer">
            <label class="check"><input type="checkbox" :checked="!hidden.includes(l.id)" :aria-label="`Show ${l.label}`" @change="toggle(l.id)" /></label>
            <span class="lname">{{ l.label }}</span>
            <span class="count">{{ l.parts.length }}</span>
            <button type="button" class="solo" @click="solo(l.id)">Solo</button>
          </div>
          <button v-if="hidden.length" type="button" class="link" @click="hidden = []">Show all</button>

          <h4 class="head">Parts under discussion · {{ anchored.filter(isOpen).length }}</h4>
          <div v-if="anchored.filter(isOpen).length" class="list"><ThreadRows :threads="anchored.filter(isOpen)" /></div>
          <p v-else class="muted">No open threads are attached to parts yet.</p>
        </template>
        <template #zone>
          <h4 class="head">Threads about these parts</h4>
          <div v-if="zoneThreads.length" class="list"><ThreadRows :threads="zoneThreads" /></div>
          <p v-else class="muted">None yet.</p>
          <RouterLink class="zlink" :to="zonePath(sel.zone!)">All of {{ zoneLabel(sel.zone!) }}'s discussion</RouterLink>
        </template>
        <template #part>
          <dl v-if="selected" class="facts">
            <template v-if="facts.qty"><dt>Qty</dt><dd>{{ facts.qty }}</dd></template>
            <template v-if="facts.material"><dt>Material</dt><dd>{{ facts.material }}</dd></template>
            <template v-if="facts.cost"><dt>Unit cost</dt><dd>{{ facts.cost }}</dd></template>
            <template v-if="facts.supplier"><dt>Supplier</dt><dd>{{ facts.supplier }}</dd></template>
            <template v-if="facts.makeBuy"><dt>Make or buy</dt><dd>{{ facts.makeBuy }}</dd></template>
            <template v-if="facts.note"><dt>Note</dt><dd>{{ facts.note }}</dd></template>
            <template v-if="facts.source"><dt>Source</dt><dd><a :href="facts.source.url" target="_blank" rel="noopener">{{ facts.source.label }}</a></dd></template>
            <dt>Discussed in</dt><dd><RouterLink :to="zonePath(zoneForPart(selected))">{{ zoneLabel(zoneForPart(selected)) }}</RouterLink></dd>
          </dl>
          <h4 class="head">Threads about this part</h4>
          <div v-if="partThreads.length" class="list"><ThreadRows :threads="partThreads" /></div>
          <p v-else class="muted">None yet.</p>
        </template>
      </PartsNav>

      <!-- The call to action, pinned to the panel's foot; tiles scroll under it. -->
      <div v-if="sel.zone && !composing" class="cta-foot">
        <button type="button" class="cta" @click="composing = true">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3.5h10v7H7l-3 2.5v-2.5H3z" /></svg>
          <span>Start a{{ openVersion() === NEXT ? '' : ` ${openVersion()}` }} thread about <b>{{ subject }}</b></span>
        </button>
        <!-- The window this thread lands in, and how long it stays open. -->
        <p class="window" :data-level="freeze.level.value">
          <template v-if="!freeze.active.value">Opens for {{ NEXT }}</template>
          <template v-else-if="!freeze.frozen.value">Open for {{ NEXT }} until design freeze · <b>{{ freeze.label.value }}</b> left</template>
          <template v-else>{{ NEXT }} design frozen · discussion is open for {{ freeze.next }}</template>
        </p>
      </div>
      <p v-if="!sel.zone" class="src">
        {{ m.source.text }}
        <template v-for="l in m.source.links" :key="l.url"><a :href="l.url" target="_blank" rel="noopener">{{ l.label }}</a> · </template>
        <RouterLink :to="m.bomPath">Bill of materials</RouterLink>
      </p>
    </aside>

    <div class="stage">
      <CadModel
        ref="viewer"
        :look="m.look"
        :lit="lit"
        :hidden="hidden"
        :selected="selected"
        :discussed="discussed"
        :explode="explode"
        :labels="labels"
        @select="select"
        @ready="onReady"
      >
        <template #tools>
          <label class="explode">Explode <input v-model.number="explode" type="range" min="0" max="0.9" step="0.01" aria-label="Explode" /></label>
          <button type="button" class="reset" @click="pick(null); viewer?.reset()">Reset view</button>
        </template>
      </CadModel>
    </div>
  </div>
</template>

<style scoped>
.mp { display: grid; grid-template-columns: 340px minmax(0, 1fr); height: 100%; min-height: 520px; }
.side {
  position: relative; display: flex; flex-direction: column; min-height: 0; overflow-y: auto; padding: 18px 14px 14px;
  /* The inspector takes the viewer's tone, so the two read as one CAD explorer. */
  border-right: 1px solid var(--border-soft, var(--slate-a3)); background: var(--cad-panel); scrollbar-width: thin;
}
.stage { position: relative; min-height: 0; }
.stage > :deep(.viewer) { position: absolute; inset: 0; }
.kicker { margin: 0 4px 4px; font-size: var(--text-sm); color: var(--fg-faint); }
.title { margin: 0 4px 6px; font-size: 18px; font-weight: 600; color: var(--fg); line-height: 1.35; }
.muted { margin: 0 4px 4px; font-size: var(--text-base); line-height: 1.5; color: var(--fg-muted); }
.head { margin: 18px 4px 6px; font-size: var(--text-sm); font-weight: 500; color: var(--fg-faint); }

.layer { display: flex; align-items: center; gap: 6px; padding: 0 4px 0 0; border-radius: 8px; }
.layer:hover { background: var(--slate-a2); }
.check { display: grid; place-items: center; padding-left: 6px; }
.check input { margin: 0; accent-color: var(--indigo-9); }
.lname { flex: 1; min-width: 0; padding: 6px 4px; color: var(--fg-2); font-size: var(--text-nav); }
.count { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--fg-faint); }
.solo, .link { border: 0; background: none; color: var(--fg-faint); font: inherit; font-size: var(--text-sm); cursor: pointer; padding: 2px 4px; }
.solo { opacity: 0; }
.layer:hover .solo, .solo:focus-visible { opacity: 1; }
.solo:hover, .link:hover { color: var(--fg-2); }
.link { align-self: flex-start; margin: 4px 0 0 2px; }
.list { border: 1px solid var(--slate-a4); border-radius: 10px; overflow: hidden; background: var(--slate-a2); }
.zlink { margin: 10px 4px 0; font-size: var(--text-sm); color: var(--indigo-11); text-decoration: none; }
.zlink:hover { text-decoration: underline; }

.facts { display: grid; grid-template-columns: max-content 1fr; gap: 5px 14px; margin: 8px 4px 0; font-size: var(--text-base); }
.facts dt { color: var(--fg-muted); }
.facts dd { margin: 0; color: var(--fg-2); }
.facts a { color: var(--indigo-11); text-decoration: none; }
.facts a:hover { text-decoration: underline; }

/* Pinned to the panel's foot; tiles scroll under it behind a short fade. */
.cta-foot {
  position: sticky; bottom: -14px; flex: none; margin: auto -14px -14px; padding: 28px 14px 14px;
  background: linear-gradient(to bottom, transparent, var(--cad-panel) 40%);
}
.cta {
  display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 36px; padding: 0 12px;
  border: 0; border-radius: 9px; background: var(--indigo-9); color: #fff; font: inherit; font-size: var(--text-base); font-weight: 500; cursor: pointer;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.2), 0 1px 2px rgb(0 0 0 / 0.3);
  transition: background-color 120ms, transform 120ms cubic-bezier(0.23, 1, 0.32, 1);
}
.cta:hover { background: var(--indigo-10); }
.cta:active { transform: scale(0.98); }
.cta:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }
.cta span { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.cta b { font-weight: 600; }
.cta svg { flex: none; width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linejoin: round; }
.window { margin: 8px 0 0; text-align: center; font-size: var(--text-sm); color: var(--fg-muted); font-variant-numeric: tabular-nums; }
.window b { font-weight: 600; color: var(--fg-2); }
.window[data-level='soon'] b { color: var(--amber-11); }
.window[data-level='urgent'] b, .window[data-level='frozen'] { color: var(--red-11); }
.src { margin: 18px 4px 0; font-size: var(--text-sm); color: var(--fg-faint); line-height: 1.6; }
.src a { color: var(--fg-muted); }
.src a:hover { color: var(--fg); }

.explode, .reset {
  display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 0; border-radius: 8px;
  background: var(--cad-chip); backdrop-filter: blur(8px); color: var(--fg-2); font: inherit; font-size: var(--text-sm); font-weight: 500;
}
.explode input { width: 90px; accent-color: var(--indigo-9); }
.reset { margin-left: auto; cursor: pointer; }
.reset:hover { color: var(--fg); background: var(--cad-chip-hover); }
@media (max-width: 899px) {
  .mp { grid-template-columns: minmax(0, 1fr); grid-template-rows: 52vh auto; height: auto; }
  .stage { order: -1; height: 52vh; }
  .side { border-right: 0; border-top: 1px solid var(--slate-a3); }
}
</style>
