<script setup lang="ts">
import logomark from '../assets/arrow-logomark-white.svg';
import AccountBar from './AccountBar.vue';
// App-wide bar: identical whichever aircraft you're on.
</script>

<template>
  <header class="bar">
    <RouterLink to="/" class="logo" aria-label="Arrow home"><img :src="logomark" alt="" width="22" height="24" /></RouterLink>

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
  border-radius: 9px;
  background: var(--brand-fill);
  box-shadow: var(--brand-shadow);
  transition: filter 150ms;
}
.logo:hover { filter: brightness(1.08); }
.logo:focus-visible { outline: none; box-shadow: var(--brand-shadow), 0 0 0 2px var(--focus-ring); }
.logo img {
  display: block;
  transform: translateY(0.6px); /* centroid sits ~2.6% above canvas centre */
  filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.35));
}
.spacer { flex: 1; }

@media (max-width: 767px) {
  .bar { padding-inline: var(--gutter); }
}
</style>
