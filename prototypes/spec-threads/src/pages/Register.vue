<script setup lang="ts">
// The decision register: what is settled, per project and version. The newcomer's
// "what's decided?" view from ideas/decision-register.md. Threads promoted to spec land here.
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { backend, handleOf, projectById, state, versionOf } from '../data/store';
import type { Decision } from '../lib/types';

const decisions = ref<Decision[]>([]);
const loading = ref(true);
const project = ref('');

watch(
  () => state.version,
  async () => {
    try {
      decisions.value = await backend.listDecisions();
    } catch (e) {
      state.error = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

const groups = computed(() => {
  const rows = decisions.value.filter((d) => !project.value || d.projectId === project.value);
  const byProject = new Map<string, Decision[]>();
  for (const d of rows) byProject.set(d.projectId, [...(byProject.get(d.projectId) ?? []), d]);
  return [...byProject.entries()].map(([projectId, list]) => ({
    projectId,
    name: projectById.value.get(projectId)?.name ?? projectId,
    list: [...list].sort((a, b) => (versionOf(projectId, b.versionId)?.order ?? 0) - (versionOf(projectId, a.versionId)?.order ?? 0) || b.at.localeCompare(a.at)),
  }));
});
</script>

<template>
  <div class="page-header spread">
    <div>
      <h1 style="border: 0; margin: 0; padding: 0">Decision register</h1>
      <p class="muted" style="margin: 6px 0 0; max-width: 720px">
        What is settled. Each entry is a thread the lead promoted to a specification or requirement, with the position chosen,
        the tallies at the time, and the lead's rationale if the choice went against the weighted vote.
      </p>
    </div>
  </div>

  <div class="row" style="margin: 18px 0 10px">
    <span class="label">Project</span>
    <select v-model="project" class="field" style="width: auto">
      <option value="">All</option>
      <option v-for="p in state.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
    </select>
  </div>

  <p v-if="loading" class="muted">Loading…</p>
  <p v-else-if="groups.length === 0" class="muted">Nothing decided yet. Decisions are written here when a lead promotes a thread to spec.</p>
  <section v-for="g in groups" :key="g.projectId" style="margin-top: 18px">
    <h2 style="margin-bottom: 8px"><RouterLink :to="{ name: 'project', params: { id: g.projectId } }">{{ g.name }}</RouterLink></h2>
    <div class="table-scroll">
      <table class="data register">
        <thead>
          <tr><th>Version</th><th>Question</th><th>Decided</th><th>Signal</th><th>By</th><th>When</th></tr>
        </thead>
        <tbody>
          <tr v-for="d in g.list" :key="d.id">
            <td><span class="chip chip-version">{{ versionOf(d.projectId, d.versionId)?.name ?? '?' }}</span></td>
            <td><RouterLink :to="{ name: 'thread', params: { id: d.threadId } }">{{ d.question }}</RouterLink></td>
            <td>
              <b>{{ d.chosen }}</b>
              <div v-if="d.rationale" class="small muted" style="margin-top: 4px"><span class="label">lead's rationale</span> {{ d.rationale }}</div>
            </td>
            <td>
              <span v-if="d.weightedRankAtDecision === 1" class="chip chip-open">weighted top</span>
              <span v-else class="chip chip-warn">overrode (rank {{ d.weightedRankAtDecision }})</span>
            </td>
            <td class="mono small">@{{ handleOf(d.byMemberId) }}</td>
            <td class="mono small">{{ d.at.slice(0, 10) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
