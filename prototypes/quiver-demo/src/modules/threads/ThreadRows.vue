<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import StatusIcon from './StatusIcon.vue';
import type { Thread } from './data';
import { ago, standing } from './store';
import { zoneLabel } from '../../frame/nav';

// Threads as full-width rows: status, title, where it stands, activity.
// Clicking a row opens the thread panel over the current page (?thread=),
// the same panel everywhere, so you never leave where you are.
defineProps<{ threads: Thread[]; showZone?: boolean }>();
const route = useRoute();
const router = useRouter();
const open = (id: string) => router.replace({ query: { ...route.query, thread: id } });
</script>

<template>
  <ul class="rows">
    <li v-for="t in threads" :key="t.id">
      <button
        type="button"
        class="row"
        :data-thread="t.id"
        :aria-current="route.query.thread === t.id ? 'true' : undefined"
        @click="open(t.id)"
      >
        <StatusIcon :status="standing(t).status" :override="t.settled?.override" :size="14" />
        <span class="main">
          <span class="title">{{ t.title }}</span>
          <span class="meta">
            <span v-if="showZone" class="zone">{{ zoneLabel(t.zone) }}</span>
            <span v-if="showZone" class="dot">·</span>
            <span :class="{ decided: t.settled }">{{ standing(t).text }}</span>
            <template v-if="t.replies.length"><span class="dot">·</span>{{ t.replies.length }} {{ t.replies.length === 1 ? 'reply' : 'replies' }}</template>
          </span>
        </span>
        <span class="time">{{ ago(t.activeAt) }}</span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
.rows { margin: 0; padding: 0; list-style: none; }
.rows li + li .row { border-top-color: var(--slate-a3); }
.row {
  display: flex; align-items: flex-start; gap: 12px; width: 100%; padding: 11px 12px;
  border: 0; border-top: 1px solid transparent; border-radius: 0; background: none;
  text-align: left; color: inherit; font: inherit; cursor: pointer; transition: background-color 120ms;
}
.row:hover { background: var(--slate-a2); }
.row[aria-current='true'] { background: var(--slate-a3); }
.row:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--focus-ring); }
.row :deep(.st) { margin-top: 3px; flex: none; }
.main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.title { color: var(--fg); font-size: var(--text-nav); font-weight: 500; line-height: 1.4; }
.meta { font-size: var(--text-sm); color: var(--fg-muted); }
.zone { color: var(--fg-2); }
.decided { color: var(--jade-11); }
.dot { margin: 0 6px; color: var(--fg-faint); }
.time { flex: none; margin-top: 2px; font-size: var(--text-sm); color: var(--fg-faint); }
</style>
