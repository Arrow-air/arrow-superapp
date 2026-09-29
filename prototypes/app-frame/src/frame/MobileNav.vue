<script setup lang="ts">
import { sections } from './sections';
</script>

<template>
  <nav class="mnav" aria-label="Sections">
    <RouterLink
      v-for="s in sections"
      :key="s.id"
      :to="s.path"
      class="mtab"
      :class="{ active: $route.meta.section === s.id }"
    >
      {{ s.label }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.mnav {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 10;
  height: var(--mobile-nav-height);
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--bar-bg);
  border-top: 1px solid var(--border);
  justify-content: space-around;
  align-items: center;
}
.mtab {
  font-size: var(--text-sm);
  color: var(--bar-fg-muted);
  text-decoration: none;
  padding: var(--space-2);
}
.mtab.active { color: var(--accent); font-weight: 600; }
</style>
