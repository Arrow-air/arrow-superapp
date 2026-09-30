<script setup lang="ts">
import { computed } from 'vue';
import ModelStage from './ModelStage.vue';
import ThreadsModule from '../threads/ThreadsModule.vue';
import { state } from '../threads/store';

// A Design subsystem page: the model at a fixed, usable height with this
// subsystem lit, and the page's threads filling the rest of the slot.
const props = defineProps<{ subsystem: string; label: string; page: string }>();
const hasThreads = computed(() => state.threads.some((t) => t.page === props.page));
</script>

<template>
  <div class="subsystem">
    <ModelStage :subsystem="subsystem" :label="label" />
    <ThreadsModule v-if="hasThreads" class="below" :page="page" />
    <p v-else class="below empty">No threads on {{ label }} yet.</p>
  </div>
</template>

<style scoped>
.subsystem { display: grid; grid-template-rows: clamp(300px, 42vh, 440px) minmax(360px, 1fr); height: 100%; }
.below { border-top: 1px solid var(--border-soft); min-height: 0; }
.empty { margin: 0; padding: 48px; text-align: center; font-size: var(--text-base); color: var(--fg-muted); }
</style>
