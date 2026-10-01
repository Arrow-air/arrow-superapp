<script setup lang="ts">
import { computed, nextTick, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { bom, bomMeta, REPO } from '../data/quiver';
import { isOpen, state } from '../modules/threads/store';

// The Dev Kit bill of materials, straight from bom/*.yaml. The part number is
// the anchor other zones link to.
const route = useRoute();
const hit = computed(() => route.query.part as string | undefined);
const money = (n: number | null) => (n == null ? '—' : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
// Open threads per part, as in Gavin's parts index; the count opens them.
const openOn = (id: string) => state.threads.filter((t) => t.part === id && isOpen(t)).length;
const total = computed(() => bom.flatMap((g) => g.items).reduce((a, i) => a + (i.unitCostUsd ?? 0) * i.qty, 0));
onMounted(async () => {
  await nextTick();
  if (hit.value) document.querySelector(`[data-part="${hit.value}"]`)?.scrollIntoView({ block: 'center' });
});
</script>

<template>
  <div class="view">
    <div class="view-head">
      <div>
        <h1 class="view-title">Bill of materials</h1>
        <p class="view-lede">{{ bomMeta.bomTitle }}, {{ bomMeta.bomDate }}, from <a :href="`${REPO}/tree/main/bom`" target="_blank" rel="noopener">bom/</a> in the repository. {{ bom.reduce((a, g) => a + g.items.length, 0) }} line items, about {{ money(total) }} in listed parts before fasteners and consumables.</p>
      </div>
    </div>
    <section v-for="g in bom" :key="g.category" class="view-section">
      <h2>{{ g.category }} · {{ g.name }}</h2>
      <table class="vt">
        <thead><tr><th>Part</th><th>Name</th><th class="num">Qty</th><th class="hide-sm">Material or spec</th><th class="num">Unit</th><th class="hide-sm">Supplier</th><th class="num">Threads</th></tr></thead>
        <tbody>
          <tr v-for="i in g.items" :key="i.id" :data-part="i.id" :class="{ hit: i.id === hit }">
            <td class="mono muted">{{ i.id }}</td>
            <td>
              <a v-if="i.designRef" :href="`${REPO}/blob/main/${i.designRef}`" target="_blank" rel="noopener">{{ i.name }}</a>
              <span v-else>{{ i.name }}</span>
            </td>
            <td class="num">{{ i.qty }}</td>
            <td class="hide-sm muted">{{ i.material ?? i.spec ?? '—' }}</td>
            <td class="num">{{ money(i.unitCostUsd) }}</td>
            <td class="hide-sm muted">
              <template v-for="(s, n) in i.suppliers.slice(0, 2)" :key="n">
                <a v-if="s.url" :href="s.url" target="_blank" rel="noopener" class="link">{{ s.name }}</a><span v-else>{{ s.name }}</span><span v-if="n < Math.min(i.suppliers.length, 2) - 1">, </span>
              </template>
              <span v-if="!i.suppliers.length">{{ i.sourcing ?? '—' }}</span>
            </td>
            <td class="num">
              <RouterLink v-if="openOn(i.id)" class="open" :to="{ path: '/quiver/discussion/all', query: { part: i.id } }" :title="`${openOn(i.id)} open ${openOn(i.id) === 1 ? 'thread' : 'threads'} about this part`">{{ openOn(i.id) }}</RouterLink>
              <RouterLink v-else class="model" :to="{ path: '/quiver/overview/model', query: { part: i.id } }" title="Find it on the 3D model and start a thread">Discuss</RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.open {
  display: inline-block; min-width: 18px; padding: 1px 5px; border-radius: 5px; background: var(--amber-a3); color: var(--amber-11);
  font-family: var(--font-mono); font-size: var(--text-sm); text-align: center; text-decoration: none;
}
.open:hover { background: var(--amber-a4); }
.model { font-size: var(--text-sm); color: var(--fg-faint); text-decoration: none; opacity: 0; transition: opacity 120ms; }
tr:hover .model, .model:focus-visible { opacity: 1; }
.model:hover { color: var(--indigo-11); }
</style>
