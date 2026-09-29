<script setup lang="ts">
// Keyboard key hints, after coss ui Kbd: small borderless keys on a faint fill.
defineProps<{ keys: string[] }>();
</script>

<template>
  <span class="kbd-group" aria-hidden="true">
    <kbd v-for="k in keys" :key="k" class="kbd">{{ k }}</kbd>
  </span>
</template>

<style scoped>
.kbd-group { display: inline-flex; align-items: center; gap: 3px; }
.kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 4px;
  background: var(--slate-a3);
  color: var(--fg-muted);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1;
  user-select: none;
}
</style>
