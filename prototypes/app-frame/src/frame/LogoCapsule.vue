<script setup lang="ts">
import logomark from '../assets/arrow-logomark-white.svg';
import { MOD } from './shortcuts';

// The logo in a bordered capsule with an arrow that slides the Arrow drawer
// in and out. The drawer draws the same capsule at the same spot, so it
// reads as one control that stays put while the drawer moves under it.
defineProps<{ open: boolean; onBrand?: boolean }>();
defineEmits<{ toggle: [] }>();
</script>

<template>
  <div class="capsule" :class="{ 'on-brand': onBrand }">
    <RouterLink to="/" class="logo" aria-label="Arrow home">
      <img :src="logomark" alt="" width="18" height="20" />
    </RouterLink>
    <button
      class="arrow"
      type="button"
      :aria-label="open ? 'Close Arrow menu' : 'Open Arrow menu'"
      :aria-expanded="open"
      :title="`${open ? 'Close' : 'Open'} Arrow menu (${MOD}\\)`"
      @click="$emit('toggle')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" :class="{ flip: open }"><path d="m9 6 6 6-6 6" /></svg>
    </button>
  </div>
</template>

<style scoped>
.capsule {
  display: flex;
  align-items: center;
  gap: 2px;
  height: var(--control-height);
  padding: 3px;
  border: 1px solid var(--toolbar-border);
  border-radius: 12px;
  background: var(--toolbar-bg);
}
.logo {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--brand-fill);
  box-shadow: var(--brand-shadow);
}
.logo img {
  display: block;
  transform: translateY(0.5px); /* centroid sits ~2.6% above canvas centre */
  filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.35));
}
.arrow {
  display: grid;
  place-items: center;
  width: 22px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--fg-muted);
  cursor: pointer;
  transition: color 150ms, background-color 150ms;
}
.arrow:hover { background: var(--surface-hover); color: var(--fg); }
.arrow svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
}
.arrow svg.flip { transform: rotate(180deg); }
.logo:focus-visible, .arrow:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }

/* The same capsule drawn on the brand-blue drawer. */
.on-brand { border-color: var(--on-brand-line); background: var(--on-brand-fill); }
.on-brand .logo { background: rgb(255 255 255 / 0.14); box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.2); }
.on-brand .arrow { color: var(--on-brand-2); }
.on-brand .arrow:hover { background: var(--on-brand-hover); color: var(--on-brand); }
.on-brand .logo:focus-visible, .on-brand .arrow:focus-visible { box-shadow: 0 0 0 2px var(--on-brand); }
</style>
