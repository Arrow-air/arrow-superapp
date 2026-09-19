<script setup lang="ts">
import { computed } from 'vue';
import { taskById, partById, q, ownerName } from '../data/quiver';
import { decisions, state } from '../data/pretend';
import { md } from '../lib/markdown';
import Pretend from '../components/Pretend.vue';

const props = defineProps<{ id: string }>();
const t = computed(() => taskById.get(props.id));
const line = computed(() => q.fundingLines.find((f) => f.label === t.value?.fundingLabel));
const related = computed(() => decisions.filter((d) => d.tasks.includes(props.id)));
const body = computed(() => md((t.value?.body ?? '').replace(/^\*\*Task board row[\s\S]*?\n\n\|[\s\S]*?\|\s*\n\n/, '')));
const claimed = computed(() => state.claims.includes(props.id));
</script>

<template>
  <template v-if="t">
    <RouterLink to="/work" class="small">← Work</RouterLink>
    <div class="row" style="margin-top:8px"><span class="mono muted">{{ t.id }}</span><span v-if="t.claimable && t.state === 'OPEN'" class="chip chip-open">claimable</span><span v-if="t.state === 'CLOSED'" class="chip">closed</span>
      <a class="chip chip-real" :href="t.url" target="_blank" rel="noopener">issue #{{ t.number }} ↗</a></div>
    <h1 style="margin-top:6px">{{ t.title }}</h1>
    <div class="grid" style="grid-template-columns: 1fr 320px; margin-top:16px">
      <div class="prose card" v-html="body" />
      <aside class="stack">
        <div class="card card-subtle">
          <dl class="kv" style="grid-template-columns:84px 1fr;margin:0">
            <dt>Price</dt><dd>{{ t.priceText }}</dd>
            <dt>Funding</dt><dd><RouterLink to="/money">{{ line?.name ?? t.fundingText }}</RouterLink></dd>
            <dt>Owner</dt><dd>{{ ownerName(t) ?? 'Open' }}</dd>
            <dt>Deadline</dt><dd>{{ t.deadline }}</dd>
            <dt>Done when</dt><dd>{{ t.doneWhen }}</dd>
          </dl>
        </div>
        <div v-if="t.claimable && t.state === 'OPEN'" class="card">
          <span class="label">Claim it <Pretend why="On the real board you claim by posting the sample in the GitHub issue." /></span>
          <p class="small muted">{{ t.whoShouldClaim ?? 'Assignment follows an accepted sample, never precedes it.' }}</p>
          <button class="btn" :disabled="claimed" @click="state.claims.push(t.id)">{{ claimed ? 'Sample posted' : 'Post the unpaid sample' }}</button>
        </div>
        <div v-if="related.length || t.parts.length" class="card">
          <span class="label">Touches</span>
          <RouterLink v-for="d in related" :key="d.id" :to="`/decisions/${d.id}`" class="mini"><span class="chip chip-warn">decision</span> {{ d.title }}</RouterLink>
          <RouterLink v-for="p in t.parts" :key="p" :to="`/aircraft/${p}`" class="mini"><span class="mono muted">{{ p }}</span> {{ partById.get(p)?.name }}</RouterLink>
        </div>
      </aside>
    </div>
  </template>
  <p v-else class="empty">No such task.</p>
</template>
