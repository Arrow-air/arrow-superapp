<script setup lang="ts">
import { computed } from 'vue';
import ModelStage from './ModelStage.vue';
import ThreadsModule from '../threads/ThreadsModule.vue';
import { state } from '../threads/store';

// A Design subsystem page: the model with this subsystem lit, and the threads
// that live on the page underneath. Without threads the model takes the slot.
const props = defineProps<{ subsystem: string; label: string; page: string }>();
const hasThreads = computed(() => state.threads.some((t) => t.page === props.page));
</script>

<template>
  <div class="subsystem" :class="{ split: hasThreads }">
    <ModelStage :subsystem="subsystem" :label="label" />
    <ThreadsModule v-if="hasThreads" class="below" :page="page" />
  </div>
</template>

<style scoped>
.subsystem { display: grid; grid-template-rows: minmax(0, 1fr); height: 100%; min-height: 520px; }
.subsystem.split { grid-template-rows: minmax(340px, 55fr) minmax(300px, 45fr); min-height: 720px; }
.below { border-top: 1px solid var(--border-soft); min-height: 0; }
</style>
