<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { q, repoFile, taskById } from '../data/quiver';
import { state, me } from '../data/pretend';
import { md } from '../lib/markdown';
import Pretend from '../components/Pretend.vue';

const html = md(q.devGuideMd);
const el = ref<HTMLDivElement>();
const active = ref<{ key: string; text: string } | null>(null);
const draft = ref('');
const t16 = taskById.get('T-16');
const gaps = () => state.pins.filter((p) => p.anchor.startsWith('guide:'));
onMounted(async () => {
  await nextTick();
  el.value!.querySelectorAll('p, li, td').forEach((n, i) => {
    n.classList.add('pinnable');
    n.addEventListener('click', () => { active.value = { key: 'guide:dev:' + i, text: (n.textContent ?? '').slice(0, 140) }; });
  });
});
function file() { if (!active.value || !draft.value.trim()) return; state.pins.push({ anchor: active.value.key, text: `“${active.value.text}” — ${draft.value.trim()}`, persona: me().label }); draft.value = ''; active.value = null; }
</script>

<template>
  <h1>Guides</h1>
  <p class="lede">Read the guide, click the sentence that is wrong or missing something, say so. <span v-if="t16">Task <RouterLink to="/work/T-16">{{ t16.id }}</RouterLink> pays someone to configure a unit from the guide alone and file every gap. Here, filing a gap is a side effect of reading.</span></p>
  <div class="grid" style="grid-template-columns: 240px 1fr 300px">
    <aside>
      <div v-for="g in q.guides" :key="g.path" style="margin-bottom:14px">
        <span class="label">{{ g.group }}</span><br /><a :href="repoFile(g.path)" target="_blank" rel="noopener">{{ g.title }} ↗</a><br /><span class="small muted">{{ g.lines }} lines</span>
      </div>
    </aside>
    <div class="card prose guide" ref="el" v-html="html" />
    <aside class="stack" style="position:sticky;top:12px;align-self:start">
      <div class="card" v-if="active"><span class="label">Comment on this sentence <Pretend /></span><p class="small muted">“{{ active.text }}…”</p>
        <textarea v-model="draft" rows="3" placeholder="What is missing or wrong?" /><button class="btn" style="margin-top:6px" :disabled="!draft.trim()" @click="file">File the gap</button></div>
      <div class="card card-subtle"><span class="label">Gaps filed</span>
        <div v-for="(p, i) in gaps()" :key="i" class="pin">{{ p.text }}<br /><span class="label">{{ p.persona }}</span></div>
        <p v-if="!gaps().length" class="small muted">None yet. Click any sentence in the guide.</p></div>
    </aside>
  </div>
</template>
