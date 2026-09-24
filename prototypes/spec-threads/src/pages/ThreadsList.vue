<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import type { ThreadBundle } from '../data/backend';
import { backend, isDemo, memberById, projectById, state } from '../data/store';
import { analyzeThread } from '../lib/analyze';
import { timeAgo } from '../lib/format';

const bundles = ref<ThreadBundle[]>([]);
const loading = ref(true);
const filter = ref('');

// First-visit guide. Demo only. Remembered per browser; "Reset demo data" brings it back.
const GUIDE_KEY = 'arrow-spec-threads-guide-dismissed';
const readDismissed = () => {
  try { return localStorage.getItem(GUIDE_KEY) === '1'; } catch { return false; }
};
const guideOpen = ref(isDemo && !readDismissed());
watch(() => state.version, () => { if (isDemo && !readDismissed()) guideOpen.value = true; });
function dismissGuide() {
  guideOpen.value = false;
  try { localStorage.setItem(GUIDE_KEY, '1'); } catch { /* private mode: fine, it just shows again */ }
}

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
    .filter((b) => !filter.value || b.thread.projectId === filter.value)
    .map((b) => {
      const project = projectById.value.get(b.thread.projectId);
      const analysis = project
        ? analyzeThread({ bundle: b, members: state.members, roles: state.roles, project })
        : null;
      return { ...b, project, analysis };
    })
    .sort((a, b) => b.thread.createdAt.localeCompare(a.thread.createdAt)),
);
</script>

<template>
  <div class="page-header spread">
    <div>
      <h1 style="border: 0; margin: 0; padding: 0">Threads</h1>
      <p class="muted" style="margin: 6px 0 0">
        A thread is a decision Arrow has to make. Reply with a position. Votes are weighted. The project lead promotes one to a bounty.
      </p>
    </div>
    <RouterLink v-if="state.me" to="/threads/new" class="btn">Post a thread</RouterLink>
  </div>

  <section v-if="guideOpen" class="guide" aria-label="How to try this demo">
    <div class="spread" style="align-items: center">
      <strong>Three minutes to see the idea</strong>
      <button class="link-btn small" @click="dismissGuide">Hide this</button>
    </div>
    <ol class="guide-steps">
      <li>
        <b>Open the power-budget thread.</b>
        The crowd likes one position. The expert, the builder, and the lead like another. See both picks side by side.
        <RouterLink :to="{ name: 'thread', params: { id: 'n-power' } }">Open it →</RouterLink>
      </li>
      <li>
        <b>Become someone else and vote.</b>
        Use <em>Acting as</em> in the top bar. A newcomer's vote counts 1. The lead's counts over 5. Watch the positions re-rank.
      </li>
      <li>
        <b>Be the lead and promote a position.</b>
        Switch back to Lena. Pick the top position and it just goes. Pick another and you have to publish why.
      </li>
    </ol>
    <div class="small muted">
      Then look at <RouterLink to="/readout">Readout</RouterLink> to see what the experiment measures.
      See a <b>Discuss</b> pin? Click it to argue about that exact feature. Replies are GitHub Discussions, shown right here.
    </div>
  </section>

  <div class="row" style="margin: 18px 0 10px">
    <span class="label">Project</span>
    <select v-model="filter" class="field" style="width: auto">
      <option value="">All</option>
      <option v-for="p in state.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
    </select>
  </div>

  <p v-if="loading" class="muted">Loading…</p>
  <p v-else-if="rows.length === 0" class="muted">No threads yet. Post the first one.</p>

  <ul v-else class="thread-list">
    <li v-for="r in rows" :key="r.thread.id" class="thread-item">
      <RouterLink :to="{ name: 'thread', params: { id: r.thread.id } }">
        <div class="row">
          <span class="chip chip-project">{{ r.project?.name ?? r.thread.projectId }}</span>
          <span class="chip" :class="r.thread.status === 'open' ? 'chip-open' : 'chip-bounty'">
            {{ r.thread.status === 'open' ? 'open' : 'promoted to bounty' }}
          </span>
          <span v-if="r.analysis?.weightingChangedWinner && r.thread.status === 'open'" class="chip chip-warn">
            crowd and weighting disagree
          </span>
        </div>
        <div class="thread-title">{{ r.thread.title }}</div>
        <div class="row small muted">
          <span>{{ r.positions.length }} {{ r.positions.length === 1 ? 'position' : 'positions' }}</span>
          <span>·</span>
          <span>{{ r.analysis?.participants ?? 0 }} voters</span>
          <span>·</span>
          <span>by @{{ memberById.get(r.thread.authorId)?.handle ?? 'unknown' }}, {{ timeAgo(r.thread.createdAt) }}</span>
          <span v-for="t in r.thread.tags" :key="t" class="chip">{{ t }}</span>
        </div>
      </RouterLink>
    </li>
  </ul>
</template>
