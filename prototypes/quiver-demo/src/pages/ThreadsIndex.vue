<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import ThreadRows from '../modules/threads/ThreadRows.vue';
import { areaOf, byActivity, state } from '../modules/threads/store';
import { tabs, zoneLabel } from '../frame/nav';

// Every thread in one list, the same rows as the zones, opening the same
// panel. Threads still live in their zones; this is the index over them.
const route = useRoute();
const area = computed(() => (String(route.params.item).startsWith('area-') ? String(route.params.item).slice(5) : undefined));
const areaLabel = computed(() => tabs.find((t) => t.id === area.value)?.label);

type Scope = 'open' | 'settled' | 'all';
const scope = ref<Scope>('open');
const query = ref('');

const visible = computed(() =>
  state.threads
    .filter((t) => (area.value ? areaOf(t) === area.value : true))
    .filter((t) => (scope.value === 'open' ? !t.settled : scope.value === 'settled' ? !!t.settled : true))
    .filter((t) => {
      const q = query.value.trim().toLowerCase();
      return !q || `${t.id} ${t.title} ${zoneLabel(t.zone)} ${t.body}`.toLowerCase().includes(q);
    })
    .sort(byActivity),
);
// All threads group by area; an area groups by zone.
const groups = computed(() => {
  const key = (t: (typeof visible.value)[number]) => (area.value ? t.zone : areaOf(t));
  const label = (k: string) => (area.value ? zoneLabel(k) : tabs.find((t) => t.id === k)?.label ?? k);
  const order = area.value ? [...new Set(visible.value.map(key))] : tabs.map((t) => t.id);
  return order.map((k) => ({ id: k, label: label(k), threads: visible.value.filter((t) => key(t) === k) })).filter((g) => g.threads.length);
});
</script>

<template>
  <div class="view">
    <div class="view-head">
      <div>
        <h1 class="view-title">{{ areaLabel ? `${areaLabel} threads` : 'All threads' }}</h1>
        <p class="view-lede">Every thread lives in a zone; this is the index across them. Open one to vote, add a position, or reply.</p>
      </div>
    </div>
    <div class="tools">
      <div class="find">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input v-model="query" placeholder="Find a thread" aria-label="Find a thread" />
      </div>
      <div class="vseg" role="radiogroup" aria-label="Scope">
        <button v-for="s in (['open', 'settled', 'all'] as Scope[])" :key="s" type="button" role="radio" :aria-checked="scope === s" @click="scope = s">
          {{ s === 'open' ? 'Open' : s === 'settled' ? 'Decided' : 'All' }}
        </button>
      </div>
    </div>
    <p v-if="!groups.length" class="vempty">Nothing here with this filter.</p>
    <section v-for="g in groups" :key="g.id" class="view-section">
      <h2>{{ g.label }}</h2>
      <div class="list"><ThreadRows :threads="g.threads" :show-zone="true" /></div>
    </section>
  </div>
</template>

<style scoped>
.view { max-width: 880px; }
.tools { display: flex; align-items: center; gap: 10px; }
.find { position: relative; flex: 1; max-width: 360px; }
.find svg { position: absolute; left: 9px; top: 50%; width: 12px; height: 12px; transform: translateY(-50%); fill: none; stroke: var(--fg-faint); stroke-width: 2; stroke-linecap: round; }
.find input {
  width: 100%; height: 30px; padding: 0 8px 0 27px; border: 0; border-radius: 8px;
  background: var(--slate-a2); color: var(--fg); font: inherit; font-size: var(--text-base); outline: none;
}
.find input:focus { background: var(--slate-a3); box-shadow: 0 0 0 1px var(--indigo-a7); }
.list { border: 1px solid var(--slate-a4); border-radius: 12px; overflow: hidden; }
.view-section { margin-top: 22px; }
</style>
