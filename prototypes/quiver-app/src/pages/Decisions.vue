<script setup lang="ts">
import { decisions, tally, state } from '../data/pretend';
import { parts, taskById, repoFile } from '../data/quiver';
import Pretend from '../components/Pretend.vue';

const t09 = taskById.get('T-09');
// Facts the BOM already states. The register would add the why. Nobody has written the why yet.
const candidates = ['3410', '3111', '3332', '3312', '3313', '1412'].map((id) => parts.find((p) => p.id === id)!).filter(Boolean);
const lead = (id: string) => { const d = decisions.find((x) => x.id === id)!; return [...tally(d)].sort((a, b) => b.share - a.share)[0]; };
</script>

<template>
  <h1>Decisions</h1>
  <p class="lede">The register for the aircraft: what was decided, what it replaced, why, the evidence, and what depends on it. Open decisions are threads with a weighted vote and a named decider.</p>

  <h2>Open</h2>
  <table class="t">
    <thead><tr><th>Decision</th><th>Kind</th><th>Source</th><th>Decider</th><th>Leading <Pretend /></th><th>You</th></tr></thead>
    <tbody>
      <tr v-for="d in decisions" :key="d.id">
        <td><RouterLink :to="`/decisions/${d.id}`"><strong>{{ d.title }}</strong></RouterLink><br /><span class="small muted">{{ d.question }}</span></td>
        <td><span class="chip" :class="d.kind === 'money' ? 'chip-bounty' : 'chip-project'">{{ d.kind }}</span></td>
        <td><a :href="d.source.url" target="_blank" rel="noopener">{{ d.source.label }} ↗</a></td>
        <td>{{ d.decider }}</td>
        <td>{{ lead(d.id).position.label }}<br /><span class="small muted">{{ Math.round(lead(d.id).share * 100) }}% of weight</span></td>
        <td>{{ state.votes[d.id] ? 'voted' : '—' }}</td>
      </tr>
    </tbody>
  </table>

  <div class="section">
    <h2>Standing</h2>
    <div class="empty">
      <strong>Nothing is written yet, and that is the honest state.</strong> Writing the register from PT1 to the 2026 design is
      <RouterLink v-if="t09" :to="`/work/${t09.id}`">task {{ t09.id }}</RouterLink>, which is open and claimable. Its rows are D-001 upward: decision, what it replaced, why, evidence, status.
      Below is what this screen could show the day it lands. The facts come from the BOM. The reasons are missing on purpose.
    </div>
    <table class="t" style="margin-top:14px">
      <thead><tr><th>ID</th><th>What was decided</th><th>Replaced</th><th>Why</th><th>Evidence</th><th>Anchored to</th></tr></thead>
      <tbody>
        <tr v-for="(p, i) in candidates" :key="p.id">
          <td class="mono muted">D-0{{ String(i + 1).padStart(2, '0') }}?</td>
          <td>{{ p.name }}</td>
          <td class="muted">not written</td>
          <td class="muted">not written</td>
          <td><a v-if="p.designRef" :href="repoFile(p.designRef)" target="_blank" rel="noopener">BOM row ↗</a><span v-else class="muted">BOM row</span></td>
          <td><RouterLink :to="`/aircraft/${p.id}`" class="mono">{{ p.id }}</RouterLink></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
