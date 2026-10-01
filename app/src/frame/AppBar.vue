<script setup lang="ts">
import { ref } from 'vue';
import AccountBar from './AccountBar.vue';
import CommandPalette from './CommandPalette.vue';
import Kbd from './Kbd.vue';
import LogoCapsule from './LogoCapsule.vue';
import { MOD, useShortcut } from './shortcuts';
import { arrowPanelOpen, toggleArrowPanel } from './layout';

// App-wide bar: identical whichever aircraft you're on.
// The logo capsule's arrow (or ⌘\) slides the Arrow drawer in; ⌘K opens search.
const paletteOpen = ref(false);

useShortcut('k', () => (paletteOpen.value = !paletteOpen.value));
useShortcut('\\', toggleArrowPanel);
</script>

<template>
  <header class="bar">
    <LogoCapsule :open="arrowPanelOpen" @toggle="toggleArrowPanel" />

    <button class="search-bar" type="button" aria-haspopup="dialog" @click="paletteOpen = true">
      <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <span class="search-text">Search Arrow…</span>
      <Kbd :keys="[MOD, 'K']" />
    </button>

    <span class="spacer"></span>

    <AccountBar />

    <CommandPalette v-model:open="paletteOpen" />
  </header>
</template>

<style scoped>
.bar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: var(--bar-height);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-inline: var(--frame-inset);
  background: var(--bg);
}
/* Search: an input-looking button that opens the command palette. */
.search-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 280px;
  height: var(--control-height);
  margin-left: var(--space-1);
  padding: 0 5px 0 12px;
  border: 1px solid var(--toolbar-border);
  border-radius: 12px;
  background: var(--slate-a2);
  color: var(--fg-muted);
  font-size: var(--text-base);
  text-align: left;
  cursor: text;
  transition: border-color 150ms, background-color 150ms;
}
.search-bar:hover { border-color: var(--border); background: var(--slate-a3); }
.search-bar:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }
.search-icon { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; flex: none; }
.search-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.spacer { flex: 1; }

@media (max-width: 1023px) {
  .search-bar { width: auto; }
  .search-text, .search-bar :deep(.kbd-group) { display: none; }
  .search-bar { padding: 0 11px; }
}
@media (max-width: 767px) {
  .bar { padding-inline: var(--gutter); }
}
</style>
