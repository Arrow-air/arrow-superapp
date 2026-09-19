<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import AircraftViewer from '../components/AircraftViewer.vue';
import Pretend from '../components/Pretend.vue';
import { q, partById, groupOf, repoFile, usd } from '../data/quiver';
import { decisions, state, me } from '../data/pretend';

const props = defineProps<{ id?: string }>();
const router = useRouter();
const explode = ref(0);
const hidden = ref<string[]>([]);
const inModel = ref<string[]>([]);
const draft = ref('');
const viewer = ref<InstanceType<typeof AircraftViewer>>();

const part = computed(() => (props.id ? partById.get(props.id) ?? null : null));
const select = (id: string | null) => router.replace(id ? `/aircraft/${id}` : '/aircraft');
const tasksFor = (id: string) => q.tasks.filter((t) => t.parts.includes(id));
const issuesFor = (id: string) => q.issues.filter((i) => i.parts.includes(id)).sort((a, b) => (a.state === b.state ? b.number - a.number : a.state === 'OPEN' ? -1 : 1));
const decisionsFor = (id: string) => decisions.filter((d) => d.parts.includes(id));
const pinsFor = (id: string) => state.pins.filter((p) => p.anchor === 'part:' + id);
const busy = (id: string) => tasksFor(id).some((t) => t.state === 'OPEN') || decisionsFor(id).length > 0;
const marked = computed(() => (props.id ? [] : [...partById.keys()].filter(busy)));
const toggle = (c: string) => (hidden.value = hidden.value.includes(c) ? hidden.value.filter((x) => x !== c) : [...hidden.value, c]);
function post() {
  if (!draft.value.trim() || !props.id) return;
  state.pins.push({ anchor: 'part:' + props.id, text: draft.value.trim(), persona: me().label });
  draft.value = '';
}
</script>

<template>
  <div class="spread">
    <div><h1>Aircraft</h1><p class="lede">The real assembly, exported from the repo's CAD code. Click a part. Its BOM number is the anchor that everything else hangs on.</p></div>
  </div>
  <div class="air">
    <aside class="tree">
      <details v-for="g in q.bom" :key="g.category" :open="g.category !== '4000'">
        <summary><span>{{ g.category }} {{ g.name }}</span><span>{{ g.items.length }}</span></summary>
        <button v-for="p in g.items" :key="p.id" class="part" :class="{ on: p.id === id, nomodel: inModel.length && !inModel.includes(p.id) }" @click="select(p.id)">
          <span class="mono">{{ p.id }}</span><span style="flex:1">{{ p.name }}</span><span v-if="busy(p.id)" class="dot" title="Open work or an open decision touches this part" />
        </button>
      </details>
    </aside>

    <div class="stage">
      <div class="viewbar">
        <label>Explode <input type="range" min="0" max="0.9" step="0.01" v-model.number="explode" /></label>
        <label v-for="g in q.bom.slice(0, 3)" :key="g.category"><input type="checkbox" :checked="!hidden.includes(g.category[0])" @change="toggle(g.category[0])" /> {{ g.name }}</label>
        <button class="link-btn" @click="select(null); viewer?.reset()">Reset view</button>
      </div>
      <AircraftViewer ref="viewer" :selected="id ?? null" :explode="explode" :hidden="hidden" :marked="marked" @select="select" @ready="inModel = $event" />
    </div>

    <aside class="panel">
      <template v-if="part">
        <span class="label">{{ groupOf(part.id)?.name }}</span>
        <h2 style="margin-top:4px"><span class="mono">{{ part.id }}</span> {{ part.name }}</h2>
        <dl class="kv">
          <dt>Quantity</dt><dd>{{ part.qty }}</dd>
          <template v-if="part.sourcing"><dt>Sourcing</dt><dd>{{ part.sourcing }}</dd></template>
          <template v-if="part.material"><dt>Material</dt><dd>{{ part.material }}<span v-if="part.spec">, {{ part.spec }}</span></dd></template>
          <dt>Unit cost</dt><dd>{{ part.unitCostUsd != null ? '$' + part.unitCostUsd.toFixed(2) : 'not in the BOM' }}</dd>
          <template v-if="part.suppliers.length"><dt>Supplier</dt><dd><template v-for="(s, i) in part.suppliers" :key="i"><a v-if="s.url" :href="s.url" target="_blank" rel="noopener">{{ s.name }}</a><span v-else>{{ s.name }}</span><span v-if="s.partNumber" class="muted"> {{ s.partNumber }}</span><br /></template></dd></template>
          <template v-if="part.designRef"><dt>Design file</dt><dd><a :href="repoFile(part.designRef)" target="_blank" rel="noopener">{{ part.designRef.split('/').filter(Boolean).pop() }} ↗</a></dd></template>
        </dl>
        <p v-if="part.notes" class="small muted" style="margin-top:10px">{{ part.notes }}</p>
        <p v-if="inModel.length && !inModel.includes(part.id)" class="small muted">Not in the 3D assembly yet.</p>

        <h4>Decisions that touch it</h4>
        <RouterLink v-for="d in decisionsFor(part.id)" :key="d.id" :to="`/decisions/${d.id}`" class="mini"><span class="chip chip-warn">open</span> {{ d.title }}</RouterLink>
        <p v-if="!decisionsFor(part.id).length" class="small muted">None open. Why this part is the way it is has not been written down yet. That is task T-09.</p>

        <h4>Work <span class="chip" title="No issue names a BOM number today, so the demo links by keyword. With the app, the link would be made once, on purpose.">linked by keyword</span></h4>
        <RouterLink v-for="t in tasksFor(part.id)" :key="t.id" :to="`/work/${t.id}`" class="mini"><span class="mono muted">{{ t.id }}</span> {{ t.title }}</RouterLink>
        <a v-for="i in issuesFor(part.id).slice(0, 5)" :key="i.number" :href="i.url" target="_blank" rel="noopener" class="mini"><span class="mono muted">#{{ i.number }}</span> {{ i.title }} <span class="muted">· {{ i.state.toLowerCase() }}</span></a>
        <p v-if="!tasksFor(part.id).length && !issuesFor(part.id).length" class="small muted">Nothing mentions this part.</p>

        <h4>Threads on this part <Pretend /></h4>
        <div v-for="(p, i) in pinsFor(part.id)" :key="i" class="pin"><span class="label">{{ p.persona }}</span><br />{{ p.text }}</div>
        <textarea v-model="draft" rows="2" style="margin-top:8px" :placeholder="`Say something about ${part.id}. It stays attached to the part.`" />
        <button class="btn" style="margin-top:6px" :disabled="!draft.trim()" @click="post">Start a thread here</button>
      </template>
      <template v-else>
        <h2>Pick a part</h2>
        <p class="small muted">Click the model or the list. Parts marked in orange have open work or an open decision on them.</p>
        <h4>Where the activity is</h4>
        <button v-for="pid in marked" :key="pid" class="mini link-btn" style="display:block;text-align:left;text-decoration:none;width:100%" @click="select(pid)"><span class="mono muted">{{ pid }}</span> {{ partById.get(pid)?.name }}</button>
      </template>
    </aside>
  </div>
</template>
