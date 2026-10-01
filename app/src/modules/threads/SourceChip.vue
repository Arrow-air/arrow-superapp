<script setup lang="ts">
import type { SourceRef } from './data';
// Where a thread or comment came from. Call notes open in the app;
// issues and pull requests open on GitHub.
defineProps<{ source: SourceRef }>();
</script>

<template>
  <RouterLink v-if="source.kind === 'call'" class="src" :to="{ path: '/quiver/overview/calls', query: { item: source.ref } }" title="Open the call notes">
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4h10M3 8h10M3 12h6" /></svg>{{ source.label }}
  </RouterLink>
  <a v-else class="src" :href="source.url" target="_blank" rel="noopener" :title="`Open ${source.label} on GitHub`">
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3H3v10h10v-3M9 3h4v4M13 3 7 9" /></svg>{{ source.label }}
  </a>
</template>

<style scoped>
.src {
  display: inline-flex; align-items: center; gap: 4px; height: 18px; padding: 0 6px; border-radius: 5px;
  background: var(--slate-a2); color: var(--fg-muted); font-size: var(--text-sm); text-decoration: none; white-space: nowrap;
}
.src:hover { background: var(--slate-a4); color: var(--fg); }
.src svg { width: 11px; height: 11px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
</style>
