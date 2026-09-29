<script setup lang="ts">
import { onMounted, ref } from 'vue';
import logomark from '../assets/arrow-logomark-white.svg';
import AccountBar from './AccountBar.vue';
import CommandPalette from './CommandPalette.vue';
import GlobalDrawer from './GlobalDrawer.vue';
import Kbd from './Kbd.vue';
import { MOD, useShortcut } from './shortcuts';

// App-wide bar: identical whichever aircraft you're on.
// The logo is a "secret passage": hovering cracks open the edge of the
// Arrow drawer, clicking (or ⌘\) opens it. ⌘K opens search.
const drawerOpen = ref(false);
const paletteOpen = ref(false);
const peek = ref(false);

useShortcut('k', () => (paletteOpen.value = !paletteOpen.value));
useShortcut('\\', () => (drawerOpen.value = !drawerOpen.value));

// First visit only: the passage cracks open once on its own, then it's yours to find.
const SEEN = 'arrow.passage-seen';
onMounted(() => {
  let seen = true;
  try { seen = !!localStorage.getItem(SEEN); localStorage.setItem(SEEN, '1'); } catch { /* storage unavailable */ }
  if (seen) return;
  setTimeout(() => (peek.value = true), 900);
  setTimeout(() => (peek.value = false), 2300);
});
</script>

<template>
  <header class="bar">
    <button
      class="logo"
      type="button"
      aria-label="Open Arrow menu"
      aria-haspopup="dialog"
      :aria-expanded="drawerOpen"
      :title="`Arrow menu (${MOD}\\)`"
      @mouseenter="peek = true"
      @mouseleave="peek = false"
      @focus="peek = true"
      @blur="peek = false"
      @click="peek = false; drawerOpen = true"
    >
      <img :src="logomark" alt="" width="22" height="24" />
    </button>

    <button class="search-bar" type="button" aria-haspopup="dialog" @click="paletteOpen = true">
      <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <span class="search-text">Search Arrow…</span>
      <Kbd :keys="[MOD, 'K']" />
    </button>

    <span class="spacer"></span>

    <AccountBar />

    <!-- The crack of light along the left edge when the passage is found. -->
    <span class="crack" :class="{ on: peek && !drawerOpen }" aria-hidden="true"></span>
    <GlobalDrawer v-model:open="drawerOpen" />
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
.logo {
  display: grid;
  place-items: center;
  width: var(--control-height);
  height: var(--control-height);
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: var(--brand-fill);
  box-shadow: var(--brand-shadow);
  cursor: pointer;
  transition: filter 150ms;
}
.logo:hover { filter: brightness(1.08); }
.logo:focus-visible { outline: none; box-shadow: var(--brand-shadow), 0 0 0 2px var(--focus-ring); }
.logo img {
  display: block;
  transform: translateY(0.6px); /* centroid sits ~2.6% above canvas centre */
  filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.35));
  transition: transform 200ms cubic-bezier(0.32, 0.72, 0, 1);
}
.logo:hover img, .logo:focus-visible img { transform: translateY(-0.6px); }

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
.search-text { flex: 1; }

/* The crack: a sliver of the drawer's edge, lit indigo. */
.crack {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 40;
  width: 5px;
  background: linear-gradient(180deg, var(--indigo-a4), var(--indigo-9) 30%, var(--indigo-10) 50%, var(--indigo-9) 70%, var(--indigo-a4));
  box-shadow: 0 0 18px 4px var(--indigo-a6), 0 0 60px 12px var(--indigo-a3);
  transform: translateX(-100%);
  opacity: 0;
  pointer-events: none;
  transition: transform 450ms cubic-bezier(0.32, 0.72, 0, 1), opacity 300ms ease;
}
.crack.on { transform: translateX(0); opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .crack { transition: opacity 150ms ease; }
}

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
