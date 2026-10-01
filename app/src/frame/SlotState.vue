<script setup lang="ts">
// The frame's standard loading / empty / error states, so every module shares them.
defineProps<{ kind: 'loading' | 'empty' | 'error'; detail?: string }>();
</script>

<template>
  <div class="state" :class="kind" role="status">
    <template v-if="kind === 'loading'">Loading…</template>
    <template v-else-if="kind === 'empty'">Nothing here yet.</template>
    <template v-else>
      <strong>This section failed to load.</strong>
      <span class="muted">The rest of the app still works.</span>
      <code v-if="detail">{{ detail }}</code>
    </template>
  </div>
</template>

<style scoped>
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-4);
  border: 1px dashed var(--border);
  border-radius: var(--radius-lg);
  margin: var(--space-4);
  color: var(--fg-muted);
  text-align: center;
}
.state.error { border: 1px solid var(--danger-border); background: var(--danger-bg); color: var(--fg); }
code { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--danger); }
</style>
