<script setup lang="ts">
// Keyboard key hints, after coss ui Kbd: small borderless keys on a faint fill.
// `outline` gives the bordered variant.
defineProps<{ keys: string[]; outline?: boolean }>();
</script>

<template>
  <span class="kbd-group" aria-hidden="true">
    <kbd v-for="k in keys" :key="k" class="kbd" :class="{ outline }">{{ k }}</kbd>
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
/* Outlined key: a hairline ring, mono text, no fill (spell.sh command footer). */
.kbd.outline {
  min-width: 16px;
  height: 16px;
  background: none;
  box-shadow: 0 0 0 1px var(--slate-a5);
  font-family: var(--font-mono);
  font-weight: 400;
}
</style>
