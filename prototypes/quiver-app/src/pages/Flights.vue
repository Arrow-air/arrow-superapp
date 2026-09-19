<script setup lang="ts">
import { q, repoFile, taskById } from '../data/quiver';
const t14 = taskById.get('T-14'), t03 = taskById.get('T-03');
</script>

<template>
  <h1>Flights</h1>
  <p class="lede">Flight evidence sits in two places: test records in the repo, and the live log at flights.arrowair.com. This demo reads the repo only. It does not touch the live database.</p>
  <table class="t">
    <thead><tr><th>Flight</th><th>Date</th><th>Location</th><th>Aircraft</th><th>Conditions</th><th>Aim</th></tr></thead>
    <tbody><tr v-for="f in q.flights" :key="f.id">
      <td class="mono"><a :href="repoFile(f.path)" target="_blank" rel="noopener">{{ f.id }} ↗</a></td><td>{{ f.date }}</td><td>{{ f.location }}</td><td class="mono">{{ f.aircraft }}</td><td>{{ f.weather }}<span v-if="f.wind" class="muted">, {{ f.wind }}</span></td>
      <td class="small" style="white-space:pre-line">{{ f.aim }}</td></tr></tbody>
  </table>
  <div class="section grid g3">
    <a class="card door" href="https://flights.arrowair.com" target="_blank" rel="noopener"><span class="label">Live fleet log</span><h3>flights.arrowair.com ↗</h3><span class="small muted">Fleet, hours and incidents would be read from here, then linked to parts and decisions.</span></a>
    <RouterLink v-if="t14" to="/work/T-14" class="card door"><span class="label">{{ t14.id }}</span><h3>{{ t14.title }}</h3><span class="small muted">The reliability figures a buyer asks for.</span></RouterLink>
    <RouterLink v-if="t03" to="/work/T-03" class="card door"><span class="label">{{ t03.id }}</span><h3>{{ t03.title }}</h3><span class="small muted">Feeds the battery failsafe decision.</span></RouterLink>
  </div>
</template>
