<script setup lang="ts">
import type { Status } from './store';
// Linear-style status glyphs: empty ring, half ring, filled check.
defineProps<{ status: Status; override?: boolean; size?: number }>();
</script>

<template>
  <svg
    class="st"
    :class="[status, { override }]"
    :width="size ?? 14"
    :height="size ?? 14"
    viewBox="0 0 16 16"
    aria-hidden="true"
  >
    <template v-if="status === 'needs'">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2.4 1.6" />
    </template>
    <template v-else-if="status === 'converging'">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6" />
      <path d="M8 4a4 4 0 0 1 0 8Z" fill="currentColor" />
    </template>
    <template v-else>
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <path d="m5 8.2 2 2 4-4.2" fill="none" stroke="var(--slate-1)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
    </template>
  </svg>
</template>

<style scoped>
.st { flex: none; }
.needs { color: var(--fg-muted); }
.converging { color: var(--indigo-11); }
.settled { color: var(--jade-9); }
.settled.override { color: var(--amber-9); }
</style>
