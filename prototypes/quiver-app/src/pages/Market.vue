<script setup lang="ts">
import { computed } from 'vue';
import { q, parts, bomCostUsd, usd } from '../data/quiver';
import TaskRow from '../components/TaskRow.vue';

const groups = q.bom.map((g) => ({ name: g.name, category: g.category, cost: g.items.reduce((a, p) => a + (p.unitCostUsd ?? 0) * p.qty, 0), missing: g.items.filter((p) => p.unitCostUsd == null).length }));
const bySourcing = computed(() => { const m = new Map<string, { n: number; cost: number }>(); for (const p of parts) { const k = p.sourcing ?? 'unspecified'; const r = m.get(k) ?? { n: 0, cost: 0 }; r.n++; r.cost += (p.unitCostUsd ?? 0) * p.qty; m.set(k, r); } return [...m].sort((a, b) => b[1].cost - a[1].cost); });
const top = [...parts].sort((a, b) => (b.unitCostUsd ?? 0) * b.qty - (a.unitCostUsd ?? 0) * a.qty).slice(0, 8);
const tasks = q.tasks.filter((t) => t.state === 'OPEN' && (t.topics.includes('market') || /sales|reliability|handbook/i.test(t.title)));
</script>

<template>
  <h1>Bring it to market</h1>
  <p class="lede">What one unit costs to build, where that cost sits, who can make the parts, and the open work that stands between Quiver and a buyer. All of it rolled up from the BOM in the repo, so it moves when the BOM moves.</p>
  <div class="grid g4">
    <div class="stat"><span class="n">{{ usd(bomCostUsd) }}</span><span class="label">parts cost per unit, {{ q.sources.bomConfig }}</span></div>
    <div v-for="g in groups" :key="g.category" class="stat"><span class="n">{{ usd(g.cost) }}</span><span class="label">{{ g.name }}</span><span v-if="g.missing" class="small muted"><br />{{ g.missing }} parts without a cost</span></div>
  </div>
  <div class="section grid g2">
    <div><h2>Where the money goes</h2>
      <table class="t"><thead><tr><th>Part</th><th class="num">Qty</th><th class="num">Line cost</th></tr></thead><tbody>
        <tr v-for="p in top" :key="p.id"><td><RouterLink :to="`/aircraft/${p.id}`" class="mono">{{ p.id }}</RouterLink> {{ p.name }}</td><td class="num">{{ p.qty }}</td><td class="num">{{ usd((p.unitCostUsd ?? 0) * p.qty) }}</td></tr></tbody></table></div>
    <div><h2>How the parts get made</h2>
      <table class="t"><thead><tr><th>Sourcing</th><th class="num">Parts</th><th class="num">Cost</th></tr></thead><tbody>
        <tr v-for="[k, r] in bySourcing" :key="k"><td>{{ k }}</td><td class="num">{{ r.n }}</td><td class="num">{{ usd(r.cost) }}</td></tr></tbody></table>
      <p class="small muted" style="margin-top:8px">A regional builder can read off this table what they could make in their own shop and what they have to buy in.</p></div>
  </div>
  <div class="section"><h2>Open work toward a buyer</h2><div class="tlist"><TaskRow v-for="t in tasks" :key="t.id" :task="t" /></div></div>
</template>
