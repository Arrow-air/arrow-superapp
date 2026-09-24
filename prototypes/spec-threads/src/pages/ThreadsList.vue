<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import ThreadRow from '../components/ThreadRow.vue';
import type { ThreadBundle } from '../data/backend';
import { backend, projectById, state } from '../data/store';
import { analyzeThread } from '../lib/analyze';

const bundles = ref<ThreadBundle[]>([]);
const loading = ref(true);
const project = ref('');
const status = ref<'open' | 'resolved' | ''>('open');

watch(
  () => state.version,
  async () => {
    try {
      bundles.value = await backend.listBundles();
    } catch (e) {
      state.error = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

const rows = computed(() =>
  bundles.value
    .filter((b) => (!project.value || b.thread.projectId === project.value) && (!status.value || b.thread.status === status.value))
    .map((b) => {
      const p = projectById.value.get(b.thread.projectId);
      return { bundle: b, analysis: p ? analyzeThread({ bundle: b, members: state.members, roles: state.roles, project: p }) : null };
    })
    .sort((a, b) => b.bundle.thread.createdAt.localeCompare(a.bundle.thread.createdAt)),
);
</script>

<template>
  <div class="page-header spread">
    <div>
      <h1 style="border: 0; margin: 0; padding: 0">Threads</h1>
      <p class="muted" style="margin: 6px 0 0">
        A thread is a question addressed to a version. Reply with a position. Votes are weighted. The lead resolves every thread at the freeze.
      </p>
    </div>
    <RouterLink v-if="state.me" to="/threads/new" class="btn">Post a thread</RouterLink>
  </div>

  <div class="row" style="margin: 18px 0 10px">
    <span class="label">Project</span>
    <select v-model="project" class="field" style="width: auto">
      <option value="">All</option>
      <option v-for="p in state.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
    </select>
    <span class="label" style="margin-left: 10px">Status</span>
    <select v-model="status" class="field" style="width: auto">
      <option value="open">Open</option>
      <option value="resolved">Resolved</option>
      <option value="">All</option>
    </select>
  </div>

  <p v-if="loading" class="muted">Loading…</p>
  <p v-else-if="rows.length === 0" class="muted">Nothing matches.</p>
  <ul v-else class="thread-list">
    <ThreadRow v-for="r in rows" :key="r.bundle.thread.id" :bundle="r.bundle" :analysis="r.analysis" show-project />
  </ul>
</template>
