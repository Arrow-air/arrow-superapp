<script setup lang="ts">
import { computed, ref } from 'vue';
import { specDraft, personas, me } from '../data/pretend';
import Pretend from '../components/Pretend.vue';

const blocks = ref(specDraft.blocks.map((b) => ({ ...b })));
const draft = ref(''); const kind = ref<'text' | 'amendment' | 'hint'>('amendment');
const label = (id: string) => personas.find((p) => p.id === id)?.label ?? id;
function add() { if (!draft.value.trim()) return; blocks.value.push({ id: 'n' + blocks.value.length, by: me().id, text: draft.value.trim(), kind: kind.value }); draft.value = ''; }
const ledger = computed(() => {
  const m = new Map<string, { words: number; blocks: number; hints: number }>();
  for (const b of blocks.value) { const r = m.get(b.by) ?? { words: 0, blocks: 0, hints: 0 }; r.words += b.text.split(/\s+/).length; r.blocks++; if (b.kind === 'hint') r.hints++; m.set(b.by, r); }
  return [...m].map(([by, r]) => ({ by, ...r }));
});
</script>

<template>
  <RouterLink to="/work" class="small">← Work</RouterLink>
  <h1 style="margin-top:8px">{{ specDraft.title }} <Pretend /></h1>
  <p class="lede">{{ specDraft.note }} Deciding is choosing between positions. Spec writing is one document with many hands, and the record of who wrote what is what a spec author reward would be paid from.</p>
  <div class="grid" style="grid-template-columns: 1fr 300px">
    <div class="card">
      <div v-for="b in blocks" :key="b.id" class="block" :class="b.kind">
        <div class="btext">{{ b.text }}</div>
        <div class="small muted"><span class="label">{{ b.kind }}</span><br />{{ label(b.by) }}</div>
      </div>
      <div style="margin-top:14px">
        <textarea v-model="draft" rows="2" placeholder="Add a line, amend one, or drop a hint" />
        <div class="row" style="margin-top:6px">
          <select v-model="kind"><option value="text">text</option><option value="amendment">amendment</option><option value="hint">hint</option></select>
          <button class="btn" :disabled="!draft.trim()" @click="add">Add as {{ me().label.toLowerCase() }}</button>
        </div>
      </div>
    </div>
    <aside class="stack">
      <div class="card card-subtle">
        <span class="label">Who wrote what</span>
        <table class="t"><thead><tr><th>Role</th><th class="num">Words</th><th class="num">Hints</th></tr></thead>
          <tbody><tr v-for="r in ledger" :key="r.by"><td>{{ label(r.by) }}</td><td class="num">{{ r.words }}</td><td class="num">{{ r.hints }}</td></tr></tbody></table>
        <p class="small muted" style="margin-top:10px">Volume is not value. The one line hint from the operator may matter most. So the ledger is a starting point: contributors split the spec pool among themselves and the lead signs off.</p>
      </div>
      <div class="card"><span class="label">Spec pool</span><p class="small">Part pays when the task is funded. The rest pays when the thing is built and verified, which rewards specs that can be built.</p></div>
    </aside>
  </div>
</template>
