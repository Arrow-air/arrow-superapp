<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import StatusIcon from './StatusIcon.vue';
import Icon from '../../frame/Icon.vue';
import { threadTypes, typeStyle } from './types';
import type { Thread } from './data';
import { ago, standing } from './store';
import { zoneLabel } from '../../frame/nav';
import { partById } from '../../data/quiver';
import { boardById } from '../../data/pcbs';

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
            <!-- What kind of thread, in its colour; named by its part when it is about one. -->
            <span class="tp" :style="typeStyle(t.type)" :title="threadTypes[t.type].label"><Icon :name="threadTypes[t.type].icon" :size="11" />
              <template v-if="t.pcb">{{ boardById(t.pcb.board)?.short }} {{ t.pcb.ref }}</template>
              <template v-else-if="t.part">{{ partById(t.part)?.name.split(',')[0] ?? t.part }}</template>
              <template v-else>{{ threadTypes[t.type].label }}</template>
            </span><span class="dot">·</span>
            <template v-if="showZone"><span class="zone">{{ zoneLabel(t.zone) }}</span><span class="dot">·</span></template>
            <span :class="{ decided: t.settled }">{{ standing(t).text }}</span>
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
.tp { display: inline-flex; align-items: center; gap: 5px; color: var(--fg-2); }
.tp :deep(svg) { flex: none; color: var(--tfg); }
.decided { color: var(--jade-11); }
.dot { margin: 0 6px; color: var(--fg-faint); }
.time { flex: none; margin-top: 2px; font-size: var(--text-sm); color: var(--fg-faint); }
</style>
