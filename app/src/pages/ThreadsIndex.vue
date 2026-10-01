<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ThreadRows from '../modules/threads/ThreadRows.vue';
import { areaOf, byActivity, isOpen, state } from '../modules/threads/store';
import { tabs, zoneLabel } from '../frame/nav';
import { partById } from '../data/quiver';

// Every thread in one list, the same rows as the zones, opening the same
// panel. Threads still live in their zones; this is the index over them.
const route = useRoute();
const router = useRouter();
const area = computed(() => (String(route.params.item).startsWith('area-') ? String(route.params.item).slice(5) : undefined));
const areaLabel = computed(() => tabs.find((t) => t.id === area.value)?.label);

type Scope = 'open' | 'settled' | 'all';
const scope = ref<Scope>('open');
const query = ref('');

// A part picked elsewhere (?part=3410) narrows the list to threads about it,
// with a chip to clear it (Gavin's app-frame).
const part = computed(() => (route.query.part as string | undefined) || undefined);
function clearPart() {
  const { part: _drop, ...rest } = route.query;
  router.replace({ query: rest });
}
const matching = computed(() =>
  state.threads
    .filter((t) => (area.value ? areaOf(t) === area.value : true))
    .filter((t) => !part.value || t.part === part.value)
    .filter((t) => {
      const q = query.value.trim().toLowerCase();
      return !q || `${t.id} ${t.title} ${zoneLabel(t.zone)} ${t.body}`.toLowerCase().includes(q);
    })
    .sort(byActivity),
);
const visible = computed(() => matching.value.filter((t) => (scope.value === 'open' ? isOpen(t) : scope.value === 'settled' ? !isOpen(t) : true)));
/** Threads the scope switch is hiding, so an empty list can say so instead of looking empty. */
const hidden = computed(() => matching.value.length - visible.value.length);
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
        <p class="view-lede">Every thread lives in a zone; this is the index across them. Open one to comment, reply, or vote.</p>
      </div>
    </div>
    <div class="tools">
      <div class="find">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input v-model="query" placeholder="Find a thread" aria-label="Find a thread" />
      </div>
      <div class="vseg" role="radiogroup" aria-label="Scope">
        <button v-for="s in (['open', 'settled', 'all'] as Scope[])" :key="s" type="button" role="radio" :aria-checked="scope === s" @click="scope = s">
          {{ s === 'open' ? 'Open' : s === 'settled' ? 'Closed' : 'All' }}
        </button>
      </div>
    </div>
    <div v-if="part" class="filter">
      <button type="button" class="chip" title="Show every thread" @click="clearPart">
        About {{ partById(part)?.name.split(',')[0] ?? part }}
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 4.5 7 7m0-7-7 7" /></svg>
      </button>
    </div>
    <p v-if="!groups.length && hidden" class="vempty">
      {{ hidden }} {{ scope === 'open' ? 'closed' : 'open' }} {{ hidden === 1 ? 'thread' : 'threads' }} hidden.
      <button type="button" class="show-all" @click="scope = 'all'">Show all</button>
    </p>
    <p v-else-if="!groups.length" class="vempty">Nothing here with this filter.</p>
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
.filter { margin-top: 12px; }
.chip {
  display: inline-flex; align-items: center; gap: 6px; max-width: 100%; height: 24px; padding: 0 6px 0 9px;
  border: 0; border-radius: 6px; background: var(--indigo-a3); color: var(--indigo-11);
  font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer; transition: background-color 120ms;
}
.chip:hover { background: var(--indigo-a4); }
.chip svg { flex: none; width: 11px; height: 11px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.show-all { padding: 0; border: 0; background: none; color: var(--indigo-11); font: inherit; cursor: pointer; }
.show-all:hover { text-decoration: underline; }
</style>
