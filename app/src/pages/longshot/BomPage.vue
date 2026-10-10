<script setup lang="ts">
import { computed, nextTick, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { LS_REPO, lsBom, lsBomPath, lsCommit, lsGeneratedAt } from '../../projects/longshot/github';
import { lsPartName, lsZoneForPart } from '../../projects/longshot/parts';
import { pt1Costs } from '../../projects/longshot/costs';
import { shortDate } from '../../data/quiver';
import { isOpen, state } from '../../modules/threads/store';
import { zoneLabel, zonePath } from '../../frame/nav';

// Longshot's bill of materials, straight from the build123d model's BOM.csv,
// and what PT1 is known to have cost. The part number is the anchor the 3D
// model and threads use.
const route = useRoute();
const hit = computed(() => route.query.part as string | undefined);
const order = [
  { id: 'cell', label: 'Cells' },
  { id: 'busbar', label: 'Busbars' },
  { id: 'custom mechanical', label: 'Holders, enclosure and strap' },
  { id: 'PCB', label: 'Boards' },
  { id: 'COTS', label: 'Bought-in parts' },
];
const groups = computed(() => [
  ...order.map((o) => ({ ...o, items: lsBom.filter((b) => b.category === o.id) })),
  { id: 'other', label: 'Other', items: lsBom.filter((b) => !order.some((o) => o.id === b.category)) },
].filter((g) => g.items.length));
const openOn = (id: string) => state.threads.filter((t) => t.part === id && isOpen(t)).length;
const step = (b: (typeof lsBom)[number]) => b.exports?.split(';').map((x) => x.trim()).find((x) => x.endsWith('.step'));
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
        <p class="view-lede">
          The PT1 main assembly, from <a :href="`${LS_REPO}/blob/main/${lsBomPath}`" target="_blank" rel="noopener">BOM.csv</a> in the build123d model
          (<span class="mono">{{ lsCommit }}</span>, {{ shortDate(lsGeneratedAt) }}): {{ lsBom.length }} lines, {{ lsBom.reduce((a, b) => a + b.qty, 0) }} pieces.
          Screws and wiring are not in the model.
        </p>
      </div>
    </div>

    <section class="view-section">
      <h2>What PT1 cost</h2>
      <table class="vt cost">
        <tbody>
          <tr v-for="c in pt1Costs.lines" :key="c.item">
            <td>{{ c.item }}<div v-if="c.note" class="muted small">{{ c.note }}</div></td>
            <td class="num">{{ c.amount }}</td>
          </tr>
        </tbody>
      </table>
      <p class="muted small">{{ pt1Costs.caveat }} <a :href="pt1Costs.source.url" target="_blank" rel="noopener" class="link">{{ pt1Costs.source.label }}</a></p>
    </section>

    <section v-for="g in groups" :key="g.id" class="view-section">
      <h2>{{ g.label }}</h2>
      <table class="vt">
        <thead><tr><th>Part</th><th>Name</th><th class="num">Qty</th><th class="hide-sm">Make or buy</th><th class="hide-sm">Material</th><th class="hide-sm">Zone</th><th class="num">Threads</th></tr></thead>
        <tbody>
          <tr v-for="b in g.items" :key="b.id" :data-part="b.id" :class="{ hit: b.id === hit }">
            <td class="mono muted pn">{{ b.id }}</td>
            <td>
              <a v-if="step(b)" :href="`${LS_REPO}/blob/main/engineering/cad/build123d/${step(b)}`" target="_blank" rel="noopener" :title="b.description">{{ lsPartName(b.id) }}</a>
              <span v-else :title="b.description">{{ lsPartName(b.id) }}</span>
            </td>
            <td class="num">{{ b.qty }}</td>
            <td class="hide-sm muted">{{ b.makeBuy }}</td>
            <td class="hide-sm muted">{{ b.material ?? '—' }}</td>
            <td class="hide-sm"><RouterLink :to="zonePath(lsZoneForPart(b.id))" class="link">{{ zoneLabel(lsZoneForPart(b.id)) }}</RouterLink></td>
            <td class="num">
              <RouterLink v-if="openOn(b.id)" class="open" :to="{ path: '/longshot/discussion/all', query: { part: b.id } }" :title="`${openOn(b.id)} open ${openOn(b.id) === 1 ? 'thread' : 'threads'} about this part`">{{ openOn(b.id) }}</RouterLink>
              <RouterLink v-else class="model" :to="{ path: '/longshot/overview/model', query: { part: b.id } }" title="Find it on the 3D model and start a thread">Discuss</RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.pn { max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-sm); }
.small { font-size: var(--text-sm); }
.cost td.num { font-family: var(--font-mono); }
.open { display: inline-block; min-width: 18px; padding: 1px 5px; border-radius: 5px; background: var(--amber-a3); color: var(--amber-11) !important; text-align: center; }
.model { color: var(--fg-faint) !important; font-family: var(--font-sans); font-size: var(--text-sm); }
.model:hover { color: var(--fg-2) !important; }
</style>
