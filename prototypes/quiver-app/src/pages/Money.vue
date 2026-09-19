<script setup lang="ts">
import { q, taskById, usd } from '../data/quiver';
import { decisions } from '../data/pretend';
const money = decisions.filter((d) => d.kind === 'money');
</script>

<template>
  <h1>Money</h1>
  <p class="lede">Where the funding goes. Today this lives in issue labels and the text of each task. Only what the repo states is shown. Paid amounts are not in the repo, so that column stays empty.</p>
  <table class="t">
    <thead><tr><th>Funding line</th><th class="num">Budget</th><th class="num">Priced on the board</th><th class="num">Not yet priced</th><th class="num">Paid</th><th>Tasks</th></tr></thead>
    <tbody>
      <tr v-for="f in q.fundingLines" :key="f.label">
        <td><strong>{{ f.name }}</strong><br /><span class="small muted mono">{{ f.label }}</span></td>
        <td class="num">{{ f.statedBudgetUsd != null ? usd(f.statedBudgetUsd) : '—' }}<br /><span v-if="f.statedBudgetSource" class="small muted">stated in {{ f.statedBudgetSource }}</span><span v-else class="small muted">not in the repo</span></td>
        <td class="num">{{ usd(f.pricedUsd) }}</td>
        <td class="num">{{ f.unpriced }} task{{ f.unpriced === 1 ? '' : 's' }}</td>
        <td class="num muted">—</td>
        <td><RouterLink v-for="id in f.tasks" :key="id" :to="`/work/${id}`" class="mono" style="margin-right:8px" :title="taskById.get(id)?.title">{{ id }}</RouterLink></td>
      </tr>
    </tbody>
  </table>

  <div class="section grid g2">
    <div class="card">
      <span class="label">Flight Test Campaign pool</span>
      <h2 class="mono" style="margin-top:4px">10,000 $ARROW</h2>
      <p class="small">Approved April 2026 and carried on the project multisig. Task T-17 says it has sat untouched for five months while 23 validated flights were logged, because the payment mechanics were never written.</p>
      <RouterLink to="/work/T-17" class="small">T-17, the mechanics →</RouterLink>
    </div>
    <div class="card card-subtle">
      <span class="label">Token weighted votes</span>
      <p class="small">Engineering questions weigh expertise. Questions about where money goes weigh the token. That is what makes it worth holding.</p>
      <RouterLink v-for="d in money" :key="d.id" :to="`/decisions/${d.id}`" class="mini"><span class="chip chip-bounty">money</span> {{ d.title }}</RouterLink>
    </div>
  </div>
</template>
