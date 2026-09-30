<script setup lang="ts">
import { computed } from 'vue';
import ModelStage from './ModelStage.vue';
import ThreadsModule from '../threads/ThreadsModule.vue';
import { state } from '../threads/store';

// A Design subsystem page: the model at a fixed, usable height with this
// subsystem lit, then the page's threads, tall and in the page's own scroll.
const props = defineProps<{ subsystem: string; label: string; page: string }>();
const hasThreads = computed(() => state.threads.some((t) => t.page === props.page));
</script>

<template>
  <div class="subsystem">
    <!-- Two cards: the aircraft (viewer and parts) and the conversation. -->
    <ModelStage class="card" :subsystem="subsystem" :label="label" />
    <ThreadsModule v-if="hasThreads" class="card" :page="page" flow />
    <p v-else class="card empty">No threads on {{ label }} yet.</p>
  </div>
</template>

<style scoped>
.subsystem { display: grid; grid-template-rows: clamp(300px, 42vh, 440px) auto; gap: 12px; min-height: 100%; }
/* clip, not hidden: rounds the corners without becoming a scroll box, so the
   thread list can still stick while the page scrolls. */
.card { min-height: 0; border: 1px solid var(--border-soft); border-radius: var(--radius-lg); background: var(--slot-bg); overflow: clip; }
.empty { margin: 0; padding: 48px; text-align: center; font-size: var(--text-base); color: var(--fg-muted); }
</style>
