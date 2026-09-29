<script setup lang="ts">
import { sections } from './sections';
import WalletWidget from './WalletWidget.vue';
</script>

<template>
  <header class="bar">
    <div class="bar-inner">
      <RouterLink to="/" class="brand">Arrow</RouterLink>
      <nav class="tabs" aria-label="Sections">
        <RouterLink
          v-for="s in sections"
          :key="s.id"
          :to="s.path"
          class="tab"
          :class="{ active: $route.meta.section === s.id }"
        >
          {{ s.label }}
        </RouterLink>
      </nav>
      <WalletWidget />
    </div>
  </header>
</template>

<style scoped>
.bar {
  position: sticky;
  top: 0;
  z-index: 10;
  height: var(--bar-height);
  background: var(--bar-bg);
  color: var(--bar-fg);
  border-bottom: 1px solid var(--border);
}
.bar-inner {
  height: 100%;
  max-width: var(--frame-max);
  margin-inline: auto;
  padding-inline: var(--gutter);
  display: flex;
  align-items: center;
  gap: var(--space-6);
}
.brand {
  font-weight: 700;
  color: inherit;
  text-decoration: none;
}
.tabs {
  display: flex;
  gap: var(--space-1);
  flex: 1;
}
.tab {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-pill);
  color: var(--bar-fg-muted);
  text-decoration: none;
}
.tab:hover { color: var(--bar-fg); }
.tab.active {
  background: var(--accent);
  color: var(--accent-fg);
}
@media (max-width: 767px) {
  .tabs { display: none; }
  .brand { flex: 1; }
}
</style>
