<script setup lang="ts">
import Icon from './Icon.vue';
import AccountBar from './AccountBar.vue';
// App-wide bar: identical whichever aircraft you're on.
</script>

<template>
  <header class="bar">
    <RouterLink to="/" class="logo" aria-label="Arrow home"><Icon name="arrow" :size="20" /></RouterLink>

    <span class="spacer"></span>

    <AccountBar />
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
  border-radius: var(--radius-sm);
  background: var(--brand);
  color: var(--brand-fg);
}
.spacer { flex: 1; }

@media (max-width: 767px) {
  .bar { padding-inline: var(--gutter); }
}
</style>
