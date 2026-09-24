<script setup lang="ts">
// Grant drafts written from threads. Each carries its proposer award.
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import DiscussPin from '../components/DiscussPin.vue';
import { backend, handleOf, projectById, state, versionOf } from '../data/store';
import { percent } from '../lib/labels';
import type { Grant } from '../lib/types';

const grants = ref<Grant[]>([]);
const loading = ref(true);
const project = ref('');

watch(
  () => state.version,
  async () => {
    try {
      grants.value = await backend.listGrants();
    } catch (e) {
      state.error = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

const rows = computed(() => grants.value.filter((g) => !project.value || g.projectId === project.value));
</script>

<template>
  <div class="page-header spread">
    <div>
      <h1 style="border: 0; margin: 0; padding: 0">Grants <DiscussPin anchor="bounty" class="pin-inline" /></h1>
      <p class="muted" style="margin: 6px 0 0; max-width: 720px">
        Drafted from threads at the freeze. The discussion wrote the spec; the draft carries it, the constraints people named,
        and a proposer award for whoever wrote the idea. A human edits it before it is real. No tokens move here.
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
  <p v-else-if="rows.length === 0" class="muted">No grants yet. They appear when a lead turns a thread into a grant.</p>
  <ul v-else class="thread-list">
    <li v-for="g in rows" :key="g.id" class="thread-item">
      <RouterLink :to="{ name: 'grant', params: { id: g.id } }">
        <div class="row" style="gap: 6px">
          <span class="chip chip-project">{{ projectById.get(g.projectId)?.name ?? g.projectId }}</span>
          <span class="chip chip-version">{{ versionOf(g.projectId, g.versionId)?.name ?? '?' }}</span>
          <span class="chip" :class="g.status === 'draft' ? 'chip-warn' : 'chip-open'">{{ g.status }}</span>
          <span v-if="g.overrideRationale" class="chip chip-warn">lead overrode</span>
        </div>
        <div class="thread-title">{{ g.title }}</div>
        <div class="small muted">
          proposer award <b>{{ percent(g.proposerShare) }}</b> to {{ g.proposerIds.map((id) => '@' + handleOf(id)).join(', ') }}
          · {{ g.constraints.length }} constraints · promoted by @{{ handleOf(g.byMemberId) }} {{ g.createdAt.slice(0, 10) }}
        </div>
      </RouterLink>
    </li>
  </ul>
</template>
