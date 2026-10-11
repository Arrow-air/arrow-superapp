<script setup lang="ts">
import type { GuideLine } from './types';

// One line of a guide step: the text, where it comes from, and a marker when
// it is common practice rather than the project's own spec.
defineProps<{ l: GuideLine }>();
</script>

<template>
  <span class="gl">
    <span v-if="l.practice" class="practice" title="Common practice, not the project's spec yet">Common practice</span>
    {{ l.text }}
    <a v-if="l.source" class="src" :href="l.source.url" target="_blank" rel="noopener">{{ l.source.label }}</a>
  </span>
</template>

<style scoped>
.practice {
  display: inline-block; margin-right: 6px; padding: 0 5px; border-radius: 4px; border: 1px dashed var(--slate-a7);
  color: var(--fg-muted); font-size: var(--text-sm); line-height: 16px; vertical-align: 1px; white-space: nowrap;
}
.src {
  display: inline-block; margin-left: 6px; padding: 0 5px; border-radius: 4px; background: var(--slate-a3);
  color: var(--fg-muted); font-size: var(--text-sm); line-height: 16px; text-decoration: none; white-space: nowrap; vertical-align: 1px;
}
.src:hover { background: var(--slate-a5); color: var(--fg); }
</style>
