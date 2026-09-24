<script setup lang="ts">
// One thread in a list. Shared by the all-threads page and the project page.
import { RouterLink } from 'vue-router';
import type { ThreadBundle } from '../data/backend';
import { handleOf, projectById, versionOf } from '../data/store';
import type { ThreadAnalysis } from '../lib/analyze';
import { timeAgo } from '../lib/format';
import { threadStatusChip, threadStatusLabel } from '../lib/labels';

defineProps<{ bundle: ThreadBundle; analysis: ThreadAnalysis | null; showProject?: boolean }>();
</script>

<template>
  <li class="thread-item">
    <RouterLink :to="{ name: 'thread', params: { id: bundle.thread.id } }">
      <div class="row">
        <span v-if="showProject" class="chip chip-project">{{ projectById.get(bundle.thread.projectId)?.name ?? bundle.thread.projectId }}</span>
        <span class="chip chip-version">{{ versionOf(bundle.thread.projectId, bundle.thread.versionId)?.name ?? '?' }}</span>
        <span v-if="bundle.thread.system" class="chip chip-system">{{ bundle.thread.system }}</span>
        <span class="chip" :class="threadStatusChip(bundle.thread)">{{ threadStatusLabel(bundle.thread) }}</span>
        <span v-if="bundle.thread.deferrals.length" class="chip chip-defer">deferred {{ bundle.thread.deferrals.length === 1 ? 'once' : bundle.thread.deferrals.length + '×' }}</span>
        <span v-if="analysis?.weightingChangedWinner && bundle.thread.status === 'open'" class="chip chip-warn">crowd and weighting disagree</span>
      </div>
      <div class="thread-title">{{ bundle.thread.title }}</div>
      <div class="row small muted">
        <span>{{ bundle.positions.length }} {{ bundle.positions.length === 1 ? 'position' : 'positions' }}</span>
        <span>·</span>
        <span>{{ analysis?.participants ?? 0 }} voters</span>
        <span>·</span>
        <span>by @{{ handleOf(bundle.thread.authorId) }}, {{ timeAgo(bundle.thread.createdAt) }}</span>
        <span v-for="t in bundle.thread.tags" :key="t" class="chip">{{ t }}</span>
      </div>
    </RouterLink>
  </li>
</template>
