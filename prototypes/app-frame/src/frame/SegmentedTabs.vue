<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

// Segmented tabs with a sliding indicator, after coss ui Tabs (size lg).
// Items are router links, so each tab is a real, shareable URL.
const props = defineProps<{ items: { id: string; label: string; to: string }[]; active?: string; label: string }>();

const list = ref<HTMLElement>();
const indicator = ref({ left: 0, width: 0, visible: false });
// No slide on first paint; the indicator should appear in place, then animate.
const animate = ref(false);

function measure() {
  const el = list.value?.querySelector<HTMLElement>('[aria-current="page"]');
  indicator.value = el
    ? { left: el.offsetLeft, width: el.offsetWidth, visible: true }
    : { ...indicator.value, visible: false };
  el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

let ro: ResizeObserver | undefined;
onMounted(async () => {
  await nextTick();
  measure();
  requestAnimationFrame(() => (animate.value = true));
  ro = new ResizeObserver(measure);
  ro.observe(list.value!);
});
onBeforeUnmount(() => ro?.disconnect());
watch(() => props.active, () => nextTick(measure));
</script>

<template>
  <nav ref="list" class="tabs" :class="{ animate }" :aria-label="label">
    <RouterLink
      v-for="t in items"
      :key="t.id"
      :to="t.to"
      class="tab"
      :aria-current="t.id === active ? 'page' : undefined"
    >
      {{ t.label }}
    </RouterLink>
    <span
      v-show="indicator.visible"
      class="indicator"
      aria-hidden="true"
      :style="{ width: `${indicator.width}px`, translate: `${indicator.left}px 0` }"
    ></span>
  </nav>
</template>

<style scoped>
.tabs {
  position: relative;
  z-index: 0;
  display: flex;
  gap: 2px;
  width: fit-content;
  max-width: 100%;
  padding: 2px;
  border-radius: 10px;
  background: var(--tabs-track);
  overflow-x: auto;
  scrollbar-width: none;
}
.tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1 0 auto;
  height: 34px;
  padding-inline: 11px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--tabs-fg);
  font-size: var(--text-base);
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  outline: none;
  transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.tab:hover { color: var(--tabs-fg-hover); }
.tab[aria-current='page'] { color: var(--tabs-fg-active); }
.tab:focus-visible { box-shadow: 0 0 0 2px var(--focus-ring); }

.indicator {
  position: absolute;
  z-index: -1;
  top: 2px;
  bottom: 2px;
  left: 0;
  border-radius: 8px;
  background: var(--tabs-indicator);
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05);
}
.animate .indicator {
  transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1), translate 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
@media (prefers-reduced-motion: reduce) {
  .animate .indicator { transition: none; }
}
</style>
